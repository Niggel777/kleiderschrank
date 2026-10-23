import { describe, expect, it } from "vitest";
import { extractColors, hexToRgb, nearestPalette } from "./colors";
import { addDays, daysBetween, isoDay, relativeDay } from "./dates";
import { emptyItem, sizeRank, type Item } from "./model";
import { generateOutfits, harmony, passendZu } from "./outfits";
import { idleDays, sortItems, wearIndex } from "./stats";

function seeded(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const teil = (p: Partial<Item> & { farbe: string }): Item =>
  emptyItem({ ...p, colors: [{ name: p.farbe, hex: "#000000", share: 1 }] });

describe("Farben", () => {
  it("benennt typische Kleidungsfarben", () => {
    expect(nearestPalette(hexToRgb("#111111")).name).toBe("Schwarz");
    expect(nearestPalette(hexToRgb("#ffffff")).name).toBe("Weiß");
    expect(nearestPalette(hexToRgb("#1c2742")).name).toBe("Navy");
    expect(nearestPalette(hexToRgb("#c0302c")).name).toBe("Rot");
    expect(nearestPalette(hexToRgb("#d4c19f")).name).toBe("Beige");
  });

  it("findet die Hauptfarbe und ignoriert transparenten Hintergrund", () => {
    const w = 40, h = 40;
    const data = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < w * h; i++) {
      const innen = i % w > 8 && i % w < 32;
      data.set(innen ? [30, 42, 70, 255] : [255, 0, 0, 0], i * 4);
    }
    const farben = extractColors({ data, width: w, height: h });
    expect(farben[0].name).toBe("Navy");
    expect(farben).toHaveLength(1);
  });

  it("erkennt zweifarbige Teile", () => {
    const w = 40, h = 40;
    const data = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < w * h; i++) data.set(i < (w * h) / 2 ? [240, 240, 236, 255] : [180, 50, 46, 255], i * 4);
    const namen = extractColors({ data, width: w, height: h }).map((f) => f.name).sort();
    expect(namen).toEqual(["Rot", "Weiß"]);
  });
});

describe("Datum & Größen", () => {
  it("rechnet Tage", () => {
    expect(daysBetween("2026-10-01", "2026-10-22")).toBe(21);
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(relativeDay(null)).toBe("noch nie");
    expect(relativeDay(addDays(isoDay(), -1))).toBe("gestern");
  });

  it("sortiert Größen sinnvoll", () => {
    const g = ["L", "XS", "M", "One Size", "38", "W32", "S"].sort((a, b) => sizeRank(a) - sizeRank(b));
    expect(g).toEqual(["XS", "S", "M", "L", "W32", "38", "One Size"]);
  });
});

describe("Harmonie", () => {
  it("bewertet neutral + Akzent am besten", () => {
    const n = harmony([teil({ farbe: "Weiß" }), teil({ farbe: "Schwarz", category: "unterteile" })]);
    const a = harmony([teil({ farbe: "Rot" }), teil({ farbe: "Navy", category: "unterteile" })]);
    const mutig = harmony([teil({ farbe: "Rot" }), teil({ farbe: "Grün", category: "unterteile" }), teil({ farbe: "Gelb", category: "schuhe" })]);
    expect(a.score).toBeGreaterThan(n.score);
    expect(a.label).toContain("Akzent in Rot");
    expect(mutig.score).toBeLessThan(0.5);
  });

  it("bestraft zwei Muster", () => {
    expect(harmony([teil({ farbe: "Weiß", pattern: true }), teil({ farbe: "Navy", pattern: true })]).label).toContain("zwei Muster");
  });
});

describe("Outfit-Generator", () => {
  const schrank: Item[] = [
    teil({ farbe: "Weiß", category: "oberteile", sub: "T-Shirt" }),
    teil({ farbe: "Hellblau", category: "oberteile", sub: "Hemd" }),
    teil({ farbe: "Grau", category: "oberteile", sub: "Pullover" }),
    teil({ farbe: "Denim", category: "unterteile", sub: "Jeans" }),
    teil({ farbe: "Beige", category: "unterteile", sub: "Chino" }),
    teil({ farbe: "Khaki", category: "unterteile", sub: "Shorts" }),
    teil({ farbe: "Schwarz", category: "jacken", sub: "Mantel" }),
    teil({ farbe: "Weiß", category: "schuhe", sub: "Sneaker" }),
    teil({ farbe: "Braun", category: "schuhe", sub: "Boots" }),
    teil({ farbe: "Rot", category: "oberteile", sub: "T-Shirt", status: "wish" }),
    teil({ farbe: "Pink", category: "oberteile", sub: "T-Shirt", status: "sold" }),
  ];
  const idx = wearIndex([]);
  const ctx = { occasion: null, temp: 15, lockedIds: [], preferIdle: false, includeWish: false };

  it("liefert Oberteil, Unterteil und Schuhe ohne Wunsch- oder verkaufte Teile", () => {
    const v = generateOutfits(schrank, idx, ctx, 4, seeded(3));
    expect(v.length).toBeGreaterThan(0);
    for (const s of v) {
      const cats = s.items.map((i) => i.category);
      expect(cats).toContain("oberteile");
      expect(cats).toContain("unterteile");
      expect(cats).toContain("schuhe");
      expect(s.items.some((i) => i.status === "wish" || i.status === "sold")).toBe(false);
    }
  });

  it("hält gesperrte Teile fest – auch von der Wunschliste", () => {
    const wunsch = schrank[9];
    const v = generateOutfits(schrank, idx, { ...ctx, lockedIds: [wunsch.id] }, 3, seeded(5));
    for (const s of v) expect(s.items).toContain(wunsch);
  });

  it("lässt Shorts bei Kälte weg und nimmt eine Jacke", () => {
    const v = generateOutfits(schrank, idx, { ...ctx, temp: 4 }, 5, seeded(9));
    for (const s of v) {
      expect(s.items.some((i) => i.sub === "Shorts")).toBe(false);
      expect(s.items.some((i) => i.category === "jacken")).toBe(true);
    }
  });

  it("schlägt passende Teile aus anderen Kategorien vor", () => {
    const p = passendZu(schrank[0], schrank, 3);
    expect(p.every((i) => i.category !== "oberteile")).toBe(true);
  });
});

describe("Statistik", () => {
  it("zählt Tragen und sortiert nach lange nicht getragen", () => {
    const a = emptyItem({ createdAt: new Date(2026, 0, 1).getTime() });
    const b = emptyItem({ createdAt: new Date(2026, 0, 1).getTime() });
    const idx = wearIndex([
      { id: "1", date: addDays(isoDay(), -2), itemIds: [a.id], outfitId: null, createdAt: 0 },
      { id: "2", date: addDays(isoDay(), -40), itemIds: [a.id, b.id], outfitId: null, createdAt: 0 },
    ]);
    expect(idx.get(a.id)!.count).toBe(2);
    expect(idleDays(b, idx.get(b.id)!)).toBe(40);
    expect(sortItems([a, b], "lange-nicht", idx)[0]).toBe(b);
  });
});

describe("Stil", () => {
  it("bewertet Teile mit gemeinsamem Anlass höher", async () => {
    const { stilEinheit } = await import("./outfits");
    const sakko = emptyItem({ occasions: ["Büro", "Festlich"] });
    const runner = emptyItem({ occasions: ["Sport"] });
    const hose = emptyItem({ occasions: ["Büro", "Alltag"] });
    expect(stilEinheit([sakko, hose])).toBe(1);
    expect(stilEinheit([sakko, hose, runner])).toBeLessThan(0.5);
  });
});

describe("Gürtel", () => {
  it("kommt zu Jeans und passt farblich zu den Schuhen", () => {
    const schrank: Item[] = [
      teil({ farbe: "Weiß", category: "oberteile", sub: "T-Shirt" }),
      teil({ farbe: "Denim", category: "unterteile", sub: "Jeans" }),
      teil({ farbe: "Braun", category: "schuhe", sub: "Boots" }),
      teil({ farbe: "Braun", category: "accessoires", sub: "Gürtel" }),
      teil({ farbe: "Schwarz", category: "accessoires", sub: "Gürtel" }),
    ];
    const v = generateOutfits(schrank, wearIndex([]), { occasion: null, temp: 20, lockedIds: [], preferIdle: false, includeWish: false }, 6, seeded(4));
    const mitGuertel = v.filter((s) => s.items.some((i) => i.sub === "Gürtel"));
    expect(mitGuertel.length).toBeGreaterThan(0);
    for (const s of v) expect(s.items.filter((i) => i.sub === "Gürtel").length).toBeLessThanOrEqual(1);
    const braun = mitGuertel.find((s) => s.items.some((i) => i.sub === "Gürtel" && i.colors[0].name === "Braun"));
    expect(braun?.harmony.label).toContain("Gürtel passt zu den Schuhen");
  });
});
