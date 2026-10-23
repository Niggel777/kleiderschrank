// Bildbearbeitung: drehen, automatische Korrektur (Weißabgleich, Tonwerte, Sättigung), Regler.
import { loadBitmap, toBlob } from "./image";

export interface Bearbeitung {
  /** Drehung im Uhrzeigersinn: 0, 90, 180, 270 */
  drehung: number;
  auto: boolean;
  /** −1 … 1 */
  helligkeit: number;
  /** −1 (kühler) … 1 (wärmer) */
  waerme: number;
}

export const STANDARD: Bearbeitung = { drehung: 0, auto: true, helligkeit: 0, waerme: 0 };

export function istStandard(b: Bearbeitung): boolean {
  return b.drehung === 0 && !b.auto && b.helligkeit === 0 && b.waerme === 0;
}

/** Pixelkorrektur auf RGBA-Daten (transparente Pixel bleiben unberührt). Auch für Tests nutzbar. */
export function korrigiere(data: Uint8ClampedArray, b: Bearbeitung): void {
  let gr = 1, gg = 1, gb = 1, lo = 0, hi = 255;
  if (b.auto) {
    // Weißabgleich (abgeschwächte Grauwelt) und Tonwertspreizung aus deckenden Pixeln
    let sr = 0, sg = 0, sb = 0, n = 0;
    const hist = new Uint32Array(256);
    for (let i = 0; i < data.length; i += 16) {
      if (data[i + 3] < 200) continue;
      sr += data[i]; sg += data[i + 1]; sb += data[i + 2]; n++;
      hist[Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2])]++;
    }
    if (n > 50) {
      const m = (sr + sg + sb) / (3 * n);
      const k = 0.5; // nur halb korrigieren, damit farbige Teile ihre Farbe behalten
      gr = 1 + k * (m / Math.max(1, sr / n) - 1);
      gg = 1 + k * (m / Math.max(1, sg / n) - 1);
      gb = 1 + k * (m / Math.max(1, sb / n) - 1);
      let acc = 0;
      for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc > n * 0.01) { lo = v; break; } }
      acc = 0;
      for (let v = 255; v >= 0; v--) { acc += hist[v]; if (acc > n * 0.01) { hi = v; break; } }
      // nicht übertreiben
      lo = Math.min(lo, 40);
      hi = Math.max(hi, 215);
    }
  }
  const spanne = Math.max(1, hi - lo);
  const hell = b.helligkeit * 40;
  const warm = b.waerme * 18;
  const satt = b.auto ? 1.08 : 1;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    let r = ((data[i] * gr - lo) / spanne) * 255 + hell + warm;
    let g = ((data[i + 1] * gg - lo) / spanne) * 255 + hell;
    let bl = ((data[i + 2] * gb - lo) / spanne) * 255 + hell - warm;
    if (satt !== 1) {
      const l = 0.299 * r + 0.587 * g + 0.114 * bl;
      r = l + (r - l) * satt;
      g = l + (g - l) * satt;
      bl = l + (bl - l) * satt;
    }
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = bl;
  }
}

/** Wendet Drehung und Korrektur auf ein Bild an (Format bleibt erhalten). */
export async function bearbeite(src: Blob, b: Bearbeitung): Promise<{ blob: Blob; width: number; height: number }> {
  const bmp = await loadBitmap(src);
  const quer = b.drehung % 180 !== 0;
  const W = quer ? bmp.height : bmp.width;
  const H = quer ? bmp.width : bmp.height;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.translate(W / 2, H / 2);
  ctx.rotate((b.drehung * Math.PI) / 180);
  ctx.drawImage(bmp, -bmp.width / 2, -bmp.height / 2);
  bmp.close();
  if (b.auto || b.helligkeit || b.waerme) {
    const img = ctx.getImageData(0, 0, W, H);
    korrigiere(img.data, b);
    ctx.putImageData(img, 0, 0);
  }
  const typ = src.type === "image/jpeg" ? "image/jpeg" : src.type === "image/png" ? "image/png" : "image/webp";
  let blob = await toBlob(c, typ, 0.9);
  if (typ === "image/webp" && blob.type !== "image/webp") blob = await toBlob(c, "image/png");
  return { blob, width: W, height: H };
}
