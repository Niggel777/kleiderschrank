// Startseite: Outfit des Tages, Serie, Wiederentdecken, Schnellzugriffe.
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, CloudSun, Luggage, PersonStanding, Plus, Share2, Shuffle, Sparkles, WashingMachine } from "lucide-react";
import { teileOutfit } from "../lib/teilen";
import { useMemo, useState } from "react";
import { Collage } from "../components/Collage";
import { GarmentImage } from "../components/Garment";
import { CountUp, konfetti } from "../components/Motion";
import { OrtSheet } from "../components/OrtSheet";
import { useToast } from "../components/Toast";
import { Button } from "../components/ui";
import { logWear } from "../lib/db";
import { addDays, formatWeekday, isoDay } from "../lib/dates";
import { displayName, type Item } from "../lib/model";
import { generateOutfits, harmony, ordne } from "../lib/outfits";
import { go } from "../lib/router";
import { idleDays, statOf } from "../lib/stats";
import { useGarderobe } from "../lib/store";
import { useWetter, wetterText } from "../lib/wetter";

function gruss(): string {
  const h = new Date().getHours();
  if (h < 5) return "Gute Nacht";
  if (h < 11) return "Guten Morgen";
  if (h < 17) return "Hallo";
  if (h < 22) return "Guten Abend";
  return "Gute Nacht";
}

/** Zufall, der über den Tag gleich bleibt (gleicher Vorschlag beim erneuten Öffnen). */
function tagesZufall(tag: string, runde: number) {
  let s = [...`${tag}-${runde}`].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 2147483647, 7) || 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function Heute() {
  const { items, schrank, idx, wears, byId, bereit } = useGarderobe();
  const { ort, wetter } = useWetter();
  const toast = useToast();
  const [runde, setRunde] = useState(0);
  const [ortOffen, setOrtOffen] = useState(false);
  const heute = isoDay();

  const heuteGetragen = useMemo(
    () => ordne(wears.filter((w) => w.date === heute).flatMap((w) => w.itemIds).map((i) => byId.get(i)).filter(Boolean) as Item[]),
    [wears, heute, byId],
  );

  const temp = wetter ? Math.round((wetter.temp + wetter.max) / 2) : null;
  const vorschlag = useMemo(
    () => generateOutfits(items, idx, { occasion: null, temp, lockedIds: [], preferIdle: false, includeWish: false }, 1, tagesZufall(heute, runde))[0],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items.length, temp, runde, heute],
  );

  const serie = useMemo(() => {
    const tage = new Set(wears.map((w) => w.date));
    let n = 0;
    let d = tage.has(heute) ? heute : addDays(heute, -1);
    while (tage.has(d)) {
      n++;
      d = addDays(d, -1);
    }
    const woche = Array.from({ length: 7 }, (_, i) => addDays(heute, i - 6)).map((t) => ({ t, an: tage.has(t) }));
    return { n, woche };
  }, [wears, heute]);

  const wiederentdecken = useMemo(() => {
    const kandidaten = schrank.filter((i) => i.status === "owned" && !i.inWaesche && idleDays(i, statOf(idx, i.id)) >= 45);
    if (!kandidaten.length) return null;
    return kandidaten[tagesZufall(heute, 99)() * kandidaten.length | 0];
  }, [schrank, idx, heute]);

  const inWaesche = schrank.filter((i) => i.inWaesche).length;

  if (bereit && !items.length) {
    go("schrank", true);
    return null;
  }

  async function anziehen(teile: Item[]) {
    await logWear(heute, teile.map((i) => i.id));
    toast("Heute eingetragen – viel Spaß!");
    konfetti();
  }

  const h = vorschlag ? harmony(vorschlag.items) : null;

  return (
    <div className="heute">
      <div className="aurora" aria-hidden>
        <span className="aurora-a" />
        <span className="aurora-b" />
        <span className="aurora-c" />
      </div>
      <div className="wrap">
        <header className="heute-head">
          <motion.div className="eyebrow" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
            {formatWeekday(heute)}
          </motion.div>
          <motion.h1 className="display heute-title" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
            {gruss()}<em>.</em>
          </motion.h1>
          <motion.button className="weather-chip big" onClick={() => setOrtOffen(true)} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <CloudSun size={18} strokeWidth={1.6} />
            {wetter && ort ? (
              <span>
                <strong className="tabular">{wetter.temp}°</strong> {wetterText(wetter.code)} · bis {wetter.max}° · {ort.name.split(",")[0]}
              </span>
            ) : (
              <span>Wetter einbeziehen</span>
            )}
          </motion.button>
        </header>

        <section className="ootd">
          <div className="ootd-board">
            <AnimatePresence mode="wait">
              <motion.div key={heuteGetragen.length ? "heute" : vorschlag?.key ?? "leer"} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.35 }}>
                {heuteGetragen.length ? <Collage items={heuteGetragen} /> : vorschlag ? <Collage items={vorschlag.items} animateKey={vorschlag.key} /> : null}
              </motion.div>
            </AnimatePresence>
            {heuteGetragen.length > 0 && (
              <span className="ootd-stamp">
                <Check size={14} strokeWidth={3} /> Heute getragen
              </span>
            )}
          </div>
          <div className="ootd-side">
            <div className="eyebrow">{heuteGetragen.length ? "Dein Look heute" : "Outfit des Tages"}</div>
            <h2 className="display ootd-title">{heuteGetragen.length ? <>Gut <em>angezogen.</em></> : <>Was ziehst du <em>heute</em> an?</>}</h2>
            {!heuteGetragen.length && h && <p className="muted ootd-sub">{h.label}{temp !== null ? ` · passend zu ${temp}°` : ""}</p>}
            <ul className="ootd-list">
              {(heuteGetragen.length ? heuteGetragen : vorschlag?.items ?? []).map((i, n) => (
                <motion.li key={i.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + n * 0.05 }}>
                  <a href={`#/teil/${i.id}`}>
                    <span className="ootd-thumb"><GarmentImage item={i} /></span>
                    <span>{displayName(i)}</span>
                  </a>
                </motion.li>
              ))}
            </ul>
            {!heuteGetragen.length && vorschlag && (
              <div className="ootd-actions">
                <Button variant="primary" size="l" icon={<Check size={18} />} onClick={() => anziehen(vorschlag.items)}>
                  Das ziehe ich an
                </Button>
                <Button size="l" icon={<Shuffle size={18} />} onClick={() => setRunde(runde + 1)}>
                  Anderes
                </Button>
                <Button size="l" variant="ghost" icon={<Sparkles size={18} />} onClick={() => go("outfits?tab=swipe")}>
                  Swipen
                </Button>
              </div>
            )}
            {heuteGetragen.length > 0 && (
              <div className="ootd-actions">
                <Button size="l" icon={<PersonStanding size={18} />} onClick={() => go(`umkleide?ids=${heuteGetragen.map((i) => i.id).join(",")}`)}>
                  In der Umkleide
                </Button>
                <Button size="l" icon={<Share2 size={18} />} onClick={async () => toast((await teileOutfit(heuteGetragen, "Mein Look heute", harmony(heuteGetragen).label)) === "geteilt" ? "Geteilt" : "Story-Bild gespeichert")}>
                  Teilen
                </Button>
                <Button size="l" variant="ghost" icon={<Plus size={18} />} onClick={() => go("kalender")}>
                  Ergänzen
                </Button>
              </div>
            )}
          </div>
        </section>

        <div className="heute-grid">
          <motion.section className="panel streak" initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
            <div className="eyebrow">Serie</div>
            <div className="streak-n display">
              <CountUp wert={serie.n} />
              <span>{serie.n === 1 ? "Tag" : "Tage"} in Folge</span>
            </div>
            <div className="streak-week">
              {serie.woche.map(({ t, an }, i) => (
                <motion.span key={t} className={`streak-dot ${an ? "is-on" : ""} ${t === heute ? "is-today" : ""}`} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3 + i * 0.05, type: "spring", stiffness: 400, damping: 18 }}>
                  {new Intl.DateTimeFormat("de-DE", { weekday: "narrow" }).format(new Date(t))}
                </motion.span>
              ))}
            </div>
          </motion.section>

          {wiederentdecken && (
            <motion.section className="panel rediscover" initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.05 }}>
              <div className="eyebrow">Wiederentdecken</div>
              <a href={`#/teil/${wiederentdecken.id}`} className="rediscover-main">
                <span className="rediscover-img"><GarmentImage item={wiederentdecken} /></span>
                <span>
                  <strong>{displayName(wiederentdecken)}</strong>
                  <span className="muted">seit {idleDays(wiederentdecken, statOf(idx, wiederentdecken.id))} Tagen nicht getragen</span>
                </span>
              </a>
              <Button size="s" icon={<ArrowRight size={14} />} onClick={() => go(`outfits?lock=${wiederentdecken.id}`)}>
                Outfit damit
              </Button>
            </motion.section>
          )}

          <motion.section className="panel quick" initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.1 }}>
            <div className="eyebrow">Schnell</div>
            <a href="#/neu" className="quick-link"><Plus size={18} /> Teil hinzufügen</a>
            <a href="#/outfits?tab=reise" className="quick-link"><Luggage size={18} /> Koffer packen</a>
            <a href="#/schrank?waesche=1" className="quick-link"><WashingMachine size={18} /> Wäsche {inWaesche > 0 && <span className="quick-count">{inWaesche}</span>}</a>
            <a href="#/umkleide" className="quick-link"><PersonStanding size={18} /> Umkleide</a>
          </motion.section>
        </div>
      </div>
      <OrtSheet open={ortOffen} onClose={() => setOrtOffen(false)} />
    </div>
  );
}
