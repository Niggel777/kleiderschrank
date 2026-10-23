// Beispiel-Schrank: generierte Teile, Tragehistorie der letzten Monate und Outfits.
import { PALETTE_BY_NAME } from "../lib/colors";
import { db, putImage } from "../lib/db";
import { addDays, isoDay } from "../lib/dates";
import { makeThumb } from "../lib/image";
import { emptyItem, newId, type CategoryKey, type ColorTag, type Item, type Occasion, type Season, type Status, type Wear } from "../lib/model";
import { generateOutfits } from "../lib/outfits";
import { wearIndex } from "../lib/stats";
import { forgetImage } from "../lib/store";
import { garmentSvg, svgToPng, type Form } from "./garments";

interface Vorlage {
  name: string;
  brand: string;
  cat: CategoryKey;
  sub: string;
  form: Form;
  farbe: string;
  zweit?: string;
  size: string;
  price: number;
  seasons?: Season[];
  occ?: Occasion[];
  material?: string;
  status?: Status;
  /** wird in der Tragehistorie nicht automatisch getragen */
  schlaefer?: boolean;
  kaufVorTagen?: number;
}

const ALLE: Season[] = [];
const KALT: Season[] = ["Herbst", "Winter"];
const WARM: Season[] = ["Frühling", "Sommer"];

const VORLAGEN: Vorlage[] = [
  { name: "Heavyweight T-Shirt", brand: "Uniqlo", cat: "oberteile", sub: "T-Shirt", form: "tshirt", farbe: "Weiß", size: "M", price: 15, occ: ["Alltag", "Urlaub"], material: "100 % Baumwolle" },
  { name: "Boxy T-Shirt", brand: "COS", cat: "oberteile", sub: "T-Shirt", form: "tshirt", farbe: "Schwarz", size: "M", price: 25, occ: ["Alltag", "Abend"], material: "Bio-Baumwolle" },
  { name: "Bretonisches Shirt", brand: "Armor Lux", cat: "oberteile", sub: "Longsleeve", form: "longsleeve", farbe: "Weiß", zweit: "Navy", size: "M", price: 59, occ: ["Alltag", "Urlaub"], seasons: ["Frühling", "Sommer", "Herbst"] },
  { name: "Kapuzenpullover", brand: "Carhartt WIP", cat: "oberteile", sub: "Hoodie", form: "hoodie", farbe: "Grau", size: "L", price: 89, occ: ["Alltag", "Sport"], seasons: ["Frühling", "Herbst", "Winter"] },
  { name: "Strickpullover Wolle", brand: "Arket", cat: "oberteile", sub: "Pullover", form: "pullover", farbe: "Creme", size: "M", price: 79, seasons: KALT, occ: ["Alltag", "Büro"], material: "Merinowolle" },
  { name: "Oxford-Hemd", brand: "Uniqlo", cat: "oberteile", sub: "Hemd", form: "hemd", farbe: "Hellblau", size: "M", price: 40, occ: ["Büro", "Alltag"] },
  { name: "Merino-Pullover", brand: "COS", cat: "oberteile", sub: "Pullover", form: "pullover", farbe: "Navy", size: "M", price: 69, seasons: KALT, occ: ["Büro", "Abend"] },
  { name: "Sweatshirt", brand: "Colorful Standard", cat: "oberteile", sub: "Sweatshirt", form: "pullover", farbe: "Oliv", size: "M", price: 65, seasons: ["Frühling", "Herbst", "Winter"], occ: ["Alltag"] },
  { name: "Longsleeve", brand: "Weekday", cat: "oberteile", sub: "Longsleeve", form: "longsleeve", farbe: "Bordeaux", size: "M", price: 30, status: "selling", schlaefer: true, occ: ["Alltag"] },
  { name: "Overshirt Cord", brand: "Arket", cat: "oberteile", sub: "Hemd", form: "hemd", farbe: "Terrakotta", size: "M", price: 89, seasons: KALT, occ: ["Alltag", "Abend"] },
  { name: "Basic T-Shirt", brand: "Uniqlo", cat: "oberteile", sub: "T-Shirt", form: "tshirt", farbe: "Grün", size: "M", price: 15, seasons: WARM, occ: ["Alltag", "Urlaub"] },
  { name: "Strickjacke", brand: "Arket", cat: "oberteile", sub: "Strickjacke", form: "pullover", farbe: "Senf", size: "M", price: 99, seasons: KALT, schlaefer: true, kaufVorTagen: 170 },
  { name: "501 Original", brand: "Levi's", cat: "unterteile", sub: "Jeans", form: "jeans", farbe: "Denim", size: "W32", price: 110, occ: ["Alltag", "Abend", "Urlaub"] },
  { name: "Slim Jeans", brand: "Weekday", cat: "unterteile", sub: "Jeans", form: "jeans", farbe: "Schwarz", size: "W32", price: 60, occ: ["Alltag", "Abend"] },
  { name: "Chino", brand: "Dockers", cat: "unterteile", sub: "Chino", form: "hose", farbe: "Beige", size: "W32", price: 70, occ: ["Büro", "Alltag"] },
  { name: "Wollhose", brand: "COS", cat: "unterteile", sub: "Stoffhose", form: "hose", farbe: "Anthrazit", size: "48", price: 89, seasons: KALT, occ: ["Büro", "Festlich"] },
  { name: "Leinenshorts", brand: "Uniqlo", cat: "unterteile", sub: "Shorts", form: "shorts", farbe: "Khaki", size: "M", price: 30, seasons: ["Sommer"], occ: ["Urlaub", "Alltag"], schlaefer: true },
  { name: "Wollmantel", brand: "Arket", cat: "jacken", sub: "Mantel", form: "mantel", farbe: "Camel", size: "M", price: 249, seasons: KALT, occ: ["Büro", "Abend", "Festlich"] },
  { name: "Lederjacke", brand: "AllSaints", cat: "jacken", sub: "Lederjacke", form: "jacke", farbe: "Schwarz", size: "M", price: 320, seasons: ["Frühling", "Herbst"], occ: ["Abend", "Alltag"] },
  { name: "Trucker Jacket", brand: "Levi's", cat: "jacken", sub: "Jeansjacke", form: "jacke", farbe: "Denim", size: "M", price: 90, seasons: ["Frühling", "Sommer", "Herbst"], occ: ["Alltag"] },
  { name: "Daunenjacke", brand: "Patagonia", cat: "jacken", sub: "Daunenjacke", form: "jacke", farbe: "Navy", size: "M", price: 220, seasons: ["Winter"], occ: ["Alltag", "Sport"] },
  { name: "Sakko", brand: "Massimo Dutti", cat: "jacken", sub: "Blazer", form: "blazer", farbe: "Navy", size: "50", price: 179, occ: ["Büro", "Festlich"], schlaefer: true, kaufVorTagen: 240 },
  { name: "V-10 Sneaker", brand: "Veja", cat: "schuhe", sub: "Sneaker", form: "sneaker", farbe: "Weiß", size: "43", price: 120, occ: ["Alltag", "Urlaub", "Abend"] },
  { name: "990 Runner", brand: "New Balance", cat: "schuhe", sub: "Sportschuhe", form: "sneaker", farbe: "Grau", size: "43", price: 110, occ: ["Sport", "Alltag"] },
  { name: "Chelsea Boots", brand: "Blundstone", cat: "schuhe", sub: "Boots", form: "boots", farbe: "Braun", size: "43", price: 200, seasons: KALT, occ: ["Alltag", "Büro", "Abend"] },
  { name: "Ledertasche", brand: "Sandqvist", cat: "accessoires", sub: "Tasche", form: "tasche", farbe: "Camel", size: "One Size", price: 140, occ: ["Büro", "Alltag"] },
  { name: "Ledergürtel", brand: "Hanse", cat: "accessoires", sub: "Gürtel", form: "guertel", farbe: "Braun", size: "95", price: 59, occ: ["Alltag", "Büro", "Abend"] },
  { name: "Gürtel schwarz", brand: "COS", cat: "accessoires", sub: "Gürtel", form: "guertel", farbe: "Schwarz", size: "95", price: 45, occ: ["Büro", "Festlich", "Abend"] },
  { name: "Beanie", brand: "Arket", cat: "accessoires", sub: "Mütze", form: "muetze", farbe: "Bordeaux", size: "One Size", price: 29, seasons: ["Winter", "Herbst"], occ: ["Alltag"] },
  { name: "Leinenhemd", brand: "Uniqlo", cat: "oberteile", sub: "Hemd", form: "hemd", farbe: "Mint", size: "M", price: 49, status: "sold", schlaefer: true, seasons: WARM },
  { name: "Cord-Overshirt", brand: "Arket", cat: "oberteile", sub: "Hemd", form: "hemd", farbe: "Senf", size: "M", price: 89, status: "wish" },
  { name: "Wildleder-Boots", brand: "Clarks", cat: "schuhe", sub: "Boots", form: "boots", farbe: "Beige", size: "43", price: 160, status: "wish" },
];

function farbeHex(name: string): string {
  return PALETTE_BY_NAME[name]?.hex ?? "#888888";
}

function tempFuer(tag: string): number {
  const m = Number(tag.slice(5, 7));
  return [2, 3, 7, 11, 16, 19, 22, 21, 17, 12, 7, 3][m - 1];
}

function zufall(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export async function ladeDemo(onFortschritt?: (n: number, von: number) => void): Promise<void> {
  const heute = isoDay();
  const rand = zufall(42);
  const items: Item[] = [];

  // Kaufdaten der Reihe nach (deterministischer Zufall), Bilder parallel rendern
  const kaufTage = VORLAGEN.map((v) => v.kaufVorTagen ?? 130 + Math.floor(rand() * 400));
  let fertig = 0;
  async function baue(n: number): Promise<Item> {
    const v = VORLAGEN[n];
    const { svg, w, h } = garmentSvg(v.form, farbeHex(v.farbe), v.zweit ? { streifen: farbeHex(v.zweit) } : {});
    const png = await svgToPng(svg, w, h);
    const thumb = await makeThumb(png);
    const colors: ColorTag[] = v.zweit
      ? [
          { name: v.farbe, hex: farbeHex(v.farbe), share: 0.58 },
          { name: v.zweit, hex: farbeHex(v.zweit), share: 0.42 },
        ]
      : [{ name: v.farbe, hex: farbeHex(v.farbe), share: 1 }];
    const item = emptyItem({
      name: v.name,
      brand: v.brand,
      category: v.cat,
      sub: v.sub,
      colors,
      size: v.size,
      price: null,
      purchaseDate: addDays(heute, -kaufTage[n]),
      seasons: v.seasons ?? ALLE,
      occasions: v.occ ?? [],
      material: v.material ?? "",
      pattern: Boolean(v.zweit),
      status: v.status ?? "owned",
      salePrice: v.status === "selling" ? 14 : null,
      soldPrice: v.status === "sold" ? 18 : null,
      soldAt: v.status === "sold" ? addDays(heute, -20) : null,
      createdAt: Date.now() - kaufTage[n] * 86_400_000,
      imageCutout: await putImage(png, "cutout"),
      imageThumb: await putImage(thumb, "thumb"),
      aspect: w / h,
      favorite: ["Wollmantel", "501 Original", "V-10 Sneaker"].includes(v.name),
      demo: true,
    });
    onFortschritt?.(++fertig, VORLAGEN.length);
    return item;
  }
  for (let n = 0; n < VORLAGEN.length; n += 6) {
    const batch = await Promise.all(VORLAGEN.slice(n, n + 6).map((_, k) => baue(n + k)));
    items.push(...batch);
  }

  // Tragehistorie der letzten 110 Tage aus dem eigenen Outfit-Generator
  const aktiv = items.filter((i, n) => i.status === "owned" && !VORLAGEN[n].schlaefer);
  const wears: Wear[] = [];
  for (let d = 110; d >= 1; d--) {
    if (rand() > 0.72) continue;
    const tag = addDays(heute, -d);
    const [vorschlag] = generateOutfits(aktiv, wearIndex(wears), { occasion: null, temp: tempFuer(tag), lockedIds: [], preferIdle: false, includeWish: false }, 1, rand);
    if (vorschlag) wears.push({ id: newId(), date: tag, itemIds: vorschlag.items.map((i) => i.id), outfitId: null, createdAt: Date.now() });
  }
  // Ein paar gezielte Schrankhüter-Daten
  const per = (name: string) => items.find((i) => i.name === name)!;
  wears.push({ id: newId(), date: addDays(heute, -96), itemIds: [per("Longsleeve").id, per("501 Original").id], outfitId: null, createdAt: Date.now() });
  wears.push({ id: newId(), date: addDays(heute, -74), itemIds: [per("Leinenshorts").id, per("Basic T-Shirt").id, per("V-10 Sneaker").id], outfitId: null, createdAt: Date.now() });
  wears.push({ id: newId(), date: addDays(heute, -148), itemIds: [per("Sakko").id, per("Wollhose").id], outfitId: null, createdAt: Date.now() });

  const outfits = [
    { name: "Büro im Herbst", ids: ["Merino-Pullover", "Wollhose", "Chelsea Boots", "Wollmantel", "Ledertasche"] },
    { name: "Sonntag", ids: ["Kapuzenpullover", "501 Original", "V-10 Sneaker"] },
    { name: "Abendessen", ids: ["Boxy T-Shirt", "Slim Jeans", "Lederjacke", "Chelsea Boots"] },
  ].map((o, n) => ({
    id: newId(),
    name: o.name,
    itemIds: o.ids.map((x) => per(x).id),
    createdAt: Date.now() - n * 3_600_000,
    source: "manual" as const,
    lookImage: null,
    layout: null,
    favorite: n === 0,
    demo: true,
  }));

  await db.transaction("rw", [db.items, db.wears, db.outfits], async () => {
    await db.items.bulkPut(items);
    await db.wears.bulkPut(wears);
    await db.outfits.bulkPut(outfits);
  });
  onFortschritt?.(VORLAGEN.length, VORLAGEN.length);
}

export async function entferneDemo(): Promise<number> {
  const demo = await db.items.filter((i) => Boolean(i.demo)).toArray();
  const ids = new Set(demo.map((i) => i.id));
  const bilder = demo.flatMap((i) => [i.imageOriginal, i.imageCutout, i.imageThumb]).filter(Boolean) as string[];
  await db.transaction("rw", [db.items, db.images, db.wears, db.outfits], async () => {
    await db.items.bulkDelete([...ids]);
    await db.images.bulkDelete(bilder);
    const wears = await db.wears.toArray();
    for (const w of wears) {
      const rest = w.itemIds.filter((i) => !ids.has(i));
      if (!rest.length) await db.wears.delete(w.id);
      else if (rest.length !== w.itemIds.length) await db.wears.update(w.id, { itemIds: rest });
    }
    const outfits = await db.outfits.toArray();
    for (const o of outfits) if (o.demo || o.itemIds.every((i) => ids.has(i))) await db.outfits.delete(o.id);
  });
  bilder.forEach(forgetImage);
  return demo.length;
}
