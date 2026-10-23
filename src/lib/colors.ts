// Farberkennung: dominante Farben eines freigestellten Kleidungsstücks finden
// und auf eine kleine, modisch sinnvolle Palette mit deutschen Namen abbilden.
import type { ColorTag } from "./model";

export interface PaletteColor {
  name: string;
  hex: string;
  /** passt als Basis zu fast allem */
  neutral: boolean;
  /** Farbfamilie für Ton-in-Ton-Erkennung */
  family: string;
}

export const PALETTE: PaletteColor[] = [
  { name: "Schwarz", hex: "#1b1b1b", neutral: true, family: "schwarz" },
  { name: "Anthrazit", hex: "#3d3e41", neutral: true, family: "grau" },
  { name: "Grau", hex: "#8b8d90", neutral: true, family: "grau" },
  { name: "Hellgrau", hex: "#c8c9cb", neutral: true, family: "grau" },
  { name: "Weiß", hex: "#f3f3f0", neutral: true, family: "weiss" },
  { name: "Creme", hex: "#ece2cc", neutral: true, family: "beige" },
  { name: "Beige", hex: "#d2bf9d", neutral: true, family: "beige" },
  { name: "Camel", hex: "#b88a56", neutral: true, family: "braun" },
  { name: "Braun", hex: "#6a4932", neutral: true, family: "braun" },
  { name: "Oliv", hex: "#66683c", neutral: true, family: "gruen" },
  { name: "Khaki", hex: "#a39a6a", neutral: true, family: "beige" },
  { name: "Navy", hex: "#1f2a44", neutral: true, family: "blau" },
  { name: "Denim", hex: "#4d6685", neutral: true, family: "blau" },
  { name: "Blau", hex: "#2e5ea8", neutral: false, family: "blau" },
  { name: "Hellblau", hex: "#a9c7e6", neutral: false, family: "blau" },
  { name: "Petrol", hex: "#1f5e66", neutral: false, family: "gruen" },
  { name: "Grün", hex: "#3d7b4c", neutral: false, family: "gruen" },
  { name: "Mint", hex: "#a8d8c2", neutral: false, family: "gruen" },
  { name: "Lila", hex: "#6a4b8a", neutral: false, family: "lila" },
  { name: "Flieder", hex: "#c4b2e0", neutral: false, family: "lila" },
  { name: "Pink", hex: "#df78a0", neutral: false, family: "rosa" },
  { name: "Rosa", hex: "#efc5cf", neutral: false, family: "rosa" },
  { name: "Rot", hex: "#b7312e", neutral: false, family: "rot" },
  { name: "Bordeaux", hex: "#6c1f2b", neutral: false, family: "rot" },
  { name: "Orange", hex: "#df7a38", neutral: false, family: "orange" },
  { name: "Terrakotta", hex: "#b45a3c", neutral: false, family: "orange" },
  { name: "Gelb", hex: "#e8c546", neutral: false, family: "gelb" },
  { name: "Senf", hex: "#c39a2b", neutral: false, family: "gelb" },
];

export const PALETTE_BY_NAME = Object.fromEntries(PALETTE.map((p) => [p.name, p])) as Record<string, PaletteColor>;

type RGB = [number, number, number];
type Lab = [number, number, number];

export function hexToRgb(hex: string): RGB {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function rgbToHex([r, g, b]: RGB): string {
  return "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
}

function lin(c: number): number {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

export function rgbToLab([r, g, b]: RGB): Lab {
  const R = lin(r), G = lin(g), B = lin(b);
  const x = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
  const y = R * 0.2126 + G * 0.7152 + B * 0.0722;
  const z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(x), fy = f(y), fz = f(z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

/** CIEDE2000-Farbabstand */
export function deltaE([L1, a1, b1]: Lab, [L2, a2, b2]: Lab): number {
  const rad = Math.PI / 180;
  const C1 = Math.hypot(a1, b1), C2 = Math.hypot(a2, b2);
  const Cb = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Cb ** 7 / (Cb ** 7 + 25 ** 7)));
  const a1p = (1 + G) * a1, a2p = (1 + G) * a2;
  const C1p = Math.hypot(a1p, b1), C2p = Math.hypot(a2p, b2);
  const h = (b: number, a: number) => {
    if (a === 0 && b === 0) return 0;
    const v = Math.atan2(b, a) / rad;
    return v < 0 ? v + 360 : v;
  };
  const h1p = h(b1, a1p), h2p = h(b2, a2p);
  const dLp = L2 - L1;
  const dCp = C2p - C1p;
  let dhp = 0;
  if (C1p * C2p !== 0) {
    dhp = h2p - h1p;
    if (dhp > 180) dhp -= 360;
    else if (dhp < -180) dhp += 360;
  }
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp / 2) * rad);
  const Lbp = (L1 + L2) / 2;
  const Cbp = (C1p + C2p) / 2;
  let hbp = h1p + h2p;
  if (C1p * C2p !== 0) {
    if (Math.abs(h1p - h2p) > 180) hbp = h1p + h2p < 360 ? (h1p + h2p + 360) / 2 : (h1p + h2p - 360) / 2;
    else hbp = (h1p + h2p) / 2;
  }
  const T =
    1 - 0.17 * Math.cos((hbp - 30) * rad) + 0.24 * Math.cos(2 * hbp * rad) +
    0.32 * Math.cos((3 * hbp + 6) * rad) - 0.2 * Math.cos((4 * hbp - 63) * rad);
  const dTheta = 30 * Math.exp(-(((hbp - 275) / 25) ** 2));
  const Rc = 2 * Math.sqrt(Cbp ** 7 / (Cbp ** 7 + 25 ** 7));
  const Sl = 1 + (0.015 * (Lbp - 50) ** 2) / Math.sqrt(20 + (Lbp - 50) ** 2);
  const Sc = 1 + 0.045 * Cbp;
  const Sh = 1 + 0.015 * Cbp * T;
  const Rt = -Math.sin(2 * dTheta * rad) * Rc;
  return Math.sqrt((dLp / Sl) ** 2 + (dCp / Sc) ** 2 + (dHp / Sh) ** 2 + Rt * (dCp / Sc) * (dHp / Sh));
}

const PALETTE_LAB = PALETTE.map((p) => ({ p, lab: rgbToLab(hexToRgb(p.hex)) }));

export function nearestPalette(rgb: RGB): PaletteColor {
  const lab = rgbToLab(rgb);
  let best = PALETTE_LAB[0];
  let bestD = Infinity;
  for (const e of PALETTE_LAB) {
    const d = deltaE(lab, e.lab);
    if (d < bestD) {
      bestD = d;
      best = e;
    }
  }
  return best.p;
}

/** Farbton (0–360) und Sättigung (0–1) einer Hex-Farbe. */
export function hueSat(hex: string): { h: number; s: number; l: number } {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60;
  return { h, s, l };
}

export interface PixelSource {
  data: Uint8ClampedArray | number[];
  width: number;
  height: number;
}

/**
 * Dominante Farben über k-means im Lab-Raum.
 * Transparente Pixel (freigestellter Hintergrund) werden ignoriert. Ohne
 * Transparenz wird nur der mittlere Bildbereich ausgewertet.
 */
export function extractColors(src: PixelSource, maxColors = 3): ColorTag[] {
  const { data, width, height } = src;
  let hasAlpha = false;
  for (let i = 3; i < data.length; i += 4 * 37) {
    if (data[i] < 250) {
      hasAlpha = true;
      break;
    }
  }
  const samples: Lab[] = [];
  const rgbs: RGB[] = [];
  const target = 4000;
  const step = Math.max(1, Math.floor(Math.sqrt((width * height) / target)));
  const x0 = hasAlpha ? 0 : Math.floor(width * 0.2), x1 = hasAlpha ? width : Math.ceil(width * 0.8);
  const y0 = hasAlpha ? 0 : Math.floor(height * 0.2), y1 = hasAlpha ? height : Math.ceil(height * 0.8);
  const deckend = (x: number, y: number) => x < 0 || y < 0 || x >= width || y >= height || data[(y * width + x) * 4 + 3] >= 250;
  for (let y = y0; y < y1; y += step) {
    for (let x = x0; x < x1; x += step) {
      const i = (y * width + x) * 4;
      if (data[i + 3] < 250) continue;
      // Kantenpixel (halbtransparenter Saum vom Freistellen) auslassen
      if (hasAlpha && !(deckend(x - 2, y) && deckend(x + 2, y) && deckend(x, y - 2) && deckend(x, y + 2))) continue;
      const rgb: RGB = [data[i], data[i + 1], data[i + 2]];
      rgbs.push(rgb);
      samples.push(rgbToLab(rgb));
    }
  }
  if (samples.length === 0) return [];

  // k-means, deterministisch initialisiert über gleichmäßig verteilte Stichproben
  const k = Math.min(6, samples.length);
  let centers: Lab[] = Array.from({ length: k }, (_, i) => samples[Math.floor((i * samples.length) / k)]);
  const assign = new Array<number>(samples.length).fill(0);
  for (let iter = 0; iter < 14; iter++) {
    for (let i = 0; i < samples.length; i++) {
      let best = 0, bestD = Infinity;
      for (let c = 0; c < k; c++) {
        const s = samples[i], z = centers[c];
        const d = (s[0] - z[0]) ** 2 + (s[1] - z[1]) ** 2 + (s[2] - z[2]) ** 2;
        if (d < bestD) {
          bestD = d;
          best = c;
        }
      }
      assign[i] = best;
    }
    const sums = Array.from({ length: k }, () => [0, 0, 0, 0]);
    for (let i = 0; i < samples.length; i++) {
      const s = sums[assign[i]];
      s[0] += samples[i][0];
      s[1] += samples[i][1];
      s[2] += samples[i][2];
      s[3]++;
    }
    centers = sums.map((s, c) => (s[3] ? [s[0] / s[3], s[1] / s[3], s[2] / s[3]] : centers[c]));
  }

  // Cluster, die sich nur in der Helligkeit unterscheiden (Falten, Schatten, Lichtkanten),
  // zum größten Cluster derselben Farbe zusammenfassen
  interface Gruppe { lab: Lab; count: number; r: number; g: number; b: number }
  const cluster: Gruppe[] = centers.map((lab) => ({ lab, count: 0, r: 0, g: 0, b: 0 }));
  for (let i = 0; i < samples.length; i++) {
    const c = cluster[assign[i]];
    c.count++;
    c.r += rgbs[i][0];
    c.g += rgbs[i][1];
    c.b += rgbs[i][2];
  }
  const gruppen: Gruppe[] = [];
  for (const c of cluster.filter((c) => c.count).sort((a, b) => b.count - a.count)) {
    const chroma = (l: Lab) => Math.hypot(l[1], l[2]);
    const ziel = gruppen.find((g) => {
      const dab = Math.hypot(g.lab[1] - c.lab[1], g.lab[2] - c.lab[2]);
      const dL = Math.abs(g.lab[0] - c.lab[0]);
      const neutral = chroma(g.lab) < 10 && chroma(c.lab) < 10;
      return neutral ? dL < 16 : dab < 12 + Math.min(chroma(g.lab), chroma(c.lab)) * 0.25 && dL < 45;
    });
    if (ziel) {
      ziel.count += c.count;
      ziel.r += c.r;
      ziel.g += c.g;
      ziel.b += c.b;
    } else gruppen.push({ ...c });
  }

  // Benennung über die Farbe des dominanten Clusters (nicht über den Mittelwert inkl. Schatten)
  const byName = new Map<string, { count: number; hex: string }>();
  for (const g of gruppen) {
    const name = nearestPalette(labToRgb(g.lab)).name;
    const e = byName.get(name);
    if (e) e.count += g.count;
    else byName.set(name, { count: g.count, hex: rgbToHex([g.r / g.count, g.g / g.count, g.b / g.count]) });
  }
  return [...byName.entries()]
    .map(([name, e]) => ({ name, hex: e.hex, share: e.count / samples.length }))
    .filter((c) => c.share >= 0.1)
    .sort((a, b) => b.share - a.share)
    .slice(0, maxColors);
}

export function labToRgb([L, a, b]: Lab): RGB {
  const fy = (L + 16) / 116, fx = fy + a / 500, fz = fy - b / 200;
  const finv = (t: number) => (t ** 3 > 0.008856 ? t ** 3 : (t - 16 / 116) / 7.787);
  const x = finv(fx) * 0.95047, y = finv(fy), z = finv(fz) * 1.08883;
  const R = x * 3.2406 + y * -1.5372 + z * -0.4986;
  const G = x * -0.9689 + y * 1.8758 + z * 0.0415;
  const B = x * 0.0557 + y * -0.204 + z * 1.057;
  const g = (c: number) => {
    const v = c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
    return Math.max(0, Math.min(255, v * 255));
  };
  return [g(R), g(G), g(B)];
}
