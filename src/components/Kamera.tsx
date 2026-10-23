// Geführte Kamera: Umriss der Kategorie als Schablone, Live-Check für Licht, Schärfe und Untergrund.
// So werden Fotos ohne Fotografie-Kenntnisse gleichmäßig – die Grundlage für Shop-Optik.
import { AnimatePresence, m } from "framer-motion";
import { Flashlight, ImagePlus, Lightbulb, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { bewerte, type Bewertung, type Stufe } from "../lib/kameraCheck";
import { CATEGORIES, type Item } from "../lib/model";
import { haptik, pauseSmoothScroll } from "./Motion";

const UMRISS: Record<Item["category"], string> = {
  oberteile: "M30 14 L42 9 Q50 18 58 9 L70 14 L93 32 L83 47 L73 40 L73 121 L27 121 L27 40 L17 47 L7 32 Z",
  jacken: "M30 11 L42 6 Q50 15 58 6 L70 11 L89 27 L96 93 L84 95 L74 46 L74 123 L26 123 L26 46 L16 95 L4 93 L11 27 Z M50 15 L50 123",
  unterteile: "M27 8 L73 8 L80 122 L58 122 L50 42 L42 122 L20 122 Z M27 16 L73 16",
  kleider: "M38 8 L62 8 L66 32 L85 122 L15 122 L34 32 Z",
  schuhe: "M8 84 Q9 63 28 61 L46 58 Q55 41 70 45 L80 62 Q93 68 93 82 L93 94 L8 94 Z",
  accessoires: "M22 34 h56 a12 12 0 0 1 12 12 v42 a12 12 0 0 1 -12 12 h-56 a12 12 0 0 1 -12 -12 v-42 a12 12 0 0 1 12 -12 Z",
};

const TIPPS = [
  "Flach hinlegen oder auf einen Bügel an eine helle, freie Wand hängen.",
  "Glatt streichen, Ärmel und Beine symmetrisch legen.",
  "Tageslicht vom Fenster, ohne Blitz und ohne direkte Sonne.",
  "Gerade von oben bzw. frontal fotografieren, das Teil füllt den Umriss.",
  "Untergrund mit Kontrast wählen: helles Teil auf dunklem Boden und umgekehrt.",
];

const LABEL: Record<Stufe, string> = { gut: "gut", ok: "geht", schlecht: "schwach" };

export function Kamera({
  kategorie,
  offen,
  onKategorie,
  onFoto,
  onGalerie,
  onNichtVerfuegbar,
  onClose,
}: {
  kategorie: Item["category"];
  offen: boolean;
  onKategorie: (k: Item["category"]) => void;
  onFoto: (b: Blob) => void;
  onGalerie: () => void;
  /** keine Kamera/keine Erlaubnis – auf die System-Kamera ausweichen */
  onNichtVerfuegbar: () => void;
  onClose: () => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const strom = useRef<MediaStream | null>(null);
  const [bereit, setBereit] = useState(false);
  const [check, setCheck] = useState<Bewertung | null>(null);
  const [licht, setLicht] = useState<boolean | null>(null); // null = Taschenlampe nicht verfügbar
  const [tipps, setTipps] = useState(false);
  const [blitz, setBlitz] = useState(0);

  useEffect(() => {
    if (!offen) return;
    let aus = false;
    pauseSmoothScroll(true);
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("keine Kamera");
        const s = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" }, width: { ideal: 2560 }, height: { ideal: 1920 } },
        });
        if (aus) return s.getTracks().forEach((t) => t.stop());
        strom.current = s;
        const v = video.current!;
        v.srcObject = s;
        await v.play();
        setBereit(true);
        const track = s.getVideoTracks()[0];
        const caps = (track.getCapabilities?.() ?? {}) as { torch?: boolean };
        setLicht(caps.torch ? false : null);
      } catch {
        if (!aus) onNichtVerfuegbar();
      }
    })();
    return () => {
      aus = true;
      strom.current?.getTracks().forEach((t) => t.stop());
      strom.current = null;
      setBereit(false);
      setCheck(null);
      if (!document.documentElement.classList.contains("has-overlay")) pauseSmoothScroll(false);
    };
  }, [offen, onNichtVerfuegbar]);

  // Live-Check auf einem kleinen Bild, ca. 3× pro Sekunde
  useEffect(() => {
    if (!bereit) return;
    const c = document.createElement("canvas");
    const ctx = c.getContext("2d", { willReadFrequently: true })!;
    const id = window.setInterval(() => {
      const v = video.current;
      if (!v || !v.videoWidth) return;
      c.width = 160;
      c.height = Math.round((160 * v.videoHeight) / v.videoWidth);
      ctx.drawImage(v, 0, 0, c.width, c.height);
      setCheck(bewerte(ctx.getImageData(0, 0, c.width, c.height)));
    }, 330);
    return () => window.clearInterval(id);
  }, [bereit]);

  useEffect(() => {
    if (!offen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [offen, onClose]);

  async function taschenlampe() {
    const track = strom.current?.getVideoTracks()[0];
    if (!track || licht === null) return;
    try {
      await track.applyConstraints({ advanced: [{ torch: !licht } as MediaTrackConstraintSet] });
      setLicht(!licht);
    } catch {
      setLicht(null);
    }
  }

  function ausloesen() {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext("2d")!.drawImage(v, 0, 0);
    haptik([8, 30, 8]);
    setBlitz((n) => n + 1);
    c.toBlob((b) => b && onFoto(b), "image/jpeg", 0.92);
  }

  const alleGut = check && check.licht !== "schlecht" && check.schaerfe !== "schlecht" && check.untergrund !== "schlecht";

  return createPortal(
    <AnimatePresence>
      {offen && (
        <m.div className="kamera" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
          <video ref={video} className="kamera-video" playsInline muted />
          <svg className={`kamera-umriss ${alleGut ? "is-gut" : ""}`} viewBox="0 0 100 130" preserveAspectRatio="xMidYMid meet" aria-hidden>
            <path d={UMRISS[kategorie]} vectorEffect="non-scaling-stroke" />
          </svg>
          <AnimatePresence>
            {blitz > 0 && (
              <m.div key={blitz} className="kamera-blitz" initial={{ opacity: 0.85 }} animate={{ opacity: 0 }} transition={{ duration: 0.45 }} />
            )}
          </AnimatePresence>

          <div className="kamera-oben">
            <button className="kamera-rund" onClick={onClose} aria-label="Schließen"><X size={20} /></button>
            <span className="kamera-titel">Teil in den Umriss legen</span>
            <button className={`kamera-rund ${tipps ? "is-on" : ""}`} onClick={() => setTipps((t) => !t)} aria-label="Foto-Tipps"><Lightbulb size={19} /></button>
          </div>

          {!tipps && (
            <div className="kamera-kats scroll-x">
              {CATEGORIES.map((c) => (
                <button key={c.key} className={`kamera-kat ${c.key === kategorie ? "is-on" : ""}`} onClick={() => onKategorie(c.key)}>
                  {c.label}
                </button>
              ))}
            </div>
          )}
          <AnimatePresence>
            {tipps && (
              <m.ul className="kamera-tipps" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                {TIPPS.map((t) => <li key={t}>{t}</li>)}
              </m.ul>
            )}
          </AnimatePresence>

          <div className="kamera-unten">
            <div className="kamera-checks" aria-live="polite">
              {(["licht", "schaerfe", "untergrund"] as const).map((k) => (
                <span key={k} className={`kamera-check is-${check?.[k] ?? "ok"}`}>
                  <i />
                  {k === "licht" ? "Licht" : k === "schaerfe" ? "Schärfe" : "Untergrund"}
                  <b>{check ? LABEL[check[k]] : "…"}</b>
                </span>
              ))}
            </div>
            <p className="kamera-tipp">{!bereit ? "Kamera startet …" : check?.tipp ?? "Sieht gut aus – jetzt auslösen."}</p>
            <div className="kamera-leiste">
              <button className="kamera-rund" onClick={onGalerie} aria-label="Aus Galerie"><ImagePlus size={20} /></button>
              <m.button className={`kamera-ausloeser ${alleGut ? "is-gut" : ""}`} onClick={ausloesen} disabled={!bereit} whileTap={{ scale: 0.9 }} aria-label="Foto aufnehmen">
                <span />
              </m.button>
              <button className={`kamera-rund ${licht ? "is-on" : ""}`} onClick={taschenlampe} disabled={licht === null} aria-label="Licht"><Flashlight size={19} /></button>
            </div>
          </div>
        </m.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
