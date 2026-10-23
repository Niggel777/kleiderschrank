// Packshot-Nachbearbeitung nach dem Freistellen (wie Produktfotos im Onlineshop):
// Reste entfernen, Löcher füllen, Kanten glätten und entfärben, schiefe Teile geraderücken.
// Reine Funktionen auf RGBA-Pixeldaten – testbar ohne Browser.

export interface Pixel {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

const DECKEND = 128;

/** Zusammenhängende Flächen (4er-Nachbarschaft) einer Maske beschriften. */
function flaechen(maske: Uint8Array, w: number, h: number): { label: Int32Array; groessen: number[] } {
  const label = new Int32Array(w * h).fill(-1);
  const groessen: number[] = [];
  const stapel: number[] = [];
  for (let start = 0; start < w * h; start++) {
    if (!maske[start] || label[start] !== -1) continue;
    const id = groessen.length;
    let n = 0;
    stapel.push(start);
    label[start] = id;
    while (stapel.length) {
      const p = stapel.pop()!;
      n++;
      const x = p % w;
      if (x > 0 && maske[p - 1] && label[p - 1] === -1) (label[p - 1] = id), stapel.push(p - 1);
      if (x < w - 1 && maske[p + 1] && label[p + 1] === -1) (label[p + 1] = id), stapel.push(p + 1);
      if (p >= w && maske[p - w] && label[p - w] === -1) (label[p - w] = id), stapel.push(p - w);
      if (p < (h - 1) * w && maske[p + w] && label[p + w] === -1) (label[p + w] = id), stapel.push(p + w);
    }
    groessen.push(n);
  }
  return { label, groessen };
}

/** Entfernt lose Reste (Fussel, Bodenstücke), behält das Teil und größere zugehörige Stücke. */
export function entferneInseln(px: Pixel, minAnteil = 0.03): number {
  const { data, width: w, height: h } = px;
  const maske = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) maske[i] = data[i * 4 + 3] >= DECKEND ? 1 : 0;
  const { label, groessen } = flaechen(maske, w, h);
  if (groessen.length <= 1) return 0;
  const groesste = Math.max(...groessen);
  let entfernt = 0;
  for (let i = 0; i < w * h; i++) {
    const l = label[i];
    if (l >= 0 && groessen[l] < groesste * minAnteil) {
      data[i * 4 + 3] = 0;
      entfernt++;
    }
  }
  return entfernt;
}

/** Füllt kleine Löcher im Teil (vom Modell fälschlich ausgeschnitten); große Öffnungen bleiben. */
export function fuelleLoecher(px: Pixel, maxAnteil = 0.004): number {
  const { data, width: w, height: h } = px;
  const leer = new Uint8Array(w * h);
  let teil = 0;
  for (let i = 0; i < w * h; i++) {
    const a = data[i * 4 + 3];
    leer[i] = a < DECKEND ? 1 : 0;
    if (a >= DECKEND) teil++;
  }
  const { label, groessen } = flaechen(leer, w, h);
  // Flächen, die den Rand berühren, sind Hintergrund
  const rand = new Set<number>();
  for (let x = 0; x < w; x++) {
    rand.add(label[x]);
    rand.add(label[(h - 1) * w + x]);
  }
  for (let y = 0; y < h; y++) {
    rand.add(label[y * w]);
    rand.add(label[y * w + w - 1]);
  }
  let gefuellt = 0;
  for (let i = 0; i < w * h; i++) {
    const l = label[i];
    if (l < 0 || rand.has(l) || groessen[l] > teil * maxAnteil) continue;
    // Farbe vom nächsten deckenden Nachbarn übernehmen
    const x = i % w, y = (i / w) | 0;
    let r = 0, g = 0, b = 0, n = 0;
    for (let d = 1; d <= 6 && !n; d++) {
      for (const [dx, dy] of [[d, 0], [-d, 0], [0, d], [0, -d]]) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        const j = (yy * w + xx) * 4;
        if (data[j + 3] >= DECKEND) {
          r += data[j];
          g += data[j + 1];
          b += data[j + 2];
          n++;
        }
      }
    }
    if (n) {
      data[i * 4] = r / n;
      data[i * 4 + 1] = g / n;
      data[i * 4 + 2] = b / n;
    }
    data[i * 4 + 3] = 255;
    gefuellt++;
  }
  return gefuellt;
}

/**
 * Kanten säubern: halbtransparente Randpixel bekommen die Farbe des Stoffs statt des alten
 * Hintergrunds (kein heller/dunkler Saum), dazu ein sanft geglätteter Übergang.
 */
export function saeubereKanten(px: Pixel): void {
  const { data, width: w, height: h } = px;
  const alpha = new Uint8ClampedArray(w * h);
  for (let i = 0; i < w * h; i++) alpha[i] = data[i * 4 + 3];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const a = alpha[i];
      if (a === 0 || a === 255) continue;
      let r = 0, g = 0, b = 0, n = 0;
      for (let dy = -2; dy <= 2; dy++)
        for (let dx = -2; dx <= 2; dx++) {
          const xx = x + dx, yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          const j = yy * w + xx;
          if (alpha[j] >= 240) {
            r += data[j * 4];
            g += data[j * 4 + 1];
            b += data[j * 4 + 2];
            n++;
          }
        }
      if (n) {
        data[i * 4] = r / n;
        data[i * 4 + 1] = g / n;
        data[i * 4 + 2] = b / n;
      }
    }
  // Alpha leicht glätten (3×3), nur an Kanten
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const a = alpha[i];
      const nb = alpha[i - 1] + alpha[i + 1] + alpha[i - w] + alpha[i + w];
      if ((a === 0 && nb === 0) || (a === 255 && nb === 1020)) continue;
      data[i * 4 + 3] = (a * 4 + nb + alpha[i - w - 1] + alpha[i - w + 1] + alpha[i + w - 1] + alpha[i + w + 1]) / 12;
    }
}

/**
 * Neigung des Teils in Grad (Hauptachse gegen die Senkrechte), aus den Momenten der Maske.
 * Gibt 0 zurück, wenn die Form keine klare Achse hat oder fast gerade liegt.
 */
export function neigung(px: Pixel, max = 20): number {
  const { data, width: w, height: h } = px;
  let n = 0, sx = 0, sy = 0;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (data[(y * w + x) * 4 + 3] >= DECKEND) {
        n++;
        sx += x;
        sy += y;
      }
  if (n < 50) return 0;
  const mx = sx / n, my = sy / n;
  let mxx = 0, myy = 0, mxy = 0;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (data[(y * w + x) * 4 + 3] >= DECKEND) {
        const dx = x - mx, dy = y - my;
        mxx += dx * dx;
        myy += dy * dy;
        mxy += dx * dy;
      }
  const spur = mxx + myy, det = mxx * myy - mxy * mxy;
  const l1 = spur / 2 + Math.sqrt(Math.max(0, (spur * spur) / 4 - det));
  const l2 = spur / 2 - Math.sqrt(Math.max(0, (spur * spur) / 4 - det));
  if (l2 <= 0 || l1 / l2 < 1.35) return 0; // fast rund/quadratisch: keine verlässliche Achse
  // Winkel der Hauptachse zur x-Achse, dann Abweichung von der nächsten Senkrechten/Waagrechten
  const theta = (0.5 * Math.atan2(2 * mxy, mxx - myy) * 180) / Math.PI;
  let abw = theta - 90 * Math.round(theta / 90);
  if (Math.abs(abw) < 2 || Math.abs(abw) > max) abw = 0;
  return abw;
}
