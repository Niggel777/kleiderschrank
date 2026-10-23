import { describe, expect, it } from "vitest";
import { PUPPE, koerperPlausibel, platziereAmKoerper, type Koerper } from "./koerper";
import { emptyItem, type CategoryKey } from "./model";

const A = 900 / 1600;
const teil = (category: CategoryKey, sub = "", aspect = 0.85) => emptyItem({ category, sub, aspect });

/** Ober- und Unterkante eines platzierten Teils (relativ zur Bildhöhe). */
function kanten(p: ReturnType<typeof platziereAmKoerper>, aspect: number) {
  const h = (p.w * A) / aspect;
  return { oben: p.y - h / 2, unten: p.y + h / 2 };
}

describe("Platzierung am Körper", () => {
  it("setzt ein Oberteil zwischen Schultern und Hüfte, mittig", () => {
    const p = platziereAmKoerper(teil("oberteile", "T-Shirt", 0.87), PUPPE, A, 3);
    const k = kanten(p, 0.87);
    expect(p.x).toBeCloseTo(0.5, 2);
    expect(k.oben).toBeLessThan(PUPPE.schulterL.y);
    expect(k.unten).toBeGreaterThan(PUPPE.huefteL.y - 0.05);
    expect(k.unten).toBeLessThan(PUPPE.knieL!.y);
    expect(Math.abs(p.rot)).toBeLessThan(1);
  });

  it("lässt eine lange Hose von der Hüfte bis zu den Knöcheln reichen", () => {
    const p = platziereAmKoerper(teil("unterteile", "Jeans", 0.62), PUPPE, A, 1);
    const k = kanten(p, 0.62);
    expect(k.oben).toBeLessThan(PUPPE.huefteL.y);
    expect(k.unten).toBeGreaterThan(PUPPE.knoechelL!.y);
  });

  it("endet Shorts über dem Knie", () => {
    const p = platziereAmKoerper(teil("unterteile", "Shorts", 1.05), PUPPE, A, 1);
    expect(kanten(p, 1.05).unten).toBeLessThan(PUPPE.knieL!.y);
  });

  it("stellt Schuhe an die Füße", () => {
    const p = platziereAmKoerper(teil("schuhe", "Sneaker", 1.5), PUPPE, A, 2);
    expect(p.y).toBeGreaterThan(PUPPE.knoechelL!.y);
    expect(p.x).toBeCloseTo(0.5, 2);
  });

  it("dreht das Oberteil mit schrägen Schultern", () => {
    const schief: Koerper = { ...PUPPE, schulterL: { x: 0.656, y: 0.22 }, schulterR: { x: 0.344, y: 0.17 } };
    expect(platziereAmKoerper(teil("oberteile"), schief, A, 3).rot).toBeGreaterThan(5);
  });

  it("hängt eine Tasche an die Hand", () => {
    const p = platziereAmKoerper(teil("accessoires", "Tasche", 1), PUPPE, A, 5);
    expect(p.x).toBeGreaterThan(0.7);
  });

  it("verwirft unplausible Erkennungen", () => {
    expect(koerperPlausibel(PUPPE)).toBe(true);
    expect(koerperPlausibel({ ...PUPPE, huefteL: { x: 0.6, y: 0.2 }, huefteR: { x: 0.4, y: 0.2 } })).toBe(false);
  });
});
