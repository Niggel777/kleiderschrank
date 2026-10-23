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

export const CATEGORIES: Category[] = [
  {
    key: "oberteile",
    label: "Oberteile",
    singular: "Oberteil",
    sub: ["T-Shirt", "Hemd", "Bluse", "Top", "Pullover", "Strickjacke", "Hoodie", "Sweatshirt", "Polo", "Longsleeve"],
    sizes: ["alpha", "eu"],
  },
  {
    key: "unterteile",
    label: "Hosen & Röcke",
    singular: "Hose / Rock",
    sub: ["Jeans", "Chino", "Stoffhose", "Jogginghose", "Shorts", "Rock", "Leggings", "Cargohose"],
    sizes: ["jeans", "alpha", "eu"],
  },
  {
    key: "kleider",
    label: "Kleider & Overalls",
    singular: "Kleid / Overall",
    sub: ["Kleid", "Maxikleid", "Minikleid", "Overall", "Anzug"],
    sizes: ["alpha", "eu"],
  },
  {
    key: "jacken",
    label: "Jacken & Mäntel",
    singular: "Jacke / Mantel",
    sub: ["Jacke", "Mantel", "Blazer", "Jeansjacke", "Lederjacke", "Daunenjacke", "Weste", "Regenjacke"],
    sizes: ["alpha", "eu"],
  },
  {
    key: "schuhe",
    label: "Schuhe",
    singular: "Schuhe",
    sub: ["Sneaker", "Stiefel", "Boots", "Loafer", "Sandalen", "Pumps", "Sportschuhe", "Halbschuhe"],
    sizes: ["schuhe"],
  },
  {
    key: "accessoires",
    label: "Accessoires",
    singular: "Accessoire",
    sub: ["Tasche", "Rucksack", "Mütze", "Cap", "Schal", "Gürtel", "Sonnenbrille", "Schmuck", "Uhr"],
    sizes: ["onesize", "alpha"],
  },
];

export const CATEGORY = Object.fromEntries(CATEGORIES.map((c) => [c.key, c])) as Record<CategoryKey, Category>;

export const SIZES: Record<SizeSystem, string[]> = {
  alpha: ["XXS", "XS", "S", "M", "L", "XL", "XXL", "3XL"],
  eu: ["32", "34", "36", "38", "40", "42", "44", "46", "48", "50", "52", "54", "56"],
  jeans: ["W26", "W27", "W28", "W29", "W30", "W31", "W32", "W33", "W34", "W36", "W38"],
  schuhe: ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45", "46", "47"],
  onesize: ["One Size"],
};

const ALPHA_RANK = Object.fromEntries(SIZES.alpha.map((s, i) => [s, i]));

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
