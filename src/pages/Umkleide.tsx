// Umkleide: eigenes Foto + freigestellte Teile darüberlegen, verschieben, skalieren, drehen.
import { AnimatePresence, motion } from "framer-motion";
import { useLiveQuery } from "dexie-react-hooks";
import { Repeat, Sparkles, ArrowDown, ArrowUp, Camera, Download, FlipHorizontal2, Heart, ImagePlus, Plus, RotateCw, Trash2, Wand2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { GarmentImage } from "../components/Garment";
import { Sheet } from "../components/Sheet";
import { useToast } from "../components/Toast";
import { Button, Chip, Segmented, Toggle } from "../components/ui";
import { mannequinSvg, svgToPng } from "../demo/garments";
import { db, putImage, setSetting, bild } from "../lib/db";
import { hintergrundEntfernen } from "../lib/freistellen";
import { download, normalizePhoto } from "../lib/image";
import { useLocal } from "../lib/hooks";
import { CATEGORIES, displayName, newId, type CategoryKey, type Item, type LayoutPiece } from "../lib/model";
import { harmony, ordne } from "../lib/outfits";
import { go } from "../lib/router";
import { forgetImage, useGarderobe, useImageUrl } from "../lib/store";
import { kiAnprobe, kiReihenfolge, type KiStatus } from "../lib/kiAnprobe";
import { konfetti } from "../components/Motion";
import { EBENE, aufStudioHintergrund, lookRendern, startPosition } from "../lib/umkleide";
import { PUPPE, koerperPlausibel, platziereAmKoerper, type Koerper } from "../lib/koerper";
import { erkenneKoerper } from "../lib/pose";

interface Person {
  imageId: string;
  aspect: number;
  /** erkannte Körperpunkte; null = keine Person erkannt, undefined = noch nicht geprüft */
  koerper?: Koerper | null;
}

let puppe: Promise<{ blob: Blob; url: string }> | null = null;
function ladePuppe() {
  return (puppe ??= svgToPng(mannequinSvg(), 900, 1600).then((blob) => ({ blob, url: URL.createObjectURL(blob) })));
}

export function Umkleide({ q }: { q: URLSearchParams }) {
  const { items, byId, outfits } = useGarderobe();
  const toast = useToast();
  // undefined = lädt noch, null = kein eigenes Foto
  const personSetting = useLiveQuery(async () => (await db.settings.get("person")) ?? null, []);
  const personBereit = personSetting !== undefined;
  const person = (personSetting?.value as Person | undefined) ?? null;
  const [erkennung, setErkennung] = useState(false);
  const personUrl = useImageUrl(person?.imageId);
  const [puppeUrl, setPuppeUrl] = useState<string | null>(null);
  const [pieces, setPieces] = useLocal<LayoutPiece[]>("garderobe.umkleide", []);
  const [sel, setSel] = useState<string | null>(null);
  const [kat, setKat] = useState<CategoryKey | "wunsch">("oberteile");
  const [fotoOffen, setFotoOffen] = useState(false);
  const [speichert, setSpeichert] = useState(false);
  // KI-Anprobe
  const [ki, setKi] = useState<{ status: KiStatus | null; url: string | null; blob: Blob | null }>({ status: null, url: null, blob: null });
  const [zeigeKi, setZeigeKi] = useState(false);
  const [kiFrage, setKiFrage] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const aspect = person?.aspect ?? 900 / 1600;

  useEffect(() => {
    if (!person) ladePuppe().then((p) => setPuppeUrl(p.url));
  }, [person]);

  // Körper für bereits gespeicherte Fotos einmalig im Hintergrund erkennen
  useEffect(() => {
    if (!person || person.koerper !== undefined) return;
    let aktiv = true;
    setErkennung(true);
    (async () => {
      const img = await bild(person.imageId);
      const k = img ? await erkenneKoerper(img.blob).catch(() => null) : null;
      if (aktiv) await setSetting("person", { ...person, koerper: k && koerperPlausibel(k) ? k : null });
    })().finally(() => aktiv && setErkennung(false));
    return () => {
      aktiv = false;
    };
  }, [person]);

  const koerper: Koerper | null = person ? person.koerper ?? null : PUPPE;

  function position(item: Item): LayoutPiece {
    const z = EBENE[item.category] + Math.random() * 0.01;
    return koerper ? platziereAmKoerper(item, koerper, aspect, z) : startPosition(item, z);
  }

  function anpassen() {
    if (!koerper) return;
    setAnimiert(true);
    setPieces(pieces.map((p) => {
      const it = byId.get(p.itemId);
      return it ? { ...platziereAmKoerper(it, koerper, aspect, p.z), flip: p.flip } : p;
    }));
    setTimeout(() => setAnimiert(false), 700);
  }
  const [animiert, setAnimiert] = useState(false);

  // Neues Foto mit erkanntem Körper: angezogene Teile gleich neu ausrichten
  const fotoSchluessel = person?.koerper ? person.imageId : null;
  const letztesFoto = useRef(fotoSchluessel);
  useEffect(() => {
    if (fotoSchluessel && letztesFoto.current !== fotoSchluessel && pieces.length) anpassen();
    letztesFoto.current = fotoSchluessel;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fotoSchluessel]);

  // Teile aus dem Link übernehmen (?ids=… oder ?outfit=…)
  useEffect(() => {
    if (!personBereit) return;
    const ids = q.get("ids")?.split(",").filter(Boolean);
    const outfitId = q.get("outfit");
    if (outfitId) {
      const o = outfits.find((x) => x.id === outfitId);
      if (!o) return;
      if (o.layout?.length) setPieces(o.layout);
      else setPieces(platziere(o.itemIds.map((i) => byId.get(i)).filter(Boolean) as Item[]));
    } else if (ids?.length && items.length) {
      const neu = ids.map((i) => byId.get(i)).filter(Boolean) as Item[];
      if (neu.length) {
        // gleiche Kategorien ersetzen, Rest behalten
        const kats = new Set(neu.map((i) => i.category));
        const bleiben = pieces.filter((p) => {
          const it = byId.get(p.itemId);
          return it && !kats.has(it.category) && !neu.some((n) => n.id === p.itemId);
        });
        setPieces([...bleiben, ...platziere(neu)]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.toString(), items.length > 0, outfits.length, personBereit]);

  const sichtbar = pieces.filter((p) => byId.has(p.itemId));
  const aktuelleTeile = ordne(sichtbar.map((p) => byId.get(p.itemId)!));
  const auswahl = sichtbar.find((p) => p.itemId === sel) ?? null;

  function platziere(list: Item[]): LayoutPiece[] {
    return list.map(position);
  }

  function anziehen(item: Item) {
    if (pieces.some((p) => p.itemId === item.id)) {
      setPieces(pieces.filter((p) => p.itemId !== item.id));
      if (sel === item.id) setSel(null);
      return;
    }
    // Teil derselben Kategorie ersetzen (außer Accessoires)
    const rest = item.category === "accessoires" ? pieces : pieces.filter((p) => byId.get(p.itemId)?.category !== item.category && !(item.category === "kleider" && ["oberteile", "unterteile"].includes(byId.get(p.itemId)?.category ?? "")) && !(["oberteile", "unterteile"].includes(item.category) && byId.get(p.itemId)?.category === "kleider"));
    setPieces([...rest, position(item)]);
    setSel(item.id);
  }

  function aendere(id: string, p: Partial<LayoutPiece>) {
    setPieces(pieces.map((x) => (x.itemId === id ? { ...x, ...p } : x)));
  }

  /* ───── Gesten: ziehen, zwei Finger = skalieren + drehen, Mausrad = skalieren ───── */
  const gesten = useRef<{ pointers: Map<number, { x: number; y: number }>; id: string | null; start: LayoutPiece | null; p0: Map<number, { x: number; y: number }> }>({
    pointers: new Map(),
    id: null,
    start: null,
    p0: new Map(),
  });
  const piecesRef = useRef(pieces);
  piecesRef.current = pieces;

  function onPieceDown(e: React.PointerEvent, id: string) {
    e.stopPropagation();
    stage.current?.setPointerCapture(e.pointerId);
    const g = gesten.current;
    if (g.id !== id) g.pointers.clear();
    g.id = id;
    g.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    g.p0 = new Map(g.pointers);
    g.start = piecesRef.current.find((p) => p.itemId === id) ?? null;
    setSel(id);
  }

  function onMove(e: React.PointerEvent) {
    const g = gesten.current;
    if (!g.id || !g.start || !g.pointers.has(e.pointerId) || !stage.current) return;
    g.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const r = stage.current.getBoundingClientRect();
    const pts = [...g.pointers.values()];
    const p0 = [...g.p0.values()];
    if (pts.length >= 2 && p0.length >= 2) {
      const d0 = Math.hypot(p0[1].x - p0[0].x, p0[1].y - p0[0].y);
      const d1 = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      const a0 = Math.atan2(p0[1].y - p0[0].y, p0[1].x - p0[0].x);
      const a1 = Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x);
      const m0 = { x: (p0[0].x + p0[1].x) / 2, y: (p0[0].y + p0[1].y) / 2 };
      const m1 = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
      aendere(g.id, {
        w: clamp(g.start.w * (d1 / Math.max(d0, 1)), 0.05, 1.6),
        rot: g.start.rot + ((a1 - a0) * 180) / Math.PI,
        x: clamp(g.start.x + (m1.x - m0.x) / r.width, -0.2, 1.2),
        y: clamp(g.start.y + (m1.y - m0.y) / r.height, -0.2, 1.2),
      });
    } else {
      const a = p0[0];
      aendere(g.id, {
        x: clamp(g.start.x + (e.clientX - a.x) / r.width, -0.2, 1.2),
        y: clamp(g.start.y + (e.clientY - a.y) / r.height, -0.2, 1.2),
      });
    }
  }

  function onUp(e: React.PointerEvent) {
    const g = gesten.current;
    g.pointers.delete(e.pointerId);
    g.p0 = new Map(g.pointers);
    g.start = piecesRef.current.find((p) => p.itemId === g.id) ?? null;
    if (!g.pointers.size) g.id = null;
  }

  function onWheel(e: React.WheelEvent) {
    if (!auswahl) return;
    e.preventDefault();
    if (e.shiftKey) aendere(auswahl.itemId, { rot: auswahl.rot + Math.sign(e.deltaY) * 3 });
    else aendere(auswahl.itemId, { w: clamp(auswahl.w * (e.deltaY > 0 ? 0.96 : 1.04), 0.05, 1.6) });
  }

  function ebene(richtung: 1 | -1) {
    if (!auswahl) return;
    const sortiert = [...sichtbar].sort((a, b) => a.z - b.z);
    const i = sortiert.findIndex((p) => p.itemId === auswahl.itemId);
    const nachbar = sortiert[i + richtung];
    if (!nachbar) return;
    setPieces(pieces.map((p) => (p.itemId === auswahl.itemId ? { ...p, z: nachbar.z } : p.itemId === nachbar.itemId ? { ...p, z: auswahl.z } : p)));
  }

  async function speichern(alsDatei: boolean) {
    if (!sichtbar.length) return;
    setSpeichert(true);
    try {
      let basis: Blob;
      if (person) basis = (await bild(person.imageId))!.blob;
      else basis = (await ladePuppe()).blob;
      const blob = zeigeKi && ki.blob ? ki.blob : await lookRendern(basis, aspect, sichtbar, byId);
      if (alsDatei) {
        download(blob, "look.jpg");
      } else {
        const lookImage = await putImage(blob, "look");
        const id = newId();
        await db.outfits.add({
          id,
          name: aktuelleTeile.length ? `Look mit ${displayName(aktuelleTeile[0])}` : "Look",
          itemIds: aktuelleTeile.map((i) => i.id),
          createdAt: Date.now(),
          source: "umkleide",
          lookImage,
          layout: sichtbar,
          favorite: false,
        });
        toast("Look gespeichert", { label: "Ansehen", run: () => go(`outfit/${id}`) });
      }
    } finally {
      setSpeichert(false);
    }
  }

  // Für die KI: oben (Jacke vor Oberteil) und unten – oder ein Kleid
  const kiTeile = kiReihenfolge(aktuelleTeile);
  const kiTeil = kiTeile[0];

  async function kiStarten() {
    if (!kiTeil) return;
    try {
      const personBlob = person ? (await bild(person.imageId))?.blob : (await ladePuppe()).blob;
      const teile = [];
      for (const item of kiTeile) {
        const id = item.imageCutout ?? item.imageOriginal;
        const b = id ? (await bild(id))?.blob : undefined;
        if (b) teile.push({ item, bild: b });
      }
      if (!personBlob || !teile.length) throw new Error("Bild fehlt");
      setKi((k) => ({ ...k, status: { phase: "verbinden" } }));
      const ergebnis = await kiAnprobe(personBlob, teile, (status) => setKi((k) => ({ ...k, status })));
      if (ki.url) URL.revokeObjectURL(ki.url);
      setKi({ status: { phase: "fertig" }, url: URL.createObjectURL(ergebnis), blob: ergebnis });
      setZeigeKi(true);
      konfetti();
    } catch (e) {
      setKi((k) => ({ ...k, status: null }));
      toast(e instanceof Error ? e.message : "KI-Anprobe fehlgeschlagen");
    }
  }

  const drawer = useMemo(() => {
    if (kat === "wunsch") return items.filter((i) => i.status === "wish");
    return items.filter((i) => i.category === kat && (i.status === "owned" || i.status === "selling"));
  }, [items, kat]);
  const h = aktuelleTeile.length > 1 ? harmony(aktuelleTeile) : null;
  const hatWunsch = aktuelleTeile.some((i) => i.status === "wish");

  return (
    <div className="wrap">
      <header className="shop-head">
        <div>
          <div className="eyebrow pose-status">
            {!person ? (
              "Schneiderpuppe – lade ein Foto von dir hoch"
            ) : erkennung ? (
              <><span className="spinner small" /> Körper wird erkannt …</>
            ) : person.koerper ? (
              <><span className="pose-dot" /> Körper erkannt · Teile werden automatisch platziert</>
            ) : (
              "Dein Foto · keine Person erkannt, Teile bitte von Hand ausrichten"
            )}
          </div>
          <h1 className="display page-title">
            Um<em>kleide</em>
          </h1>
        </div>
        <div className="row-gap">
          <Button icon={<Camera size={16} />} onClick={() => setFotoOffen(true)}>
            {person ? "Foto ändern" : "Dein Foto"}
          </Button>
        </div>
      </header>

      <div className="fitting">
        <div className="fitting-stage-wrap">
          <div
            ref={stage}
            className="fitting-stage"
            style={{ aspectRatio: String(aspect), ["--a" as string]: String(aspect) }}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            onPointerDown={() => setSel(null)}
            onWheel={onWheel}
          >
            {(personUrl ?? puppeUrl) && <img className="fitting-person" src={(person ? personUrl : puppeUrl) ?? ""} alt="" draggable={false} />}
            <>
              {[...sichtbar]
                .sort((a, b) => a.z - b.z)
                .map((p) => {
                  const it = byId.get(p.itemId)!;
                  return (
                    <div
                      key={p.itemId}
                      className={`fit-piece ${sel === p.itemId ? "is-sel" : ""} ${animiert ? "is-animated" : ""}`}
                      style={{
                        left: `${p.x * 100}%`,
                        top: `${p.y * 100}%`,
                        width: `${p.w * 100}%`,
                        aspectRatio: String(it.aspect || 0.8),
                        zIndex: Math.round(p.z * 10),
                        transform: `translate(-50%, -50%) rotate(${p.rot}deg) scaleX(${p.flip ? -1 : 1})`,
                      }}
                      onPointerDown={(e) => onPieceDown(e, p.itemId)}
                    >
                      <motion.div
                        className="fit-piece-inner"
                        initial={{ opacity: 0, scale: 0.8, y: -12 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 24 }}
                      >
                        <GarmentImage item={it} large />
                      </motion.div>
                    </div>
                  );
                })}
            </>
            <AnimatePresence>
              {zeigeKi && ki.url && (
                <motion.img key={ki.url} className="fitting-ki" src={ki.url} alt="KI-Anprobe" initial={{ opacity: 0, scale: 1.02 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }} />
              )}
            </AnimatePresence>
            {ki.status && ki.status.phase !== "fertig" && (
              <div className="ki-arbeit">
                <motion.span className="scan-line" animate={{ top: ["0%", "100%", "0%"] }} transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }} />
                <span className="ki-label">
                  {ki.status.phase === "verbinden"
                    ? "Verbinde mit der KI …"
                    : ki.status.phase === "warteschlange"
                      ? `In der Warteschlange · Platz ${ki.status.position}`
                      : `KI zieht dich an${ki.status.schritt ? ` · ${ki.status.schritt}` : ""}${ki.status.eta ? ` · ca. ${Math.round(ki.status.eta)} s` : ""}`}
                </span>
              </div>
            )}
            {!sichtbar.length && (
              <div className="fitting-hint">
                <span>Tippe rechts auf ein Teil, um es anzuziehen</span>
              </div>
            )}
          </div>

          <AnimatePresence>
            {auswahl && (
              <motion.div className="fit-tools" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={{ type: "spring", stiffness: 400, damping: 32 }}>
                <label className="fit-slider">
                  <span>Größe</span>
                  <input type="range" min={0.05} max={1.4} step={0.005} value={auswahl.w} onChange={(e) => aendere(auswahl.itemId, { w: +e.target.value })} />
                </label>
                <label className="fit-slider">
                  <RotateCw size={14} />
                  <input type="range" min={-45} max={45} step={0.5} value={auswahl.rot} onChange={(e) => aendere(auswahl.itemId, { rot: +e.target.value })} />
                </label>
                <div className="fit-buttons">
                  <button className="icon-btn" aria-label="Nach vorn" onClick={() => ebene(1)}><ArrowUp size={16} /></button>
                  <button className="icon-btn" aria-label="Nach hinten" onClick={() => ebene(-1)}><ArrowDown size={16} /></button>
                  <button className="icon-btn" aria-label="Spiegeln" onClick={() => aendere(auswahl.itemId, { flip: !auswahl.flip })}><FlipHorizontal2 size={16} /></button>
                  <button className="icon-btn" aria-label="Ausziehen" onClick={() => { setPieces(pieces.filter((p) => p.itemId !== auswahl.itemId)); setSel(null); }}><Trash2 size={16} /></button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <aside className="fitting-side">
          <div className="fitting-wearing">
            <div className="section-head">
              <h2 className="section-title">Du trägst</h2>
              {sichtbar.length > 0 && (
                <button className="link" onClick={() => { setPieces([]); setSel(null); }}>
                  Alles ausziehen
                </button>
              )}
            </div>
            {h && (
              <p className="fitting-harmony">
                <span className="score-ring" style={{ ["--p" as string]: `${Math.round(h.score * 100)}` }}><span className="tabular">{Math.round(h.score * 100)}</span></span>
                {h.label}
              </p>
            )}
            {hatWunsch && <p className="muted fitting-note">Enthält Teile von deiner Wunschliste – so siehst du vor dem Kauf, ob es passt.</p>}
            <div className="row-gap">
              <Button variant="primary" icon={<Heart size={16} />} disabled={!sichtbar.length || speichert} onClick={() => speichern(false)}>
                Look speichern
              </Button>
              <Button icon={<Download size={16} />} disabled={!sichtbar.length || speichert} onClick={() => speichern(true)}>
                Bild
              </Button>
              <Button
                variant="primary"
                icon={<Sparkles size={16} />}
                disabled={!kiTeil || !person || (ki.status !== null && ki.status.phase !== "fertig")}
                title={!person ? "Für die KI-Anprobe zuerst ein Foto von dir hochladen" : !kiTeil ? "Ein Oberteil, eine Hose oder ein Kleid anziehen" : `Zieht an: ${kiTeile.map((i) => i.sub || i.name).join(" + ")}`}
                onClick={() => (localStorage.getItem("garderobe.ki.ok") ? kiStarten() : setKiFrage(true))}
              >
                KI-Anprobe
              </Button>
              {ki.url && (
                <Button icon={<Repeat size={16} />} onClick={() => setZeigeKi(!zeigeKi)}>
                  {zeigeKi ? "Zur Collage" : "KI-Bild zeigen"}
                </Button>
              )}
              {koerper && !zeigeKi && (
                <Button variant="ghost" icon={<Wand2 size={16} />} disabled={!sichtbar.length} onClick={anpassen}>
                  Automatisch anpassen
                </Button>
              )}
            </div>
          </div>

          <div className="drawer">
            <div className="drawer-tabs scroll-x">
              {CATEGORIES.map((c) => (
                <Chip key={c.key} on={kat === c.key} onClick={() => setKat(c.key)} layoutGroup="drawer">
                  {c.label}
                </Chip>
              ))}
              <Chip on={kat === "wunsch"} onClick={() => setKat("wunsch")} layoutGroup="drawer">
                Wunschliste
              </Chip>
            </div>
            <div className="drawer-grid">
              {drawer.map((it) => {
                const an = pieces.some((p) => p.itemId === it.id);
                return (
                  <motion.button key={it.id} layout className={`drawer-item ${an ? "is-on" : ""}`} onClick={() => anziehen(it)} title={displayName(it)} whileTap={{ scale: 0.94 }}>
                    <GarmentImage item={it} />
                    {an && <span className="build-check"><X size={11} strokeWidth={3} /></span>}
                  </motion.button>
                );
              })}
              <button className="drawer-item drawer-add" onClick={() => go(kat === "wunsch" ? "neu?status=wish" : `neu?kat=${kat}`)}>
                <Plus size={18} />
                <span>{kat === "wunsch" ? "Wunsch" : "Neu"}</span>
              </button>
            </div>
          </div>
        </aside>
      </div>

      <FotoSheet open={fotoOffen} onClose={() => setFotoOffen(false)} person={person} />
      <Sheet
        open={kiFrage}
        onClose={() => setKiFrage(false)}
        title="KI-Anprobe"
        footer={
          <div className="row-gap spread">
            <Button variant="ghost" onClick={() => setKiFrage(false)}>Abbrechen</Button>
            <Button
              variant="primary"
              icon={<Sparkles size={16} />}
              onClick={() => {
                localStorage.setItem("garderobe.ki.ok", "1");
                setKiFrage(false);
                kiStarten();
              }}
            >
              Verstanden, anprobieren
            </Button>
          </div>
        }
      >
        <div className="stack ki-info">
          <p>Die KI zieht dir das Teil realistisch an – mit Falten, Licht und Passform. Dafür werden <strong>dein Foto und das Kleidungsstück an Hugging Face geschickt</strong> (kostenlose Demo des Modells Leffa).</p>
          <ul>
            <li>Zieht <strong>Oberteil bzw. Jacke und Hose</strong> nacheinander an, oder ein Kleid. Schuhe und Accessoires kann das Modell nicht.</li>
            <li>Kostenlos, aber mit Warteschlange und Tageskontingent; dauert meist 30–90 Sekunden.</li>
            <li>Am besten mit eigenem Ganzkörper- oder Oberkörperfoto von vorn.</li>
            <li>Das Modell ist frei nutzbar (MIT-Lizenz).</li>
          </ul>
        </div>
      </Sheet>
    </div>
  );
}

function clamp(v: number, a: number, b: number) {
  return Math.min(b, Math.max(a, v));
}

function FotoSheet({ open, onClose, person }: { open: boolean; onClose: () => void; person: Person | null }) {
  const toast = useToast();
  const [freistellen, setFreistellen] = useState(true);
  const [hintergrund, setHintergrund] = useState<"hell" | "dunkel">("hell");
  const [status, setStatus] = useState<string | null>(null);
  const kamera = useRef<HTMLInputElement>(null);
  const galerie = useRef<HTMLInputElement>(null);

  async function nimm(f: File) {
    setStatus("Foto wird vorbereitet …");
    try {
      const norm = await normalizePhoto(f, 1800);
      let blob = norm.blob;
      let aspect = norm.width / norm.height;
      if (freistellen) {
        setStatus("Du wirst freigestellt …");
        const roh = await hintergrundEntfernen(norm.blob, (p) => setStatus(p.phase === "modell" ? `Modell wird geladen … ${Math.round(p.anteil * 100)} %` : "Du wirst freigestellt …"));
        const s = await aufStudioHintergrund(roh, hintergrund === "dunkel");
        blob = s.blob;
        aspect = s.aspect;
      }
      setStatus("Körper wird erkannt …");
      const k = await erkenneKoerper(blob).catch(() => null);
      const koerper = k && koerperPlausibel(k) ? k : null;
      const alt = person?.imageId;
      const imageId = await putImage(blob, "person");
      await setSetting("person", { imageId, aspect, koerper });
      if (alt) {
        await db.images.delete(alt);
        forgetImage(alt);
      }
      toast(koerper ? "Körper erkannt – Teile werden automatisch angepasst" : "Foto gespeichert – keine Person erkannt, Teile bitte von Hand ausrichten");
      onClose();
    } catch {
      toast("Das Foto konnte nicht verarbeitet werden");
    } finally {
      setStatus(null);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Dein Foto">
      <input ref={kamera} type="file" accept="image/*" capture="user" hidden onChange={(e) => e.target.files?.[0] && nimm(e.target.files[0])} />
      <input ref={galerie} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && nimm(e.target.files[0])} />
      <p className="muted sheet-lead">
        Am besten ein Ganzkörperfoto von vorn, Arme leicht vom Körper, in eng anliegender Kleidung. Das Foto bleibt nur auf diesem Gerät.
      </p>
      <Toggle on={freistellen} onChange={setFreistellen} label={<span className="toggle-label"><Wand2 size={16} /> Hintergrund durch Studio ersetzen</span>} />
      {freistellen && (
        <div className="foto-bg">
          <Segmented id="studio" value={hintergrund} onChange={setHintergrund} options={[{ value: "hell", label: "Hell" }, { value: "dunkel", label: "Dunkel" }]} />
        </div>
      )}
      {status ? (
        <div className="foto-status">
          <span className="spinner" /> {status}
        </div>
      ) : (
        <div className="row-gap foto-actions">
          <Button variant="primary" size="l" icon={<Camera size={18} />} onClick={() => kamera.current?.click()}>
            Foto aufnehmen
          </Button>
          <Button size="l" icon={<ImagePlus size={18} />} onClick={() => galerie.current?.click()}>
            Aus Galerie
          </Button>
          {person && (
            <Button
              variant="ghost"
              onClick={async () => {
                await db.settings.delete("person");
                await db.images.delete(person.imageId);
                forgetImage(person.imageId);
                onClose();
              }}
            >
              Schneiderpuppe verwenden
            </Button>
          )}
        </div>
      )}
    </Sheet>
  );
}
