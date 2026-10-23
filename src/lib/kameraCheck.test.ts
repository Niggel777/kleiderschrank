import { describe, expect, it } from "vitest";
import { bewerte, schaerfeWert } from "./kameraCheck";

function bild(w: number, h: number, f: (x: number, y: number) => number) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const v = f(x, y), i = (y * w + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = v;
      data[i + 3] = 255;
    }
  return { data, width: w, height: h };
}

// helles Teil mit feinem Muster mittig auf ruhigem Untergrund
const gut = bild(160, 120, (x, y) => (x > 40 && x < 120 && y > 25 && y < 95 ? ((x + y) % 4 < 2 ? 60 : 200) : 175));

describe("Kamera-Check", () => {
  it("gutes Foto: alles grün, kein Tipp", () => {
    const b = bewerte(gut);
    expect(b).toMatchObject({ licht: "gut", schaerfe: "gut", untergrund: "gut", tipp: null });
  });

  it("zu dunkel wird erkannt", () => {
    const b = bewerte(bild(160, 120, (x, y) => (x > 40 && x < 120 && y > 25 && y < 95 ? 30 : 25)));
    expect(b.licht).toBe("schlecht");
    expect(b.tipp).toMatch(/dunkel/);
  });

  it("unscharfes Bild hat kleinere Laplace-Varianz", () => {
    const weich = bild(160, 120, (x) => 100 + 60 * Math.sin(x / 25));
    expect(schaerfeWert(weich)).toBeLessThan(schaerfeWert(gut) / 10);
    expect(bewerte(weich).schaerfe).toBe("schlecht");
  });

  it("unruhiger Rand wird bemängelt", () => {
    const b = bewerte(bild(160, 120, (x, y) => ((x * 7 + y * 13) % 10 < 5 ? 40 : 220)));
    expect(b.untergrund).toBe("schlecht");
  });
});
