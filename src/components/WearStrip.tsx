// Tragekalender der letzten 26 Wochen als feines Raster (wie ein Aktivitätsdiagramm).
import { motion } from "framer-motion";
import { addDays, formatDayShort, isoDay, parseDay } from "../lib/dates";

export function WearStrip({ dates, weeks = 26 }: { dates: string[]; weeks?: number }) {
  const set = new Set(dates);
  const heute = isoDay();
  // Start am Montag vor (weeks) Wochen
  const wd = (parseDay(heute).getDay() + 6) % 7;
  const start = addDays(heute, -wd - (weeks - 1) * 7);
  const spalten: string[][] = [];
  for (let w = 0; w < weeks; w++) {
    const s: string[] = [];
    for (let d = 0; d < 7; d++) s.push(addDays(start, w * 7 + d));
    spalten.push(s);
  }
  const monate: { label: string; col: number }[] = [];
  spalten.forEach((s, i) => {
    const m = s[0].slice(5, 7);
    if (i === 0 || m !== spalten[i - 1][0].slice(5, 7)) {
      monate.push({ label: new Intl.DateTimeFormat("de-DE", { month: "short" }).format(parseDay(s[0])), col: i });
    }
  });

  return (
    <div className="strip" role="img" aria-label={`${dates.length} Tragetage, letzte ${weeks} Wochen`}>
      <div className="strip-months" style={{ gridTemplateColumns: `repeat(${weeks}, 1fr)` }}>
        {monate.map((m) => (
          <span key={m.col} style={{ gridColumn: `${m.col + 1} / span 4` }}>
            {m.label}
          </span>
        ))}
      </div>
      <div className="strip-grid" style={{ gridTemplateColumns: `repeat(${weeks}, 1fr)` }}>
        {spalten.map((s, i) => (
          <div key={i} className="strip-col">
            {s.map((d) => (
              <motion.span
                key={d}
                className={`strip-cell ${set.has(d) ? "is-on" : ""} ${d > heute ? "is-future" : ""}`}
                title={set.has(d) ? `Getragen am ${formatDayShort(d)}` : formatDayShort(d)}
                initial={set.has(d) ? { scale: 0 } : false}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2 + i * 0.015, type: "spring", stiffness: 400, damping: 20 }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
