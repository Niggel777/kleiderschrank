// Lokale Datenbank (IndexedDB über Dexie). Alles bleibt auf dem Gerät.
import Dexie, { type EntityTable } from "dexie";
import { newId, type ImageKind, type Item, type Outfit, type Setting, type StoredImage, type Wear } from "./model";

class GarderobeDB extends Dexie {
  items!: EntityTable<Item, "id">;
  images!: EntityTable<StoredImage, "id">;
  wears!: EntityTable<Wear, "id">;
  outfits!: EntityTable<Outfit, "id">;
  settings!: EntityTable<Setting, "key">;

  constructor() {
    super("garderobe");
    this.version(1).stores({
      items: "id, category, status, createdAt, updatedAt",
      images: "id, kind",
      wears: "id, date, *itemIds, outfitId",
      outfits: "id, createdAt, source",
      settings: "key",
    });
  }
}

export const db = new GarderobeDB();

export async function putImage(blob: Blob, kind: ImageKind): Promise<string> {
  const id = newId();
  await db.images.put({ id, kind, blob, createdAt: Date.now() });
  return id;
}

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const s = await db.settings.get(key);
  return s ? (s.value as T) : fallback;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await db.settings.put({ key, value });
}

export async function saveItem(item: Item): Promise<void> {
  await db.items.put({ ...item, updatedAt: Date.now() });
}

export async function deleteItem(item: Item): Promise<void> {
  await db.transaction("rw", [db.items, db.images, db.wears, db.outfits], async () => {
    const imgs = [item.imageOriginal, item.imageCutout, item.imageThumb].filter(Boolean) as string[];
    await db.images.bulkDelete(imgs);
    await db.items.delete(item.id);
    // Aus Tragetagen und Outfits entfernen
    const wears = await db.wears.where("itemIds").equals(item.id).toArray();
    for (const w of wears) {
      const rest = w.itemIds.filter((i) => i !== item.id);
      if (rest.length) await db.wears.update(w.id, { itemIds: rest });
      else await db.wears.delete(w.id);
    }
    const outfits = await db.outfits.filter((o) => o.itemIds.includes(item.id)).toArray();
    for (const o of outfits) {
      const rest = o.itemIds.filter((i) => i !== item.id);
      if (rest.length) {
        await db.outfits.update(o.id, {
          itemIds: rest,
          layout: o.layout ? o.layout.filter((p) => p.itemId !== item.id) : null,
        });
      } else await db.outfits.delete(o.id);
    }
  });
}

/** Trägt Teile an einem Tag ein. Bereits eingetragene Teile werden nicht doppelt gezählt. */
export async function logWear(date: string, itemIds: string[], outfitId: string | null = null): Promise<void> {
  const sameDay = await db.wears.where("date").equals(date).toArray();
  const already = new Set(sameDay.flatMap((w) => w.itemIds));
  const neu = itemIds.filter((i) => !already.has(i));
  if (!neu.length) return;
  await db.wears.add({ id: newId(), date, itemIds: neu, outfitId, createdAt: Date.now() });
}

export async function unlogWear(date: string, itemId: string): Promise<void> {
  const sameDay = await db.wears.where("date").equals(date).toArray();
  for (const w of sameDay) {
    if (!w.itemIds.includes(itemId)) continue;
    const rest = w.itemIds.filter((i) => i !== itemId);
    if (rest.length) await db.wears.update(w.id, { itemIds: rest });
    else await db.wears.delete(w.id);
  }
}

export async function deleteOutfit(o: Outfit): Promise<void> {
  await db.transaction("rw", [db.outfits, db.images], async () => {
    if (o.lookImage) await db.images.delete(o.lookImage);
    await db.outfits.delete(o.id);
  });
}

export async function storageEstimate(): Promise<{ used: number; quota: number } | null> {
  if (!navigator.storage?.estimate) return null;
  const e = await navigator.storage.estimate();
  return { used: e.usage ?? 0, quota: e.quota ?? 0 };
}

/** Bild lokal lesen – fehlt es (zweites Gerät, Platz gespart), wird es aus der Cloud geholt. */
export async function bild(id: string): Promise<{ blob: Blob } | undefined> {
  const lokal = await db.images.get(id);
  if (lokal) return lokal;
  const { bildAusCloud } = await import("./sync");
  const blob = await bildAusCloud(id);
  return blob ? { blob } : undefined;
}
