// Swipe-Modus: Outfits wie Karten wischen. Rechts = speichern, links = weg, hoch = heute anziehen.
import { AnimatePresence, m, useMotionValue, useTransform, type PanInfo } from "framer-motion";
import { Check, Heart, RotateCcw, X } from "lucide-react";
import { useMemo, useState } from "react";
import { db, logWear } from "../lib/db";
import { isoDay } from "../lib/dates";
import { newId } from "../lib/model";
import { generateOutfits, type Suggestion } from "../lib/outfits";
import { useGarderobe } from "../lib/store";
import { useWetter } from "../lib/wetter";
import { Collage } from "./Collage";
import { konfetti } from "./Motion";
import { useToast } from "./Toast";
import { Button } from "./ui";

type Richtung = "links" | "rechts" | "hoch";

export function Swipe() {
  const { items, idx } = useGarderobe();
  const { wetter } = useWetter();
  const toast = useToast();
  const [runde, setRunde] = useState(0);
  const [pos, setPos] = useState(0);
  const [raus, setRaus] = useState<Richtung>("links");
  const [gemerkt, setGemerkt] = useState(0);
  const temp = wetter ? Math.round((wetter.temp + wetter.max) / 2) : null;
  const stapel = useMemo(
    () => generateOutfits(items, idx, { occasion: null, temp, lockedIds: [], preferIdle: false, includeWish: false }, 15),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items.length, temp, runde],
  );
  const sichtbar = stapel.slice(pos, pos + 3);

  async function entscheide(s: Suggestion, r: Richtung) {
    setRaus(r);
    setPos((p) => p + 1);
    if (r === "rechts") {
      await db.outfits.add({ id: newId(), name: s.harmony.label.split(" · ")[0], itemIds: s.items.map((i) => i.id), createdAt: Date.now(), source: "generator", lookImage: null, layout: null, favorite: false });
      setGemerkt((n) => n + 1);
      toast("Gespeichert");
    } else if (r === "hoch") {
      await logWear(isoDay(), s.items.map((i) => i.id));
      toast("Heute angezogen – eingetragen");
      konfetti();
    }
  }

  if (!stapel.length) return <p className="muted">Für Vorschläge braucht es Oberteile, Hosen und Schuhe im Schrank.</p>;

  return (
    <div className="swipe">
      <div className="swipe-deck">
        <AnimatePresence custom={raus}>
          {sichtbar.length ? (
            sichtbar
              .map((s, i) => <Karte key={s.key} s={s} tiefe={i} onEntscheid={(r) => entscheide(s, r)} />)
              .reverse()
          ) : (
            <m.div key="ende" className="swipe-end" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <h3 className="display">Durch<em>geswiped.</em></h3>
              <p className="muted">{gemerkt ? `${gemerkt} Outfits gespeichert.` : "Nichts dabei? Neue Runde!"}</p>
              <Button variant="primary" icon={<RotateCcw size={16} />} onClick={() => { setRunde(runde + 1); setPos(0); setGemerkt(0); }}>
                Neue Runde
              </Button>
            </m.div>
          )}
        </AnimatePresence>
      </div>
      {sichtbar[0] && (
        <div className="swipe-buttons">
          <button className="swipe-btn" aria-label="Weg" onClick={() => entscheide(sichtbar[0], "links")}><X size={24} /></button>
          <button className="swipe-btn is-up" aria-label="Heute anziehen" onClick={() => entscheide(sichtbar[0], "hoch")}><Check size={22} /></button>
          <button className="swipe-btn is-like" aria-label="Speichern" onClick={() => entscheide(sichtbar[0], "rechts")}><Heart size={22} /></button>
        </div>
      )}
      <p className="swipe-hint muted">Rechts wischen = speichern · links = weg · hoch = heute anziehen</p>
    </div>
  );
}

function Karte({ s, tiefe, onEntscheid }: { s: Suggestion; tiefe: number; onEntscheid: (r: Richtung) => void }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rot = useTransform(x, [-300, 300], [-16, 16]);
  const like = useTransform(x, [30, 140], [0, 1]);
  const nope = useTransform(x, [-140, -30], [1, 0]);
  const up = useTransform(y, [-140, -40], [1, 0]);
  const oben = tiefe === 0;

  function ende(_: unknown, info: PanInfo) {
    if (info.offset.x > 120 || info.velocity.x > 700) onEntscheid("rechts");
    else if (info.offset.x < -120 || info.velocity.x < -700) onEntscheid("links");
    else if (info.offset.y < -120 || info.velocity.y < -700) onEntscheid("hoch");
  }

  return (
    <m.div
      className="swipe-card"
      style={{ x, y, rotate: rot, zIndex: 10 - tiefe }}
      drag={oben}
      dragSnapToOrigin
      dragElastic={0.9}
      onDragEnd={ende}
      initial={{ scale: 0.92, y: 30, opacity: 0 }}
      animate={{ scale: 1 - tiefe * 0.05, y: tiefe * 18, opacity: tiefe > 2 ? 0 : 1 }}
      variants={{
        raus: (r: Richtung) => ({
          x: r === "rechts" ? 520 : r === "links" ? -520 : 0,
          y: r === "hoch" ? -700 : 40,
          rotate: r === "rechts" ? 18 : r === "links" ? -18 : 0,
          opacity: 0,
          transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1] },
        }),
      }}
      exit="raus"
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      whileDrag={{ scale: 1.02, cursor: "grabbing" }}
    >
      <div className="swipe-board">
        <Collage items={s.items} compact />
      </div>
      <div className="swipe-info">
        <strong>{s.harmony.label}</strong>
        <span className="muted">{s.items.length} Teile</span>
      </div>
      {oben && (
        <>
          <m.span className="swipe-stamp is-like" style={{ opacity: like }}>Speichern</m.span>
          <m.span className="swipe-stamp is-nope" style={{ opacity: nope }}>Weg</m.span>
          <m.span className="swipe-stamp is-up" style={{ opacity: up }}>Heute</m.span>
        </>
      )}
    </m.div>
  );
}
