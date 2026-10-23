// Umkleide: Startpositionen der Teile auf der Person und Export als Bild.
import { bild } from "./db";
import { loadBitmap, toBlob } from "./image";
import type { Item, LayoutPiece } from "./model";

/** Startposition je Kategorie (für ein Ganzkörperfoto, Person mittig). */
export function startPosition(item: Item, z: number): LayoutPiece {
  const base = { itemId: item.id, rot: 0, z, flip: false };
  switch (item.category) {
    case "oberteile":
      return { ...base, x: 0.5, y: 0.36, w: 0.48 };
    case "jacken":
      return { ...base, x: 0.5, y: item.sub === "Mantel" ? 0.44 : 0.37, w: 0.54 };
    case "kleider":
      return { ...base, x: 0.5, y: 0.5, w: 0.5 };
    case "unterteile":
      return { ...base, x: 0.5, y: item.sub === "Shorts" ? 0.62 : 0.73, w: 0.42 };
    case "schuhe":
      return { ...base, x: 0.5, y: 0.94, w: 0.3 };
    case "accessoires":
      if (item.sub === "Mütze" || item.sub === "Cap") return { ...base, x: 0.5, y: 0.07, w: 0.2 };
      if (item.sub === "Schal") return { ...base, x: 0.5, y: 0.22, w: 0.3 };
      return { ...base, x: 0.76, y: 0.56, w: 0.24 };
  }
}

export const EBENE: Record<Item["category"], number> = {
  unterteile: 1,
  schuhe: 2,
  oberteile: 3,
  kleider: 3,
  jacken: 4,
  accessoires: 5,
};

/** Rendert Person + Teile in ein JPEG (für gespeicherte Looks). */
export async function lookRendern(
  person: Blob,
  personAspect: number,
  pieces: LayoutPiece[],
  items: Map<string, Item>,
  breite = 1080,
): Promise<Blob> {
  const W = breite;
  const H = Math.round(breite / personAspect);
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  const p = await loadBitmap(person);
  ctx.drawImage(p, 0, 0, W, H);
  p.close();
  for (const piece of [...pieces].sort((a, b) => a.z - b.z)) {
    const item = items.get(piece.itemId);
    const id = item?.imageCutout ?? item?.imageOriginal;
    if (!item || !id) continue;
    const img = await bild(id);
    if (!img) continue;
    const bmp = await loadBitmap(img.blob);
    const w = piece.w * W;
    const h = w / (bmp.width / bmp.height);
    ctx.save();
    ctx.translate(piece.x * W, piece.y * H);
    ctx.rotate((piece.rot * Math.PI) / 180);
    if (piece.flip) ctx.scale(-1, 1);
    ctx.shadowColor = "rgba(0,0,0,0.22)";
    ctx.shadowBlur = W * 0.02;
    ctx.shadowOffsetY = W * 0.008;
    ctx.drawImage(bmp, -w / 2, -h / 2, w, h);
    ctx.restore();
    bmp.close();
  }
  return toBlob(c, "image/jpeg", 0.9);
}

/** Personenfoto auf ruhigen Studio-Hintergrund setzen (nach dem Freistellen). */
export async function aufStudioHintergrund(freigestellt: Blob, dunkel = false): Promise<{ blob: Blob; aspect: number }> {
  const bmp = await loadBitmap(freigestellt);
  const W = bmp.width, H = bmp.height;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, dunkel ? "#2a2926" : "#efece6");
  g.addColorStop(1, dunkel ? "#1b1a18" : "#e1dcd2");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const r = ctx.createRadialGradient(W / 2, H * 0.97, 0, W / 2, H * 0.97, W * 0.4);
  r.addColorStop(0, "rgba(0,0,0,0.16)");
  r.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = r;
  ctx.fillRect(0, H * 0.85, W, H * 0.15);
  ctx.drawImage(bmp, 0, 0);
  bmp.close();
  return { blob: await toBlob(c, "image/jpeg", 0.9), aspect: W / H };
}
