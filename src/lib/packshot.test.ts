import { describe, expect, it } from "vitest";
import { entferneInseln, fuelleLoecher, neigung, saeubereKanten, type Pixel } from "./packshot";

function leer(w = 80, h = 80): Pixel {
  return { data: new Uint8ClampedArray(w * h * 4), width: w, height: h };
}
function rechteck(px: Pixel, x0: number, y0: number, x1: number, y1: number, rgba = [40, 50, 90, 255]) {
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) px.data.set(rgba, (y * px.width + x) * 4);
}
const alpha = (px: Pixel, x: number, y: number) => px.data[(y * px.width + x) * 4 + 3];

describe("Packshot", () => {
  it("entfernt kleine lose Reste, behält das Teil", () => {
    const px = leer();
    rechteck(px, 20, 10, 60, 70); // Teil
    rechteck(px, 2, 2, 4, 4); // Fussel
    expect(entferneInseln(px)).toBe(4);
    expect(alpha(px, 3, 3)).toBe(0);
    expect(alpha(px, 40, 40)).toBe(255);
  });

  it("füllt kleine Löcher, lässt große Öffnungen", () => {
    const px = leer();
    rechteck(px, 10, 10, 70, 70);
    rechteck(px, 30, 30, 32, 32, [0, 0, 0, 0]); // kleines Loch (4 px)
    rechteck(px, 45, 20, 65, 40, [0, 0, 0, 0]); // große Öffnung (400 px, z. B. Henkel)
    fuelleLoecher(px);
    expect(alpha(px, 30, 30)).toBe(255);
    expect(px.data[(30 * 80 + 30) * 4]).toBe(40); // Farbe vom Stoff übernommen
    expect(alpha(px, 50, 25)).toBe(0);
  });

  it("färbt halbtransparente Kanten in Stofffarbe statt Hintergrund", () => {
    const px = leer();
    rechteck(px, 20, 20, 60, 60);
    rechteck(px, 60, 20, 61, 60, [240, 240, 240, 120]); // heller Saum vom alten Untergrund
    saeubereKanten(px);
    const i = (40 * 80 + 60) * 4;
    expect(px.data[i]).toBeLessThan(80);
  });

  it("erkennt ein schief liegendes Teil und ignoriert gerade", () => {
    const gerade = leer(120, 120);
    rechteck(gerade, 45, 10, 75, 110);
    expect(neigung(gerade)).toBe(0);

    const schief = leer(120, 120);
    const winkel = (12 * Math.PI) / 180;
    for (let y = 0; y < 120; y++)
      for (let x = 0; x < 120; x++) {
        // um 12° gedrehtes Rechteck 30 × 100 um die Mitte
        const dx = x - 60, dy = y - 60;
        const u = dx * Math.cos(winkel) + dy * Math.sin(winkel);
        const v = -dx * Math.sin(winkel) + dy * Math.cos(winkel);
        if (Math.abs(u) < 15 && Math.abs(v) < 50) schief.data.set([40, 50, 90, 255], (y * 120 + x) * 4);
      }
    const n = neigung(schief);
    expect(Math.abs(Math.abs(n) - 12)).toBeLessThan(1.5);
  });
});
