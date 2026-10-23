// Outfit als Story-Bild (1080 × 1920) erzeugen und teilen.
import { layout } from "../components/Collage";
import { bild } from "./db";
import { formatDay, isoDay } from "./dates";
import { download, loadBitmap, toBlob } from "./image";
import { displayName, type Item } from "./model";

export async function storyBild(items: Item[], titel: string, untertitel: string, dunkel = false): Promise<Blob> {
  const W = 1080, H = 1920;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  await document.fonts.ready;

  // Hintergrund mit weichen Farbflächen
  ctx.fillStyle = dunkel ? "#0e0d0b" : "#f3f0ea";
  ctx.fillRect(0, 0, W, H);
  const blob = (x: number, y: number, r: number, farbe: string) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, farbe);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  };
  blob(180, 260, 620, dunkel ? "rgba(216,143,95,0.18)" : "rgba(233,195,163,0.55)");
  blob(940, 420, 560, dunkel ? "rgba(143,179,152,0.12)" : "rgba(201,211,196,0.6)");

  const ink = dunkel ? "#f0ebe2" : "#16140f";
  const muted = dunkel ? "#918a7e" : "#7a756b";
  ctx.fillStyle = ink;
  ctx.font = '400 64px "Instrument Serif", Georgia, serif';
  ctx.fillText("Garderobe", 90, 170);
  ctx.fillStyle = muted;
  ctx.font = '560 30px "Geist Variable", system-ui, sans-serif';
  ctx.fillText(formatDay(isoDay()).toUpperCase(), 90, 230);

  // Karte mit Flat-Lay
  const kx = 70, ky = 300, kw = W - 140, kh = 1230;
  ctx.save();
  ctx.shadowColor = "rgba(30,24,16,0.18)";
  ctx.shadowBlur = 60;
  ctx.shadowOffsetY = 24;
  ctx.fillStyle = dunkel ? "#1f1c18" : "#e8e3da";
  ctx.beginPath();
  ctx.roundRect(kx, ky, kw, kh, 56);
  ctx.fill();
  ctx.restore();

  const fx = kx + kw * 0.06, fy = ky + kh * 0.05, fw = kw * 0.88, fh = kh * 0.9;
  for (const { item, box } of layout(items).sort((a, b) => a.box.z - b.box.z)) {
    const id = item.imageCutout ?? item.imageOriginal ?? item.imageThumb;
    const img = id ? await bild(id) : undefined;
    if (!img) continue;
    const bmp = await loadBitmap(img.blob);
    const bw = (box.w / 100) * fw, bh = (box.h / 100) * fh;
    const s = Math.min(bw / bmp.width, bh / bmp.height);
    const dw = bmp.width * s, dh = bmp.height * s;
    ctx.save();
    ctx.translate(fx + (box.x / 100) * fw + bw / 2, fy + (box.y / 100) * fh + bh / 2);
    ctx.rotate((box.r * Math.PI) / 180);
    ctx.shadowColor = "rgba(30,24,16,0.2)";
    ctx.shadowBlur = 28;
    ctx.shadowOffsetY = 14;
    ctx.drawImage(bmp, -dw / 2, -dh / 2, dw, dh);
    ctx.restore();
    bmp.close();
  }

  // Titel & Teile
  ctx.fillStyle = ink;
  ctx.font = '400 92px "Instrument Serif", Georgia, serif';
  ctx.fillText(titel.slice(0, 26), 90, 1650);
  ctx.fillStyle = muted;
  ctx.font = '400 32px "Geist Variable", system-ui, sans-serif';
  ctx.fillText(untertitel.slice(0, 52), 92, 1712);
  ctx.font = '400 28px "Geist Variable", system-ui, sans-serif';
  const liste = items.map((i) => (i.brand ? `${i.brand} ${displayName(i)}` : displayName(i))).join("  ·  ");
  wrap(ctx, liste, 92, 1780, W - 184, 40, 3);
  return toBlob(c, "image/png");
}

function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, max: number, zeile: number, maxZeilen: number) {
  const woerter = text.split(" ");
  let line = "";
  let n = 0;
  for (const w of woerter) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > max && line) {
      ctx.fillText(line, x, y + n * zeile);
      line = w;
      if (++n >= maxZeilen) return;
    } else line = test;
  }
  if (line) ctx.fillText(line, x, y + n * zeile);
}

/** Über das Teilen-Menü des Handys senden, sonst herunterladen. */
export async function teileOutfit(items: Item[], titel: string, untertitel: string): Promise<"geteilt" | "geladen"> {
  const dunkel = document.documentElement.getAttribute("data-theme") === "dark";
  const png = await storyBild(items, titel, untertitel, dunkel);
  const datei = new File([png], "outfit.png", { type: "image/png" });
  if (navigator.canShare?.({ files: [datei] })) {
    try {
      await navigator.share({ files: [datei], title: titel, text: `${titel} – mein Outfit` });
      return "geteilt";
    } catch {
      /* abgebrochen → Download als Fallback */
    }
  }
  download(png, "outfit.png");
  return "geladen";
}
