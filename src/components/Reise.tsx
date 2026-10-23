// Koffer packen: Outfits pro Reisetag (nach Wettervorhersage) und daraus eine Packliste,
// die möglichst wenige Teile möglichst oft kombiniert.
import { AnimatePresence, motion } from "framer-motion";
import { Check, Luggage, MapPin, RotateCcw, Search } from "lucide-react";
import { useState } from "react";
import { addDays, formatDayShort, isoDay } from "../lib/dates";
import { useLocal } from "../lib/hooks";
import { CATEGORIES, OCCASIONS, displayName, type Item, type Occasion } from "../lib/model";
import { generateOutfits } from "../lib/outfits";
import { useGarderobe } from "../lib/store";
import { ladeVorhersage, sucheOrt, wetterText, type Ort, type Wetter } from "../lib/wetter";
import { Collage } from "./Collage";
import { GarmentImage } from "./Garment";
import { Button, Chip, Field } from "./ui";

interface Plan {
  ort: Ort | null;
  start: string;
  tage: { datum: string; wetter: Wetter | null; itemIds: string[] }[];
  gepackt: string[];
}

export function Reise() {
  const { items, idx, byId } = useGarderobe();
  const [plan, setPlan] = useLocal<Plan | null>("garderobe.reise", null);
  const [ortText, setOrtText] = useState("");
  const [treffer, setTreffer] = useState<Ort[]>([]);
  const [ort, setOrt] = useState<Ort | null>(null);
  const [start, setStart] = useState(addDays(isoDay(), 1));
  const [dauer, setDauer] = useState(4);
  const [anlass, setAnlass] = useState<Occasion | null>(null);
  const [laedt, setLaedt] = useState(false);

  async function erstellen() {
    setLaedt(true);
    let wetter: (Wetter | null)[] = Array(dauer).fill(null);
    if (ort) wetter = await ladeVorhersage(ort, start, dauer).catch(() => wetter);
    const gepackt = new Set<string>();
    const tage: Plan["tage"] = [];
    for (let i = 0; i < dauer; i++) {
      const w = wetter[i];
      const vorschlaege = generateOutfits(items, idx, { occasion: anlass, temp: w?.temp ?? null, lockedIds: [], preferIdle: false, includeWish: false }, 8);
      // Bevorzugt Outfits, die schon gepackte Teile wiederverwenden – aber nicht zweimal dasselbe Oberteil hintereinander
      const vortag = new Set(tage[i - 1]?.itemIds ?? []);
      const best = [...vorschlaege].sort((a, b) => wertung(b) - wertung(a))[0];
      function wertung(s: (typeof vorschlaege)[number]) {
        const wieder = s.items.filter((it) => gepackt.has(it.id)).length / s.items.length;
        const oberteilWieder = s.items.some((it) => it.category === "oberteile" && vortag.has(it.id));
        return s.harmony.score * 0.5 + wieder * 0.6 - (oberteilWieder ? 0.4 : 0);
      }
      if (!best) continue;
      best.items.forEach((it) => gepackt.add(it.id));
      tage.push({ datum: addDays(start, i), wetter: w, itemIds: best.items.map((it) => it.id) });
    }
    setPlan({ ort, start, tage, gepackt: [] });
    setLaedt(false);
  }

  if (plan) {
    const alle = [...new Set(plan.tage.flatMap((t) => t.itemIds))].map((id) => byId.get(id)).filter(Boolean) as Item[];
    const fertig = plan.gepackt.filter((id) => alle.some((i) => i.id === id)).length;
    const toggle = (id: string) => setPlan({ ...plan, gepackt: plan.gepackt.includes(id) ? plan.gepackt.filter((x) => x !== id) : [...plan.gepackt, id] });
    return (
      <div className="reise">
        <div className="reise-head">
          <div>
            <div className="eyebrow">{plan.ort ? plan.ort.name.split(",")[0] : "Reise"} · {plan.tage.length} Tage ab {formatDayShort(plan.start)}</div>
            <h2 className="display reise-title">{alle.length} Teile, {plan.tage.length} <em>Outfits.</em></h2>
          </div>
          <Button variant="ghost" icon={<RotateCcw size={16} />} onClick={() => setPlan(null)}>Neue Reise</Button>
        </div>
        <div className="pack-progress">
          <motion.span initial={{ width: 0 }} animate={{ width: `${(fertig / Math.max(1, alle.length)) * 100}%` }} transition={{ type: "spring", stiffness: 120, damping: 20 }} />
        </div>
        <p className="muted pack-count tabular">{fertig} von {alle.length} gepackt</p>

        <div className="reise-grid">
          <section className="pack-list">
            {CATEGORIES.map((c) => {
              const liste = alle.filter((i) => i.category === c.key);
              if (!liste.length) return null;
              return (
                <div key={c.key} className="pack-group">
                  <h3 className="eyebrow">{c.label}</h3>
                  {liste.map((i) => {
                    const an = plan.gepackt.includes(i.id);
                    const n = plan.tage.filter((t) => t.itemIds.includes(i.id)).length;
                    return (
                      <button key={i.id} className={`pack-item ${an ? "is-on" : ""}`} onClick={() => toggle(i.id)}>
                        <span className="pack-check">{an && <Check size={13} strokeWidth={3} />}</span>
                        <span className="pack-thumb"><GarmentImage item={i} /></span>
                        <span className="pack-name">{displayName(i)}</span>
                        <span className="muted tabular">{n}×</span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </section>
          <section className="reise-tage">
            {plan.tage.map((t, n) => (
              <motion.div key={t.datum} className="reise-tag" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: n * 0.06 }}>
                <div className="reise-tag-head">
                  <strong>{new Intl.DateTimeFormat("de-DE", { weekday: "short", day: "numeric", month: "short" }).format(new Date(t.datum))}</strong>
                  <span className="muted">{t.wetter ? `${t.wetter.min}–${t.wetter.max}° · ${wetterText(t.wetter.code)}` : "kein Wetter"}</span>
                </div>
                <div className="reise-board">
                  <Collage items={t.itemIds.map((id) => byId.get(id)).filter(Boolean) as Item[]} compact />
                </div>
              </motion.div>
            ))}
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="reise-form">
      <div className="reise-intro">
        <span className="reise-icon"><Luggage size={26} strokeWidth={1.5} /></span>
        <h2 className="display reise-title">Koffer <em>packen.</em></h2>
        <p className="muted">Ziel und Reisetage eingeben – die App plant ein Outfit pro Tag nach der Wettervorhersage und kombiniert so, dass möglichst wenige Teile in den Koffer müssen.</p>
      </div>
      <Field label="Reiseziel">
        <form
          className="search"
          onSubmit={async (e) => {
            e.preventDefault();
            if (ortText.trim()) setTreffer(await sucheOrt(ortText.trim()).catch(() => []));
          }}
        >
          <Search size={16} />
          <input placeholder="Stadt, z. B. Barcelona" value={ort ? ort.name : ortText} onChange={(e) => { setOrt(null); setOrtText(e.target.value); }} />
        </form>
      </Field>
      <AnimatePresence>
        {treffer.length > 0 && !ort && (
          <motion.div className="option-list" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            {treffer.map((o) => (
              <button key={`${o.lat},${o.lon}`} className="option" onClick={() => { setOrt(o); setTreffer([]); }}>
                <span className="row-gap"><MapPin size={15} /> {o.name}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      <div className="two-col">
        <Field label="Abreise">
          <input type="date" value={start} min={isoDay()} onChange={(e) => e.target.value && setStart(e.target.value)} />
        </Field>
        <Field label={`Dauer: ${dauer} ${dauer === 1 ? "Tag" : "Tage"}`}>
          <input className="range" type="range" min={1} max={14} value={dauer} onChange={(e) => setDauer(+e.target.value)} />
        </Field>
      </div>
      <div className="chip-wrap">
        <Chip on={anlass === null} onClick={() => setAnlass(null)}>Gemischt</Chip>
        {OCCASIONS.map((o) => (
          <Chip key={o} on={anlass === o} onClick={() => setAnlass(o)}>{o}</Chip>
        ))}
      </div>
      <Button variant="primary" size="l" icon={<Luggage size={18} />} disabled={laedt || !items.length} onClick={erstellen}>
        {laedt ? "Plane …" : "Packliste erstellen"}
      </Button>
      {!ort && <p className="muted reise-note">Ohne Ziel wird nach der Jahreszeit geplant. Wetter gibt es bis 16 Tage im Voraus.</p>}
    </div>
  );
}
