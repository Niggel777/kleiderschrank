// Tragestatistik: wie oft, wann zuletzt, Kosten pro Tragen, Schrankhüter.
import { daysBetween, isoDay } from "./dates";
import { sizeRank, type Item, type Wear } from "./model";
import { PALETTE_BY_NAME } from "./colors";

export interface WearStat {
  count: number;
  last: string | null;
  first: string | null;
  dates: string[];
}

export type WearIndex = Map<string, WearStat>;

export function wearIndex(wears: Wear[]): WearIndex {
  const idx: WearIndex = new Map();
  for (const w of wears) {
    for (const id of w.itemIds) {
      let s = idx.get(id);
      if (!s) {
        s = { count: 0, last: null, first: null, dates: [] };
        idx.set(id, s);
      }
      s.count++;
      s.dates.push(w.date);
      if (!s.last || w.date > s.last) s.last = w.date;
      if (!s.first || w.date < s.first) s.first = w.date;
    }
  }
  for (const s of idx.values()) s.dates.sort().reverse();
  return idx;
}

export const EMPTY_STAT: WearStat = { count: 0, last: null, first: null, dates: [] };

export function statOf(idx: WearIndex, id: string): WearStat {
  return idx.get(id) ?? EMPTY_STAT;
}

/** Tage seit dem letzten Tragen; nie getragen zählt ab dem Hinzufügen. */
export function idleDays(item: Item, s: WearStat, today = isoDay()): number {
  const since = s.last ?? isoDay(new Date(item.createdAt));
  return Math.max(0, daysBetween(since, today));
}

/** Mit wie vielen verschiedenen Teilen wurde ein Teil schon kombiniert? */
export function kombiPartner(wears: Wear[]): Map<string, Set<string>> {
  const m = new Map<string, Set<string>>();
  for (const w of wears)
    for (const a of w.itemIds) {
      let s = m.get(a);
      if (!s) m.set(a, (s = new Set()));
      for (const b of w.itemIds) if (b !== a) s.add(b);
    }
  return m;
}

export type SortKey = "neu" | "lange-nicht" | "meistgetragen" | "selten" | "groesse" | "farbe" | "name";

export const SORT_LABEL: Record<SortKey, string> = {
  neu: "Neu hinzugefügt",
  "lange-nicht": "Lange nicht getragen",
  meistgetragen: "Meistgetragen",
  selten: "Selten getragen",
  groesse: "Größe",
  farbe: "Farbe",
  name: "Name A–Z",
};

const PALETTE_ORDER = Object.keys(PALETTE_BY_NAME);

export function sortItems(items: Item[], key: SortKey, idx: WearIndex): Item[] {
  const a = [...items];
  const today = isoDay();
  switch (key) {
    case "neu":
      return a.sort((x, y) => y.createdAt - x.createdAt);
    case "lange-nicht":
      return a.sort((x, y) => idleDays(y, statOf(idx, y.id), today) - idleDays(x, statOf(idx, x.id), today));
    case "meistgetragen":
      return a.sort((x, y) => statOf(idx, y.id).count - statOf(idx, x.id).count);
    case "selten":
      return a.sort((x, y) => statOf(idx, x.id).count - statOf(idx, y.id).count);
    case "groesse":
      return a.sort((x, y) => sizeRank(x.size) - sizeRank(y.size));
    case "farbe":
      return a.sort(
        (x, y) =>
          PALETTE_ORDER.indexOf(x.colors[0]?.name ?? "") - PALETTE_ORDER.indexOf(y.colors[0]?.name ?? ""),
      );
    case "name":
      return a.sort((x, y) => (x.brand + x.name).localeCompare(y.brand + y.name, "de"));
    default:
      return a.sort((x, y) => y.createdAt - x.createdAt);
  }
}
