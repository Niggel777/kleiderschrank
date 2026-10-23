// Outfit-Generator: kombiniert Teile nach Farbharmonie, Wetter, Anlass und
// danach, wie lange ein Teil nicht mehr getragen wurde.
import { hueSat, PALETTE_BY_NAME, type PaletteColor } from "./colors";
import { currentSeason, isoDay } from "./dates";
import type { CategoryKey, Item, Occasion, Season } from "./model";
import { idleDays, statOf, type WearIndex } from "./stats";

export interface Harmony {
  score: number;
  label: string;
}

const GRAU = PALETTE_BY_NAME["Grau"];

function primary(item: Item): PaletteColor {
  return PALETTE_BY_NAME[item.colors[0]?.name ?? ""] ?? GRAU;
}

function hueDiff(a: PaletteColor, b: PaletteColor): number {
  const d = Math.abs(hueSat(a.hex).h - hueSat(b.hex).h) % 360;
  return d > 180 ? 360 - d : d;
}

const IST_DENIM = (i: Item) =>
  i.colors[0]?.name === "Denim" || i.sub === "Jeans" || i.sub === "Jeansjacke";

/** Wie gut passen die Farben dieser Teile zusammen (0–1) und warum. */
export function harmony(items: Item[]): Harmony {
  const ohneGuertel = items.filter((i) => i.sub !== "Gürtel");
  if (ohneGuertel.length >= 2 && ohneGuertel.length < items.length) {
    const h = harmony(ohneGuertel);
    const g = items.find((i) => i.sub === "Gürtel")!;
    const schuh = items.find((i) => i.category === "schuhe");
    return schuh && passtLeder(g, schuh) ? { score: Math.min(1, h.score + 0.03), label: `${h.label} · Gürtel passt zu den Schuhen` } : h;
  }
  if (items.length <= 1) return { score: 1, label: "Einzelteil" };
  const prim = items.map(primary);
  const families = new Set(prim.map((p) => p.family));
  const accents: PaletteColor[] = [];
  for (const p of prim) if (!p.neutral && !accents.some((a) => a.family === p.family)) accents.push(p);

  let score: number;
  let label: string;
  if (families.size === 1 && items.length >= 2) {
    score = 0.92;
    label = `Ton in Ton · ${prim[0].name}`;
  } else if (accents.length === 0) {
    score = 0.82;
    label = "Neutral & ruhig";
  } else if (accents.length === 1) {
    score = 0.95;
    label = `Neutral mit Akzent in ${accents[0].name}`;
  } else if (accents.length === 2) {
    const d = hueDiff(accents[0], accents[1]);
    if (d <= 40) {
      score = 0.86;
      label = `Analog · ${accents[0].name} & ${accents[1].name}`;
    } else if (d >= 150) {
      score = 0.8;
      label = `Komplementär · ${accents[0].name} × ${accents[1].name}`;
    } else if (d >= 100) {
      score = 0.6;
      label = `Kontrast · ${accents[0].name} & ${accents[1].name}`;
    } else {
      score = 0.42;
      label = `Mutig · ${accents[0].name} & ${accents[1].name}`;
    }
  } else {
    let maxD = 0;
    for (let i = 0; i < accents.length; i++)
      for (let j = i + 1; j < accents.length; j++) maxD = Math.max(maxD, hueDiff(accents[i], accents[j]));
    score = maxD <= 50 ? 0.74 : 0.3;
    label = maxD <= 50 ? "Analoge Farbfamilie" : "Viele Farben";
  }

  if (items.filter((i) => i.pattern).length >= 2) {
    score -= 0.3;
    label += " · zwei Muster";
  }
  if (items.filter(IST_DENIM).length >= 2) score -= 0.12;
  return { score: Math.max(0, Math.min(1, score)), label };
}

export interface OutfitContext {
  occasion: Occasion | null;
  /** Temperatur in °C, falls bekannt */
  temp: number | null;
  season?: Season;
  lockedIds: string[];
  /** Schrankhüter bevorzugen */
  preferIdle: boolean;
  includeWish: boolean;
}

export interface Suggestion {
  key: string;
  items: Item[];
  score: number;
  harmony: Harmony;
}

const GUERTEL_HOSEN = new Set(["Jeans", "Chino", "Stoffhose", "Anzughose", "Cargohose"]);

/** Gürtel und Schuhe im gleichen Ton (Braun zu Braun, Schwarz zu Schwarz) wirken stimmig. */
function passtLeder(g: Item, schuh: Item): boolean {
  const f = (i: Item) => PALETTE_BY_NAME[i.colors[0]?.name ?? ""]?.family;
  return f(g) === f(schuh) || (f(g) === "braun" && f(schuh) === "beige");
}

const WARM = new Set(["Pullover", "Strickjacke", "Hoodie", "Sweatshirt", "Mantel", "Daunenjacke", "Stiefel", "Boots", "Schal", "Mütze"]);
const LUFTIG = new Set(["Shorts", "Sandalen", "Top", "Minikleid"]);

function seasonFromTemp(temp: number | null, fallback: Season): Season {
  if (temp === null) return fallback;
  if (temp < 8) return "Winter";
  if (temp > 21) return "Sommer";
  return fallback === "Sommer" || fallback === "Winter" ? "Herbst" : fallback;
}

function passt(item: Item, ctx: OutfitContext, season: Season): boolean {
  if (ctx.lockedIds.includes(item.id)) return true;
  if (item.status === "sold" || item.status === "selling" || item.inWaesche) return false;
  if (item.status === "wish" && !ctx.includeWish) return false;
  if (item.seasons.length && !item.seasons.includes(season)) return false;
  if (ctx.temp !== null) {
    if (ctx.temp >= 23 && WARM.has(item.sub)) return false;
    if (ctx.temp <= 13 && LUFTIG.has(item.sub)) return false;
  }
  return true;
}

function jackeNoetig(ctx: OutfitContext, season: Season, rand: () => number): boolean {
  if (ctx.temp !== null) {
    if (ctx.temp < 12) return true;
    if (ctx.temp < 18) return rand() < 0.55;
    return (ctx.occasion === "Büro" || ctx.occasion === "Festlich") && rand() < 0.4;
  }
  if (season === "Winter") return true;
  if (season === "Sommer") return false;
  return rand() < 0.6;
}

function weighted<T>(list: T[], weight: (t: T) => number, rand: () => number): T {
  const w = list.map(weight);
  const sum = w.reduce((a, b) => a + b, 0);
  let r = rand() * sum;
  for (let i = 0; i < list.length; i++) {
    r -= w[i];
    if (r <= 0) return list[i];
  }
  return list[list.length - 1];
}

/** Erzeugt mehrere unterschiedliche Outfit-Vorschläge. */
export function generateOutfits(
  all: Item[],
  idx: WearIndex,
  ctx: OutfitContext,
  count = 6,
  rand: () => number = Math.random,
): Suggestion[] {
  const today = isoDay();
  const season = seasonFromTemp(ctx.temp, ctx.season ?? currentSeason());
  const pool = all.filter((i) => passt(i, ctx, season));

  const byCat = (cat: CategoryKey) => {
    const list = pool.filter((i) => i.category === cat);
    if (!ctx.occasion) return list;
    const passend = list.filter((i) => !i.occasions.length || i.occasions.includes(ctx.occasion!));
    return passend.length ? passend : list;
  };
  const locked = all.filter((i) => ctx.lockedIds.includes(i.id));
  const lockedCat = new Map(locked.map((i) => [i.category, i]));

  const cats = {
    oberteile: byCat("oberteile"),
    unterteile: byCat("unterteile"),
    kleider: byCat("kleider"),
    jacken: byCat("jacken"),
    schuhe: byCat("schuhe"),
    accessoires: byCat("accessoires").filter((i) => i.sub !== "Gürtel"),
  };
  const guertel = pool.filter((i) => i.sub === "Gürtel");
  const lockedGuertel = locked.find((i) => i.sub === "Gürtel");

  const frische = (i: Item) => Math.min(1, idleDays(i, statOf(idx, i.id), today) / 45);
  const gewicht = (i: Item) => (ctx.preferIdle ? 0.3 + frische(i) * 3 : 0.6 + frische(i));
  const occasionFit = (i: Item) => (!ctx.occasion || !i.occasions.length ? 0.6 : i.occasions.includes(ctx.occasion) ? 1 : 0.2);

  const kannSeparates = (cats.oberteile.length || lockedCat.has("oberteile")) && (cats.unterteile.length || lockedCat.has("unterteile"));
  const kannKleid = cats.kleider.length > 0 || lockedCat.has("kleider");
  if (!kannSeparates && !kannKleid) return [];

  const gesehen = new Map<string, Suggestion>();
  for (let n = 0; n < 500; n++) {
    const wahl: Item[] = [];
    const nimm = (cat: CategoryKey) => {
      const l = lockedCat.get(cat);
      if (l && l.sub === "Gürtel" && cat === "accessoires") return;
      if (l) return wahl.push(l);
      if (cats[cat].length) wahl.push(weighted(cats[cat], gewicht, rand));
    };
    const kleid =
      lockedCat.has("kleider") ||
      (!lockedCat.has("oberteile") && !lockedCat.has("unterteile") && kannKleid && (!kannSeparates || rand() < 0.25));
    if (kleid) nimm("kleider");
    else {
      nimm("oberteile");
      nimm("unterteile");
    }
    if (lockedCat.has("jacken") || jackeNoetig(ctx, season, rand)) nimm("jacken");
    nimm("schuhe");
    // Gürtel zu Hosen mit Gürtelschlaufen, farblich passend zu den Schuhen
    const hose = wahl.find((i) => i.category === "unterteile");
    if (lockedGuertel) wahl.push(lockedGuertel);
    else if (hose && GUERTEL_HOSEN.has(hose.sub) && guertel.length && rand() < 0.6) {
      const schuh = wahl.find((i) => i.category === "schuhe");
      wahl.push(weighted(guertel, (g) => (schuh && passtLeder(g, schuh) ? 3 : 0.6), rand));
    }
    if ((lockedCat.has("accessoires") && lockedCat.get("accessoires")!.sub !== "Gürtel") || rand() < 0.35) nimm("accessoires");
    if (wahl.length < 2) continue;

    const key = wahl.map((i) => i.id).sort().join("|");
    if (gesehen.has(key)) continue;
    const h = harmony(wahl);
    const fr = wahl.reduce((s, i) => s + frische(i), 0) / wahl.length;
    const occ = wahl.reduce((s, i) => s + occasionFit(i), 0) / wahl.length;
    const score = h.score * 0.55 + stilEinheit(wahl) * 0.14 + fr * (ctx.preferIdle ? 0.3 : 0.16) + occ * 0.12 + rand() * 0.05;
    gesehen.set(key, { key, items: wahl, score, harmony: h });
  }

  // Beste Vorschläge wählen, dabei Wiederholungen derselben Teile begrenzen
  const sortiert = [...gesehen.values()].sort((a, b) => b.score - a.score);
  const ergebnis: Suggestion[] = [];
  const benutzt = new Map<string, number>();
  for (const s of sortiert) {
    if (ergebnis.length >= count) break;
    const frei = s.items.filter((i) => !ctx.lockedIds.includes(i.id));
    const wiederholt = frei.filter((i) => (benutzt.get(i.id) ?? 0) >= 1).length;
    if (wiederholt > Math.max(0, Math.floor(frei.length / 2) - 0)) continue;
    ergebnis.push(s);
    for (const i of frei) benutzt.set(i.id, (benutzt.get(i.id) ?? 0) + 1);
  }
  for (const s of sortiert) {
    if (ergebnis.length >= count) break;
    if (!ergebnis.includes(s)) ergebnis.push(s);
  }
  return ergebnis.map((s) => ({ ...s, items: ordne(s.items) }));
}

/** Anteil der Teilepaare mit gemeinsamem Anlass (Sakko + Laufschuhe passt schlecht). */
export function stilEinheit(items: Item[]): number {
  const mit = items.filter((i) => i.occasions.length);
  let paare = 0, passend = 0;
  for (let a = 0; a < mit.length; a++)
    for (let b = a + 1; b < mit.length; b++) {
      paare++;
      if (mit[a].occasions.some((o) => mit[b].occasions.includes(o))) passend++;
    }
  return paare ? passend / paare : 0.7;
}

const REIHENFOLGE: CategoryKey[] = ["jacken", "oberteile", "kleider", "unterteile", "schuhe", "accessoires"];

export function ordne(items: Item[]): Item[] {
  return [...items].sort((a, b) => REIHENFOLGE.indexOf(a.category) - REIHENFOLGE.indexOf(b.category));
}

/** Teile aus anderen Kategorien, die farblich gut zu einem Teil passen. */
export function passendZu(item: Item, all: Item[], n = 8): Item[] {
  return all
    .filter((i) => i.id !== item.id && i.category !== item.category && i.status !== "sold" && i.status !== "wish")
    .map((i) => ({ i, s: harmony([item, i]).score + (i.favorite ? 0.03 : 0) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, n)
    .map((e) => e.i);
}
