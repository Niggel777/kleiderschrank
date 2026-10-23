// Datenmodell der Garderobe: Kategorien, Größen, Saisons, Anlässe und Typen.

export type CategoryKey = "oberteile" | "unterteile" | "kleider" | "jacken" | "schuhe" | "accessoires";
export type SizeSystem = "alpha" | "eu" | "jeans" | "schuhe" | "onesize";

export interface Category {
  key: CategoryKey;
  label: string;
  singular: string;
  sub: string[];
  sizes: SizeSystem[];
}

export type Profil = "herren" | "damen" | "alle";

interface Vorlage {
  key: CategoryKey;
  label: Record<Profil, string>;
  singular: Record<Profil, string>;
  /** Unterarten: u = für alle, h = Herren, d = Damen */
  sub: [string, "u" | "h" | "d"][];
  sizes: SizeSystem[];
}

const VORLAGEN: Vorlage[] = [
  {
    key: "oberteile",
    label: { herren: "Oberteile", damen: "Oberteile", alle: "Oberteile" },
    singular: { herren: "Oberteil", damen: "Oberteil", alle: "Oberteil" },
    sub: [["T-Shirt", "u"], ["Hemd", "u"], ["Polo", "u"], ["Longsleeve", "u"], ["Pullover", "u"], ["Strickjacke", "u"], ["Hoodie", "u"], ["Sweatshirt", "u"], ["Overshirt", "h"], ["Tanktop", "h"], ["Bluse", "d"], ["Top", "d"]],
    sizes: ["alpha", "eu"],
  },
  {
    key: "unterteile",
    label: { herren: "Hosen", damen: "Hosen & Röcke", alle: "Hosen & Röcke" },
    singular: { herren: "Hose", damen: "Hose / Rock", alle: "Hose / Rock" },
    sub: [["Jeans", "u"], ["Chino", "u"], ["Stoffhose", "u"], ["Anzughose", "h"], ["Cargohose", "u"], ["Jogginghose", "u"], ["Shorts", "u"], ["Rock", "d"], ["Leggings", "d"]],
    sizes: ["jeans", "alpha", "eu"],
  },
  {
    key: "kleider",
    label: { herren: "Anzüge & Overalls", damen: "Kleider & Overalls", alle: "Kleider, Anzüge & Overalls" },
    singular: { herren: "Anzug / Overall", damen: "Kleid / Overall", alle: "Kleid / Anzug" },
    sub: [["Anzug", "u"], ["Overall", "u"], ["Kleid", "d"], ["Maxikleid", "d"], ["Minikleid", "d"]],
    sizes: ["eu", "alpha"],
  },
  {
    key: "jacken",
    label: { herren: "Jacken & Mäntel", damen: "Jacken & Mäntel", alle: "Jacken & Mäntel" },
    singular: { herren: "Jacke / Mantel", damen: "Jacke / Mantel", alle: "Jacke / Mantel" },
    sub: [["Jacke", "u"], ["Mantel", "u"], ["Blazer", "u"], ["Jeansjacke", "u"], ["Lederjacke", "u"], ["Bomberjacke", "u"], ["Daunenjacke", "u"], ["Parka", "u"], ["Weste", "u"], ["Regenjacke", "u"]],
    sizes: ["alpha", "eu"],
  },
  {
    key: "schuhe",
    label: { herren: "Schuhe", damen: "Schuhe", alle: "Schuhe" },
    singular: { herren: "Schuhe", damen: "Schuhe", alle: "Schuhe" },
    sub: [["Sneaker", "u"], ["Boots", "u"], ["Chelsea Boots", "u"], ["Loafer", "u"], ["Halbschuhe", "u"], ["Sportschuhe", "u"], ["Sandalen", "u"], ["Stiefel", "d"], ["Pumps", "d"]],
    sizes: ["schuhe"],
  },
  {
    key: "accessoires",
    label: { herren: "Accessoires", damen: "Accessoires", alle: "Accessoires" },
    singular: { herren: "Accessoire", damen: "Accessoire", alle: "Accessoire" },
    sub: [["Tasche", "u"], ["Rucksack", "u"], ["Mütze", "u"], ["Cap", "u"], ["Schal", "u"], ["Gürtel", "u"], ["Krawatte", "h"], ["Sonnenbrille", "u"], ["Uhr", "u"], ["Schmuck", "u"]],
    sizes: ["onesize", "alpha"],
  },
];

const EU: Record<Profil, string[]> = {
  herren: ["44", "46", "48", "50", "52", "54", "56", "58"],
  damen: ["32", "34", "36", "38", "40", "42", "44", "46"],
  alle: ["32", "34", "36", "38", "40", "42", "44", "46", "48", "50", "52", "54", "56", "58"],
};
const SCHUHE: Record<Profil, string[]> = {
  herren: ["39", "40", "41", "42", "43", "44", "45", "46", "47", "48"],
  damen: ["35", "36", "37", "38", "39", "40", "41", "42"],
  alle: ["35", "36", "37", "38", "39", "40", "41", "42", "43", "44", "45", "46", "47", "48"],
};
const JEANS: Record<Profil, string[]> = {
  herren: ["W28", "W29", "W30", "W31", "W32", "W33", "W34", "W36", "W38"],
  damen: ["W24", "W25", "W26", "W27", "W28", "W29", "W30", "W31", "W32"],
  alle: ["W24", "W25", "W26", "W27", "W28", "W29", "W30", "W31", "W32", "W33", "W34", "W36", "W38"],
};
const ALPHA: Record<Profil, string[]> = {
  herren: ["XS", "S", "M", "L", "XL", "XXL", "3XL"],
  damen: ["XXS", "XS", "S", "M", "L", "XL", "XXL"],
  alle: ["XXS", "XS", "S", "M", "L", "XL", "XXL", "3XL"],
};

/*
 * Kategorien und Größen hängen vom Profil ab (Standard: Herren).
 * Die Objekte werden beim Profilwechsel in place aktualisiert, damit alle
 * Stellen, die CATEGORIES/CATEGORY/SIZES lesen, automatisch passen.
 */
export const CATEGORIES: Category[] = [];
export const CATEGORY = {} as Record<CategoryKey, Category>;
export const SIZES = {} as Record<SizeSystem, string[]>;
export let PROFIL: Profil = "herren";

export function setProfil(p: Profil): void {
  PROFIL = p;
  const passt = (t: "u" | "h" | "d") => p === "alle" || t === "u" || (p === "herren" ? t === "h" : t === "d");
  CATEGORIES.splice(
    0,
    CATEGORIES.length,
    ...VORLAGEN.map((v) => ({ key: v.key, label: v.label[p], singular: v.singular[p], sub: v.sub.filter(([, t]) => passt(t)).map(([n]) => n), sizes: v.sizes })),
  );
  for (const c of CATEGORIES) CATEGORY[c.key] = c;
  Object.assign(SIZES, { alpha: ALPHA[p], eu: EU[p], jeans: JEANS[p], schuhe: SCHUHE[p], onesize: ["One Size"] });
}
setProfil("herren");

const ALPHA_RANK = Object.fromEntries(ALPHA.alle.map((s, i) => [s, i]));

/** Sortierschlüssel für Größen: Buchstabengrößen vor Zahlengrößen, One Size zuletzt. */
export function sizeRank(size: string): number {
  if (!size) return 9999;
  if (size in ALPHA_RANK) return ALPHA_RANK[size];
  if (size === "One Size") return 9000;
  const n = parseFloat(size.replace(/[^\d.,]/g, "").replace(",", "."));
  return Number.isFinite(n) ? 100 + n : 8000;
}

export const SEASONS = ["Frühling", "Sommer", "Herbst", "Winter"] as const;
export type Season = (typeof SEASONS)[number];

export const OCCASIONS = ["Alltag", "Büro", "Sport", "Abend", "Festlich", "Urlaub"] as const;
export type Occasion = (typeof OCCASIONS)[number];

export type Status = "owned" | "wish" | "selling" | "sold";
export const STATUS_LABEL: Record<Status, string> = {
  owned: "Im Schrank",
  wish: "Wunschliste",
  selling: "Zum Verkauf",
  sold: "Verkauft",
};

export const CONDITIONS = ["Neu mit Etikett", "Neu ohne Etikett", "Sehr gut", "Gut", "Zufriedenstellend"] as const;
export type Condition = (typeof CONDITIONS)[number];

export interface ColorTag {
  name: string;
  hex: string;
  share: number;
}

export interface Item {
  id: string;
  createdAt: number;
  updatedAt: number;
  name: string;
  brand: string;
  category: CategoryKey;
  sub: string;
  colors: ColorTag[];
  size: string;
  price: number | null;
  purchaseDate: string | null;
  seasons: Season[];
  occasions: Occasion[];
  material: string;
  notes: string;
  pattern: boolean;
  status: Status;
  condition: Condition;
  shopUrl: string;
  salePrice: number | null;
  soldPrice: number | null;
  soldAt: string | null;
  favorite: boolean;
  imageOriginal: string | null;
  imageCutout: string | null;
  imageThumb: string | null;
  /** Breite / Höhe des Anzeigebilds */
  aspect: number;
  demo?: boolean;
}

export interface Wear {
  id: string;
  date: string; // YYYY-MM-DD
  itemIds: string[];
  outfitId: string | null;
  createdAt: number;
}

export interface LayoutPiece {
  itemId: string;
  /** Mittelpunkt relativ zur Bühne (0–1) */
  x: number;
  y: number;
  /** Breite relativ zur Bühnenbreite */
  w: number;
  rot: number;
  z: number;
  flip: boolean;
}

export interface Outfit {
  id: string;
  name: string;
  itemIds: string[];
  createdAt: number;
  source: "generator" | "manual" | "umkleide";
  lookImage: string | null;
  layout: LayoutPiece[] | null;
  favorite: boolean;
  demo?: boolean;
}

export type ImageKind = "original" | "cutout" | "thumb" | "person" | "look";

export interface StoredImage {
  id: string;
  kind: ImageKind;
  blob: Blob;
  createdAt: number;
}

export interface Setting {
  key: string;
  value: unknown;
}

export function newId(): string {
  return crypto.randomUUID();
}

export function emptyItem(partial: Partial<Item> = {}): Item {
  const now = Date.now();
  return {
    id: newId(),
    createdAt: now,
    updatedAt: now,
    name: "",
    brand: "",
    category: "oberteile",
    sub: "",
    colors: [],
    size: "",
    price: null,
    purchaseDate: null,
    seasons: [],
    occasions: [],
    material: "",
    notes: "",
    pattern: false,
    status: "owned",
    condition: "Sehr gut",
    shopUrl: "",
    salePrice: null,
    soldPrice: null,
    soldAt: null,
    favorite: false,
    imageOriginal: null,
    imageCutout: null,
    imageThumb: null,
    aspect: 0.8,
    ...partial,
  };
}

/** Anzeigename, falls kein eigener Name vergeben wurde. */
export function displayName(item: Item): string {
  if (item.name.trim()) return item.name.trim();
  const farbe = item.colors[0]?.name;
  return [farbe, item.sub || CATEGORY[item.category].singular].filter(Boolean).join(" ");
}
