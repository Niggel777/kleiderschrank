// Automatische Platzierung in der Umkleide: aus erkannten Körperpunkten
// (Schultern, Hüften, Knie, Knöchel, …) Position, Größe und Drehung je Teil berechnen.
import type { Item, LayoutPiece } from "./model";

export interface Punkt {
  x: number;
  y: number;
}

/** Körperpunkte relativ zum Foto (0–1). Fehlende Punkte = nicht sicher erkannt. */
export interface Koerper {
  nase?: Punkt;
  schulterL: Punkt;
  schulterR: Punkt;
  huefteL: Punkt;
  huefteR: Punkt;
  knieL?: Punkt;
  knieR?: Punkt;
  knoechelL?: Punkt;
  knoechelR?: Punkt;
  handL?: Punkt;
  handR?: Punkt;
}

/** Körperpunkte der eingebauten (männlichen) Schneiderpuppe (900 × 1600). */
export const PUPPE: Koerper = {
  nase: { x: 0.5, y: 0.1 },
  schulterL: { x: 0.667, y: 0.192 },
  schulterR: { x: 0.333, y: 0.192 },
  huefteL: { x: 0.6, y: 0.56 },
  huefteR: { x: 0.4, y: 0.56 },
  knieL: { x: 0.556, y: 0.781 },
  knieR: { x: 0.444, y: 0.781 },
  knoechelL: { x: 0.553, y: 0.9375 },
  knoechelR: { x: 0.447, y: 0.9375 },
  handL: { x: 0.744, y: 0.475 },
  handR: { x: 0.256, y: 0.475 },
};

const mitte = (a: Punkt, b: Punkt): Punkt => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

/**
 * Berechnet die Lage eines Teils auf dem Körper.
 * Gerechnet wird in Einheiten der Bildhöhe (X wird mit dem Seitenverhältnis A = Breite/Höhe gestreckt),
 * damit Abstände in beiden Richtungen vergleichbar sind.
 */
export function platziereAmKoerper(item: Item, k: Koerper, A: number, z: number): LayoutPiece {
  const P = (p: Punkt) => ({ X: p.x * A, Y: p.y });
  const sl = P(k.schulterL), sr = P(k.schulterR);
  const [links, rechts] = sl.X < sr.X ? [sl, sr] : [sr, sl];
  const schulter = { X: (sl.X + sr.X) / 2, Y: (sl.Y + sr.Y) / 2 };
  const huefte = P(mitte(k.huefteL, k.huefteR));
  const sW = Math.hypot(rechts.X - links.X, rechts.Y - links.Y);
  const hW = Math.abs(P(k.huefteL).X - P(k.huefteR).X);
  const torso = Math.max(0.05, huefte.Y - schulter.Y);
  const knie = k.knieL && k.knieR ? P(mitte(k.knieL, k.knieR)) : { X: huefte.X, Y: huefte.Y + torso * 0.95 };
  const knoechel = k.knoechelL && k.knoechelR ? P(mitte(k.knoechelL, k.knoechelR)) : { X: knie.X, Y: knie.Y + torso * 0.9 };
  const winkel = (Math.atan2(rechts.Y - links.Y, rechts.X - links.X) * 180) / Math.PI;
  const a = item.aspect || 0.8;

  // Ergebnis: Mittelpunkt (X, Y) und Breite in Höhen-Einheiten
  let X = schulter.X, Y = schulter.Y, B = sW, rot = 0;
  const vonOben = (oben: number, breite: number) => {
    B = breite;
    Y = oben + breite / a / 2;
  };
  const zwischen = (oben: number, unten: number) => {
    const h = Math.max(0.02, unten - oben);
    B = h * a;
    Y = oben + h / 2;
  };

  switch (item.category) {
    case "oberteile": {
      const ausBreite = sW * 2.3;
      const ausHoehe = torso * 1.3 * a;
      vonOben(schulter.Y - torso * 0.1, (ausBreite + ausHoehe) / 2);
      rot = winkel;
      break;
    }
    case "jacken": {
      const lang = item.sub === "Mantel";
      const ausBreite = sW * 2.5;
      const ausHoehe = (lang ? (knie.Y - schulter.Y) * 1.18 : torso * 1.38) * a;
      vonOben(schulter.Y - torso * 0.12, (ausBreite + ausHoehe) / 2);
      rot = winkel;
      break;
    }
    case "kleider": {
      const unten = item.sub === "Maxikleid" || item.sub === "Overall" || item.sub === "Anzug" ? knoechel.Y : knie.Y + (knoechel.Y - knie.Y) * 0.15;
      zwischen(schulter.Y - torso * 0.08, unten);
      rot = winkel;
      break;
    }
    case "unterteile": {
      X = huefte.X;
      const unten = item.sub === "Shorts" ? knie.Y - (knie.Y - huefte.Y) * 0.1 : item.sub === "Rock" ? knie.Y : knoechel.Y + torso * 0.04;
      zwischen(huefte.Y - torso * 0.14, unten);
      break;
    }
    case "schuhe": {
      X = knoechel.X;
      B = Math.max(hW * 1.35, sW * 0.7);
      Y = knoechel.Y + torso * 0.06;
      break;
    }
    case "accessoires": {
      if (item.sub === "Mütze" || item.sub === "Cap") {
        const nase = k.nase ? P(k.nase) : { X: schulter.X, Y: schulter.Y - torso * 0.35 };
        X = nase.X;
        B = sW * 0.62;
        Y = nase.Y - torso * 0.24;
      } else if (item.sub === "Sonnenbrille") {
        const nase = k.nase ? P(k.nase) : { X: schulter.X, Y: schulter.Y - torso * 0.3 };
        X = nase.X;
        B = sW * 0.45;
        Y = nase.Y - torso * 0.03;
      } else if (item.sub === "Schal") {
        B = sW * 1.0;
        Y = schulter.Y + torso * 0.12;
      } else if (item.sub === "Gürtel") {
        X = huefte.X;
        B = hW * 1.4;
        Y = huefte.Y - torso * 0.1;
      } else {
        // Tasche, Rucksack, Uhr, Schmuck: an die Hand auf der rechten Bildseite
        const haende = [k.handL, k.handR].filter(Boolean).map((p) => P(p!));
        const hand = haende.sort((p, q) => q.X - p.X)[0] ?? { X: rechts.X + sW * 0.2, Y: huefte.Y - torso * 0.1 };
        const klein = ["Uhr", "Schmuck"].includes(item.sub);
        X = hand.X + (klein ? 0 : sW * 0.12);
        B = sW * (klein ? 0.18 : 0.62);
        Y = hand.Y + (klein ? 0 : (B / a) * 0.38);
      }
      break;
    }
  }
  return { itemId: item.id, x: X / A, y: Y, w: B / A, rot, z, flip: false };
}

/** Plausibilitätsprüfung: steht da eine Person, die groß genug im Bild ist? */
export function koerperPlausibel(k: Koerper): boolean {
  const torso = (k.huefteL.y + k.huefteR.y) / 2 - (k.schulterL.y + k.schulterR.y) / 2;
  return torso > 0.08 && Math.abs(k.schulterL.x - k.schulterR.x) > 0.04;
}
