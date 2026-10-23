// Datumshilfen. Tage werden als lokale Strings "YYYY-MM-DD" gespeichert.

export function isoDay(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const t = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${t}`;
}

export function parseDay(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(s: string, n: number): string {
  const d = parseDay(s);
  d.setDate(d.getDate() + n);
  return isoDay(d);
}

/** Ganze Tage von a bis b (b − a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((parseDay(b).getTime() - parseDay(a).getTime()) / 86_400_000);
}

export function relativeDay(day: string | null, today = isoDay()): string {
  if (!day) return "noch nie";
  const n = daysBetween(day, today);
  if (n <= 0) return n === 0 ? "heute" : "geplant";
  if (n === 1) return "gestern";
  if (n < 7) return `vor ${n} Tagen`;
  if (n < 14) return "vor einer Woche";
  if (n < 31) return `vor ${Math.floor(n / 7)} Wochen`;
  if (n < 60) return "vor einem Monat";
  if (n < 365) return `vor ${Math.floor(n / 30)} Monaten`;
  return n < 730 ? "vor über einem Jahr" : `vor ${Math.floor(n / 365)} Jahren`;
}

const FMT_LANG = new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "long", year: "numeric" });
const FMT_KURZ = new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "short" });
const FMT_WOCHENTAG = new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "numeric", month: "long" });
const FMT_MONAT = new Intl.DateTimeFormat("de-DE", { month: "long", year: "numeric" });

export const formatDay = (s: string) => FMT_LANG.format(parseDay(s));
export const formatDayShort = (s: string) => FMT_KURZ.format(parseDay(s));
export const formatWeekday = (s: string) => FMT_WOCHENTAG.format(parseDay(s));
export const formatMonth = (d: Date) => FMT_MONAT.format(d);

export function currentSeason(d = new Date()): "Frühling" | "Sommer" | "Herbst" | "Winter" {
  const m = d.getMonth();
  if (m >= 2 && m <= 4) return "Frühling";
  if (m >= 5 && m <= 7) return "Sommer";
  if (m >= 8 && m <= 10) return "Herbst";
  return "Winter";
}

export function euro(v: number | null | undefined, digits = 0): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "–";
  return v.toLocaleString("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits === 0 && v % 1 !== 0 ? 2 : digits,
  });
}
