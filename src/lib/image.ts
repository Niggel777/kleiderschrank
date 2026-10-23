// Bildverarbeitung im Browser: verkleinern, freistellen zuschneiden, Vorschaubilder.
import { extractColors } from "./colors";
import type { ColorTag } from "./model";
import { entferneInseln, fuelleLoecher, neigung, saeubereKanten } from "./packshot";

let webpOk: boolean | null = null;

function canvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

export function toBlob(c: HTMLCanvasElement, type: string, quality = 0.9): Promise<Blob> {
  return new Promise((resolve, reject) =>
    c.toBlob((b) => (b ? resolve(b) : reject(new Error("Bild konnte nicht erzeugt werden"))), type, quality),
  );
}

/** WebP mit Transparenz, falls der Browser es kann – sonst PNG. */
async function alphaBlob(c: HTMLCanvasElement, quality = 0.9): Promise<Blob> {
  if (webpOk !== false) {
    const b = await toBlob(c, "image/webp", quality);
    webpOk = b.type === "image/webp";
    if (webpOk) return b;
  }
  return toBlob(c, "image/png");
}

export async function loadBitmap(src: Blob): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(src, { imageOrientation: "from-image" });
  } catch {
    // Fallback für Formate, die createImageBitmap nicht direkt lesen kann
    const url = URL.createObjectURL(src);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return await createImageBitmap(img);
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

function fit(w: number, h: number, max: number) {
  const s = Math.min(1, max / Math.max(w, h));
  return { w: Math.round(w * s), h: Math.round(h * s) };
}

/** Foto auf handliche Größe bringen (JPEG). */
export async function normalizePhoto(file: Blob, max = 1600): Promise<{ blob: Blob; width: number; height: number }> {
  const bmp = await loadBitmap(file);
  const { w, h } = fit(bmp.width, bmp.height, max);
  const c = canvas(w, h);
  c.getContext("2d")!.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  return { blob: await toBlob(c, "image/jpeg", 0.88), width: w, height: h };
}

/**
 * Freisteller wie ein Shop-Packshot aufbereiten: Fussel/Bodenreste weg, kleine Löcher zu,
 * saubere Kanten ohne Saum vom alten Untergrund, leicht schief fotografierte Teile gerade.
 */
export async function packshotAufbereiten(src: Blob): Promise<Blob> {
  const bmp = await loadBitmap(src);
  const c = canvas(bmp.width, bmp.height);
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(bmp, 0, 0);
  bmp.close();
  const bild = ctx.getImageData(0, 0, c.width, c.height);
  entferneInseln(bild);
  fuelleLoecher(bild);
  saeubereKanten(bild);
  ctx.putImageData(bild, 0, 0);
  const grad = neigung(bild);
  if (!grad) return alphaBlob(c);
  // Gerade drehen: Zeichenfläche so groß, dass nichts abgeschnitten wird
  const rad = (-grad * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad)), sin = Math.abs(Math.sin(rad));
  const out = canvas(c.width * cos + c.height * sin, c.width * sin + c.height * cos);
  const o = out.getContext("2d")!;
  o.imageSmoothingQuality = "high";
  o.translate(out.width / 2, out.height / 2);
  o.rotate(rad);
  o.drawImage(c, -c.width / 2, -c.height / 2);
  return alphaBlob(out);
}

/** Schneidet transparente Ränder ab und lässt einen kleinen Rand stehen. */
export async function trimTransparent(src: Blob, pad = 0.03): Promise<{ blob: Blob; width: number; height: number }> {
  const bmp = await loadBitmap(src);
  const c = canvas(bmp.width, bmp.height);
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(bmp, 0, 0);
  bmp.close();
  const { data, width, height } = ctx.getImageData(0, 0, c.width, c.height);
  let x0 = width, y0 = height, x1 = -1, y1 = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 12) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return { blob: await alphaBlob(c), width, height };
  const p = Math.round(Math.max(x1 - x0, y1 - y0) * pad);
  x0 = Math.max(0, x0 - p);
  y0 = Math.max(0, y0 - p);
  x1 = Math.min(width - 1, x1 + p);
  y1 = Math.min(height - 1, y1 + p);
  const w = x1 - x0 + 1, h = y1 - y0 + 1;
  const out = canvas(w, h);
  out.getContext("2d")!.drawImage(c, x0, y0, w, h, 0, 0, w, h);
  return { blob: await alphaBlob(out), width: w, height: h };
}

export async function makeThumb(src: Blob, max = 560): Promise<Blob> {
  const bmp = await loadBitmap(src);
  const { w, h } = fit(bmp.width, bmp.height, max);
  const c = canvas(w, h);
  c.getContext("2d")!.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  return alphaBlob(c, 0.86);
}

export async function colorsOf(src: Blob): Promise<ColorTag[]> {
  const bmp = await loadBitmap(src);
  const { w, h } = fit(bmp.width, bmp.height, 180);
  const c = canvas(w, h);
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  return extractColors(ctx.getImageData(0, 0, c.width, c.height));
}

export async function sizeOf(src: Blob): Promise<{ width: number; height: number }> {
  const bmp = await loadBitmap(src);
  const r = { width: bmp.width, height: bmp.height };
  bmp.close();
  return r;
}

/** Freigestelltes Teil auf hellem Grund für Verkaufsplattformen (JPEG, 4:5). */
export async function productShot(src: Blob, bg = "#f4f2ee", w = 1200, h = 1500): Promise<Blob> {
  const bmp = await loadBitmap(src);
  const c = canvas(w, h);
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  const s = Math.min((w * 0.78) / bmp.width, (h * 0.78) / bmp.height);
  const dw = bmp.width * s, dh = bmp.height * s;
  ctx.shadowColor = "rgba(0,0,0,0.14)";
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 18;
  ctx.drawImage(bmp, (w - dw) / 2, (h - dh) / 2, dw, dh);
  bmp.close();
  return toBlob(c, "image/jpeg", 0.92);
}

export function download(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
