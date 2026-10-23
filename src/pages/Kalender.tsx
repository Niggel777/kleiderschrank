// Kalender: was wurde wann getragen. Tag antippen → Teile eintragen oder entfernen.
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Collage } from "../components/Collage";
import { GarmentImage } from "../components/Garment";
import { Sheet } from "../components/Sheet";
import { Button, Segmented } from "../components/ui";
import { logWear, unlogWear } from "../lib/db";
import { formatMonth, formatWeekday, isoDay } from "../lib/dates";
import { CATEGORIES, displayName, type Item } from "../lib/model";
import { ordne } from "../lib/outfits";
import { useGarderobe } from "../lib/store";

const WOCHENTAGE = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

export function Kalender() {
  const { wears, byId } = useGarderobe();
  const [monat, setMonat] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [richtung, setRichtung] = useState(0);
  const [tag, setTag] = useState<string | null>(null);
  const heute = isoDay();

  const proTag = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const w of wears) m.set(w.date, [...(m.get(w.date) ?? []), ...w.itemIds]);
    return m;
  }, [wears]);

  const zellen = useMemo(() => {
    const erster = (monat.getDay() + 6) % 7;
    const tage = new Date(monat.getFullYear(), monat.getMonth() + 1, 0).getDate();
    const z: (string | null)[] = Array(erster).fill(null);
    for (let d = 1; d <= tage; d++) z.push(isoDay(new Date(monat.getFullYear(), monat.getMonth(), d)));
    while (z.length % 7) z.push(null);
    return z;
  }, [monat]);

  const statistik = useMemo(() => {
    const prefix = isoDay(monat).slice(0, 7);
    const tageImMonat = [...proTag.keys()].filter((d) => d.startsWith(prefix));
    const zaehl = new Map<string, number>();
    for (const d of tageImMonat) for (const id of proTag.get(d)!) zaehl.set(id, (zaehl.get(id) ?? 0) + 1);
    const top = [...zaehl.entries()].sort((a, b) => b[1] - a[1])[0];
    return { tage: tageImMonat.length, teile: zaehl.size, top: top ? { item: byId.get(top[0]), n: top[1] } : null };
  }, [proTag, monat, byId]);

  function blaettern(n: number) {
    setRichtung(n);
    setMonat(new Date(monat.getFullYear(), monat.getMonth() + n, 1));
  }

  return (
    <div className="wrap">
      <header className="shop-head">
        <div>
          <div className="eyebrow">Tragetagebuch</div>
          <h1 className="display page-title">
            Kalen<em>der</em>
          </h1>
        </div>
        <div className="month-nav">
          <button className="icon-btn" onClick={() => blaettern(-1)} aria-label="Voriger Monat"><ChevronLeft size={18} /></button>
          <span className="month-label">{formatMonth(monat)}</span>
          <button className="icon-btn" onClick={() => blaettern(1)} aria-label="Nächster Monat"><ChevronRight size={18} /></button>
          <Button size="s" variant="ghost" onClick={() => { const d = new Date(); setRichtung(0); setMonat(new Date(d.getFullYear(), d.getMonth(), 1)); }}>Heute</Button>
        </div>
      </header>

      <div className="month-stats">
        <div><span className="stat-big tabular">{statistik.tage}</span><span>Tage erfasst</span></div>
        <div><span className="stat-big tabular">{statistik.teile}</span><span>verschiedene Teile</span></div>
        {statistik.top?.item && (
          <a className="month-fav" href={`#/teil/${statistik.top.item.id}`}>
            <span className="piece-thumb"><GarmentImage item={statistik.top.item} /></span>
            <span><strong>{displayName(statistik.top.item)}</strong><span>Liebling des Monats · {statistik.top.n}×</span></span>
          </a>
        )}
      </div>

      <div className="cal">
        <div className="cal-head">
          {WOCHENTAGE.map((w) => <span key={w}>{w}</span>)}
        </div>
        <AnimatePresence mode="wait" initial={false} custom={richtung}>
          <motion.div
            key={monat.toISOString()}
            className="cal-grid"
            custom={richtung}
            initial={{ opacity: 0, x: richtung * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: richtung * -40 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          >
            {zellen.map((d, i) => {
              if (!d) return <span key={`l${i}`} className="cal-cell is-empty" />;
              const ids = proTag.get(d) ?? [];
              const teile = ordne(ids.map((id) => byId.get(id)).filter(Boolean) as Item[]);
              return (
                <button key={d} className={`cal-cell ${d === heute ? "is-today" : ""} ${d > heute ? "is-future" : ""} ${teile.length ? "has-wear" : ""}`} onClick={() => setTag(d)} aria-label={`${formatWeekday(d)}: ${teile.length ? `${teile.length} Teile` : "nichts eingetragen"}`}>
                  <span className="cal-num">{Number(d.slice(8))}</span>
                  {teile.length > 0 && (
                    <span className="cal-thumbs">
                      {teile.slice(0, 3).map((t) => (
                        <span key={t.id} className="cal-thumb"><GarmentImage item={t} /></span>
                      ))}
                      {teile.length > 3 && <span className="cal-more">+{teile.length - 3}</span>}
                    </span>
                  )}
                </button>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>

      <TagSheet tag={tag} onClose={() => setTag(null)} ids={tag ? proTag.get(tag) ?? [] : []} />
    </div>
  );
}

function TagSheet({ tag, onClose, ids }: { tag: string | null; onClose: () => void; ids: string[] }) {
  const { byId, schrank, outfits } = useGarderobe();
  const [modus, setModus] = useState<"teile" | "outfits">("teile");
  const teile = ordne(ids.map((id) => byId.get(id)).filter(Boolean) as Item[]);
  const zukunft = tag ? tag > isoDay() : false;
  return (
    <Sheet open={tag !== null} onClose={onClose} title={tag ? formatWeekday(tag) : ""} wide>
      {tag && (
        <div className="day">
          <div className="day-board">
            {teile.length ? <Collage items={teile} compact /> : <div className="build-empty">{zukunft ? "Plane hier dein Outfit" : "Nichts eingetragen"}</div>}
          </div>
          <div className="day-side">
            {teile.length > 0 && (
              <ul className="piece-list">
                {teile.map((t) => (
                  <li key={t.id}>
                    <a href={`#/teil/${t.id}`} className="piece">
                      <span className="piece-thumb"><GarmentImage item={t} /></span>
                      <span className="piece-text"><strong>{displayName(t)}</strong><span>{t.brand}</span></span>
                    </a>
                    <button className="icon-btn" aria-label="Entfernen" onClick={() => unlogWear(tag, t.id)}><X size={16} /></button>
                  </li>
                ))}
              </ul>
            )}
            <div className="day-add">
              <Segmented id="tag-modus" value={modus} onChange={setModus} options={[{ value: "teile", label: "Teile" }, { value: "outfits", label: "Gespeicherte Outfits" }]} />
              {modus === "teile" ? (
                CATEGORIES.map((c) => {
                  const liste = schrank.filter((i) => i.category === c.key);
                  if (!liste.length) return null;
                  return (
                    <section key={c.key}>
                      <h3 className="eyebrow">{c.label}</h3>
                      <div className="build-row scroll-x">
                        {liste.map((i) => {
                          const on = ids.includes(i.id);
                          return (
                            <button key={i.id} className={`build-item ${on ? "is-on" : ""}`} onClick={() => (on ? unlogWear(tag, i.id) : logWear(tag, [i.id]))} aria-pressed={on} title={displayName(i)}>
                              <GarmentImage item={i} />
                              {on ? <span className="build-check"><X size={11} strokeWidth={3} /></span> : null}
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  );
                })
              ) : (
                <div className="day-outfits">
                  {outfits.length === 0 && <p className="muted">Noch keine gespeicherten Outfits.</p>}
                  {outfits.map((o) => (
                    <button key={o.id} className="day-outfit" onClick={() => logWear(tag, o.itemIds.filter((i) => byId.get(i)?.status !== "wish"), o.id)}>
                      <span className="day-outfit-board"><Collage items={ordne(o.itemIds.map((i) => byId.get(i)).filter(Boolean) as Item[])} compact /></span>
                      <span className="day-outfit-name"><Plus size={13} /> {o.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Sheet>
  );
}
