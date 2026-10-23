// Verkaufen: Anzeigentext und Produktfoto für Vinted vorbereiten, Status pflegen.
import { m } from "framer-motion";
import { Copy, Download, ExternalLink, PartyPopper, Tag } from "lucide-react";
import { useEffect, useState } from "react";
import { saveItem, bild } from "../lib/db";
import { isoDay } from "../lib/dates";
import { download, productShot } from "../lib/image";
import { CONDITIONS, type Condition, type Item } from "../lib/model";
import { statOf } from "../lib/stats";
import { useGarderobe } from "../lib/store";
import { VINTED_NEU, anzeigeText, anzeigeTitel } from "../lib/verkauf";
import { Sheet } from "./Sheet";
import { konfetti } from "./Motion";
import { useToast } from "./Toast";
import { Button, Field } from "./ui";

export function VerkaufSheet({ item, open, onClose }: { item: Item; open: boolean; onClose: () => void }) {
  const { idx } = useGarderobe();
  const toast = useToast();
  const [zustand, setZustand] = useState<Condition>(item.condition);
  const [titel, setTitel] = useState("");
  const [text, setText] = useState("");

  useEffect(() => {
    if (!open) return;
    setZustand(item.condition);
    setTitel(anzeigeTitel(item));
    setText(anzeigeText(item, statOf(idx, item.id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item.id]);

  function aendereZustand(z: Condition) {
    setZustand(z);
    setText(anzeigeText(item, statOf(idx, item.id), z));
  }

  async function kopiere(t: string, was: string) {
    try {
      await navigator.clipboard.writeText(t);
      toast(`${was} kopiert`);
    } catch {
      toast("Kopieren nicht möglich – bitte manuell markieren");
    }
  }

  async function fotoSpeichern() {
    const id = item.imageCutout ?? item.imageOriginal;
    if (!id) return;
    const img = await bild(id);
    if (!img) return;
    const blob = item.imageCutout ? await productShot(img.blob) : img.blob;
    download(blob, `${titel.replace(/[^\wäöüÄÖÜß -]/g, "").replace(/\s+/g, "-") || "teil"}.jpg`);
  }

  async function alsVerkauf() {
    await saveItem({ ...item, status: "selling", condition: zustand });
    toast("Steht jetzt auf deiner Verkaufsliste");
  }

  async function verkauft() {
    await saveItem({ ...item, status: "sold", condition: zustand, soldAt: isoDay() });
    toast("Verkauft – gut gemacht!");
    konfetti();
    onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Verkaufen"
      wide
      footer={
        item.status === "selling" ? (
          <div className="row-gap spread">
            <span className="muted sell-hint">Bei Vinted verkauft? Dann hier abhaken – bleibt in deiner Statistik.</span>
            <Button variant="primary" icon={<PartyPopper size={16} />} onClick={verkauft}>
              Als verkauft markieren
            </Button>
          </div>
        ) : (
          <div className="row-gap spread">
            <span className="muted sell-hint">Vinted bietet kein Einstellen per App-Schnittstelle – Text & Foto sind vorbereitet.</span>
            <Button variant="primary" icon={<Tag size={16} />} onClick={alsVerkauf}>
              Auf Verkaufsliste setzen
            </Button>
          </div>
        )
      }
    >
      <div className="sell-grid">
        <m.div className="sell-steps" initial="a" animate="b" variants={{ b: { transition: { staggerChildren: 0.06 } } }}>
          {[
            { n: 1, t: "Foto speichern", d: "Freigestellt auf hellem Grund im Vinted-Format 4:5.", a: <Button size="s" icon={<Download size={14} />} onClick={fotoSpeichern}>Foto</Button> },
            { n: 2, t: "Text kopieren", d: "Titel und Beschreibung sind fertig formuliert.", a: <Button size="s" icon={<Copy size={14} />} onClick={() => kopiere(`${titel}\n\n${text}`, "Anzeige")}>Kopieren</Button> },
            {
              n: 3,
              t: "In Vinted einstellen",
              d: "Öffnet Vinted – Foto hochladen, Text einfügen, fertig.",
              a: (
                <a className="btn btn-secondary btn-s" href={VINTED_NEU} target="_blank" rel="noreferrer">
                  <ExternalLink size={14} />
                  <span>Vinted</span>
                </a>
              ),
            },
          ].map((s) => (
            <m.div key={s.n} className="sell-step" variants={{ a: { opacity: 0, y: 10 }, b: { opacity: 1, y: 0 } }}>
              <span className="sell-step-n">{s.n}</span>
              <div className="sell-step-text">
                <strong>{s.t}</strong>
                <span>{s.d}</span>
              </div>
              {s.a}
            </m.div>
          ))}
        </m.div>

        <div className="stack">
          <Field label="Titel">
            <input value={titel} maxLength={60} onChange={(e) => setTitel(e.target.value)} />
          </Field>
          <Field label="Zustand">
            <select value={zustand} onChange={(e) => aendereZustand(e.target.value as Condition)}>
              {CONDITIONS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Beschreibung">
            <textarea rows={9} value={text} onChange={(e) => setText(e.target.value)} />
          </Field>
        </div>
      </div>
    </Sheet>
  );
}
