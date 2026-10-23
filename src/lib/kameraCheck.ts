// Live-Check fürs Kamerabild: genug Licht, scharf, ruhiger Untergrund am Rand.
// Arbeitet auf einem kleinen Vorschaubild (z. B. 160 px breit) – schnell genug für jedes Bild.

export type Stufe = "gut" | "ok" | "schlecht";

export interface Bewertung {
  licht: Stufe;
  schaerfe: Stufe;
  untergrund: Stufe;
  /** kurzer Hinweis für den Nutzer, null wenn alles passt */
  tipp: string | null;
}

interface Bild {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

function grau(b: Bild): Float32Array {
  const g = new Float32Array(b.width * b.height);
  for (let i = 0; i < g.length; i++) g[i] = 0.299 * b.data[i * 4] + 0.587 * b.data[i * 4 + 1] + 0.114 * b.data[i * 4 + 2];
  return g;
}

/** Varianz des Laplace-Filters – klassisches Schärfemaß (verwackelt/unscharf = klein). */
export function schaerfeWert(b: Bild): number {
  const g = grau(b), w = b.width, h = b.height;
  let s = 0, s2 = 0, n = 0;
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const l = g[i - 1] + g[i + 1] + g[i - w] + g[i + w] - 4 * g[i];
      s += l;
      s2 += l * l;
      n++;
    }
  if (!n) return 0;
  const m = s / n;
  return s2 / n - m * m;
}

export function bewerte(b: Bild): Bewertung {
  const g = grau(b), w = b.width, h = b.height;
  let summe = 0, hell = 0, dunkel = 0;
  for (const v of g) {
    summe += v;
    if (v > 250) hell++;
    if (v < 18) dunkel++;
  }
  const mittel = summe / g.length;
  const licht: Stufe =
    mittel < 55 || dunkel / g.length > 0.5 ? "schlecht" : mittel < 85 || hell / g.length > 0.25 ? "ok" : "gut";

  const sw = schaerfeWert(b);
  const schaerfe: Stufe = sw < 10 ? "schlecht" : sw < 30 ? "ok" : "gut";

  // Randstreifen (8 %) – dort sollte nur Untergrund sein; starke Kanten = unruhig/Gegenstände
  const r = Math.max(2, Math.round(Math.min(w, h) * 0.08));
  let k = 0, kn = 0;
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      if (x >= r && x < w - r && y >= r && y < h - r) continue;
      const i = y * w + x;
      const gx = g[i + 1] - g[i - 1], gy = g[i + w] - g[i - w];
      if (gx * gx + gy * gy > 900) k++;
      kn++;
    }
  const unruhe = kn ? k / kn : 0;
  const untergrund: Stufe = unruhe > 0.12 ? "schlecht" : unruhe > 0.05 ? "ok" : "gut";

  const tipp =
    licht === "schlecht"
      ? mittel < 55
        ? "Zu dunkel – geh näher ans Fenster oder mach Licht an."
        : "Zu viel Schatten – Teil gleichmäßiger ausleuchten."
      : schaerfe === "schlecht"
        ? "Unscharf – Handy kurz ruhig halten oder auf das Teil tippen."
        : untergrund === "schlecht"
          ? "Unruhiger Rand – Teil mittig auf einen freien, einfarbigen Untergrund legen."
          : licht === "ok" && hell / g.length > 0.25
            ? "Etwas überbelichtet – direkte Sonne oder Blitz vermeiden."
            : null;
  return { licht, schaerfe, untergrund, tipp };
}
