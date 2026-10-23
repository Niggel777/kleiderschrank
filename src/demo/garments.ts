// Generierte Flat-Lay-Illustrationen für den Beispiel-Schrank (SVG → PNG).

export type Form =
  | "tshirt" | "longsleeve" | "pullover" | "hoodie" | "hemd" | "hose" | "jeans" | "shorts" | "rock"
  | "kleid" | "jacke" | "mantel" | "blazer" | "sneaker" | "boots" | "tasche" | "muetze" | "guertel";

interface Shape {
  w: number;
  h: number;
  body: string;
  /** Nähte, Kanten, Details (werden in dunklerer Stofffarbe gezeichnet) */
  details: string;
  /** Flächen in Akzentfarbe (z. B. Sohle, Knöpfe) */
  extra?: { d: string; fill: string }[];
  /** Ziernähte in Kontrastfarbe (Jeans) */
  stitch?: string;
}

function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (s: number) => {
    const v = (n >> s) & 255;
    const t = f < 0 ? v * (1 + f) : v + (255 - v) * f;
    return Math.round(Math.max(0, Math.min(255, t))).toString(16).padStart(2, "0");
  };
  return `#${ch(16)}${ch(8)}${ch(0)}`;
}

function shapes(farbe: string): Record<Form, Shape> {
  const sohle = "#f2f0ea";
  const knopf = shade(farbe, -0.35);
  return {
    tshirt: {
      w: 400, h: 460,
      body: "M142 40 Q200 78 258 40 L334 66 L392 150 L334 188 L312 160 L314 438 Q200 452 86 438 L88 160 L66 188 L8 150 L66 66 Z",
      details: "M142 40 Q200 92 258 40 M88 160 L66 66 M312 160 L334 66 M66 188 L8 150 M334 188 L392 150 M90 424 Q200 438 310 424",
    },
    longsleeve: {
      w: 400, h: 480,
      body: "M142 36 Q200 72 258 36 L326 58 Q356 70 364 112 L394 440 L346 450 L314 178 L314 462 Q200 476 86 462 L86 178 L54 450 L6 440 L36 112 Q44 70 74 58 Z",
      details: "M142 36 Q200 88 258 36 M86 178 L74 58 M314 178 L326 58 M10 412 L58 420 M390 412 L342 420 M88 446 Q200 460 312 446",
    },
    pullover: {
      w: 400, h: 480,
      body: "M136 34 Q200 64 264 34 L330 56 Q362 70 368 116 L396 436 L344 448 L316 184 L318 462 Q200 478 82 462 L84 184 L56 448 L4 436 L32 116 Q38 70 70 56 Z",
      details:
        "M136 34 Q200 84 264 34 M140 44 Q200 92 260 44 M84 184 L70 56 M316 184 L330 56 M8 404 L60 414 M8 418 L60 428 M392 404 L340 414 M392 418 L340 428 M84 432 Q200 446 316 432 M84 446 Q200 460 316 446",
    },
    hoodie: {
      w: 400, h: 500,
      body: "M150 70 Q130 10 200 4 Q270 10 250 70 L330 82 Q362 96 368 140 L396 456 L344 468 L316 208 L318 482 Q200 498 82 482 L84 208 L56 468 L4 456 L32 140 Q38 96 70 82 Z",
      details:
        "M150 70 Q200 112 250 70 M168 70 Q200 30 232 70 M188 92 L184 170 M212 92 L216 170 M120 330 L280 330 L300 420 L100 420 Z M84 208 L70 82 M316 208 L330 82 M84 452 Q200 466 316 452",
      extra: [
        { d: "M181 166 h6 v14 h-6 z", fill: shade(farbe, -0.4) },
        { d: "M213 166 h6 v14 h-6 z", fill: shade(farbe, -0.4) },
      ],
    },
    hemd: {
      w: 400, h: 490,
      body: "M150 38 L174 20 L200 34 L226 20 L250 38 L322 60 Q352 72 360 114 L392 444 L346 454 L314 184 L316 466 Q200 482 84 466 L86 184 L54 454 L8 444 L40 114 Q48 72 78 60 Z",
      details:
        "M150 38 L186 74 L200 46 L214 74 L250 38 M200 46 L200 470 M206 46 L206 470 M86 184 L78 60 M314 184 L322 60 M12 412 L56 420 M388 412 L344 420 M110 120 h56 v44 h-56 z",
      extra: [100, 160, 220, 280, 340, 400].map((y) => ({ d: `M211 ${y} a4 4 0 1 0 0.1 0 z`, fill: shade(farbe, -0.25) })),
    },
    hose: {
      w: 340, h: 520,
      body: "M62 20 L278 20 L292 508 L196 508 L172 178 L148 508 L48 508 Z",
      details: "M62 52 L278 52 M172 52 L172 178 M100 52 Q110 100 72 110 M240 52 Q230 100 268 110 M120 60 L118 500 M222 60 L224 500",
    },
    jeans: {
      w: 340, h: 520,
      body: "M62 20 L278 20 L292 508 L196 508 L172 178 L148 508 L48 508 Z",
      details: "M62 52 L278 52 M172 52 L172 178 M98 52 Q108 104 68 112 M242 52 Q232 104 272 112 M196 508 L172 178 L148 508",
      stitch: "M66 58 L274 58 M178 58 Q184 150 166 168 M104 58 Q114 110 70 120 M236 58 Q226 110 270 120 M54 494 L142 494 M200 494 L286 494",
      extra: [{ d: "M166 30 a5 5 0 1 0 0.1 0 z", fill: "#b9a27a" }],
    },
    shorts: {
      w: 340, h: 320,
      body: "M58 20 L282 20 L310 288 L192 300 L172 150 L152 300 L30 288 Z",
      details: "M58 52 L282 52 M172 52 L172 150 M96 52 Q106 98 64 106 M244 52 Q234 98 276 106 M34 270 L150 282 M190 282 L306 270",
    },
    rock: {
      w: 360, h: 420,
      body: "M100 20 L260 20 L338 386 Q180 414 22 386 Z",
      details: "M100 50 L260 50 M150 50 L120 398 M210 50 L240 398 M180 50 L180 404",
    },
    kleid: {
      w: 380, h: 540,
      body: "M136 20 L154 20 L166 112 L214 112 L226 20 L244 20 L256 150 Q270 196 250 226 L352 508 Q190 536 28 508 L130 226 Q110 196 124 150 Z",
      details: "M130 226 Q190 240 250 226 M166 112 Q190 124 214 112 M190 240 L190 520 M150 236 L110 512 M230 236 L270 512",
    },
    jacke: {
      w: 420, h: 500,
      body: "M150 34 L188 54 L210 70 L232 54 L270 34 L340 58 Q372 72 378 118 L410 452 L360 462 L328 196 L330 476 Q210 490 90 476 L92 196 L60 462 L10 452 L42 118 Q48 72 80 58 Z",
      details:
        "M150 34 L176 120 L210 70 L244 120 L270 34 M210 70 L210 482 M92 196 L80 58 M328 196 L340 58 M14 420 L62 428 M406 420 L358 428 M116 300 L176 300 M244 300 L304 300 M92 456 Q210 470 328 456",
      extra: [130, 230, 330].map((y) => ({ d: `M222 ${y} a6 6 0 1 0 0.1 0 z`, fill: knopf })),
    },
    mantel: {
      w: 420, h: 600,
      body: "M150 34 L188 50 L210 64 L232 50 L270 34 L340 58 Q372 72 378 118 L410 500 L360 510 L330 200 L346 584 Q210 600 74 584 L90 200 L60 510 L10 500 L42 118 Q48 72 80 58 Z",
      details:
        "M150 34 L170 150 L210 64 L250 150 L270 34 M222 64 L222 590 M90 200 L80 58 M330 200 L340 58 M14 470 L62 478 M406 470 L358 478 M110 360 L170 352 M250 352 L310 360",
      extra: [170, 260, 350, 440].flatMap((y) => [
        { d: `M240 ${y} a7 7 0 1 0 0.1 0 z`, fill: knopf },
      ]),
    },
    blazer: {
      w: 420, h: 500,
      body: "M150 34 L188 50 L210 62 L232 50 L270 34 L340 58 Q372 72 378 118 L410 452 L360 462 L328 196 L332 470 Q270 488 210 480 Q150 488 88 470 L92 196 L60 462 L10 452 L42 118 Q48 72 80 58 Z",
      details:
        "M150 34 L158 96 L140 118 L196 250 L210 62 L224 250 L280 118 L262 96 L270 34 M196 250 L210 480 M92 196 L80 58 M328 196 L340 58 M112 330 L172 326 M248 326 L308 330 M270 150 L300 148",
      extra: [{ d: "M214 300 a6 6 0 1 0 0.1 0 z", fill: knopf }, { d: "M214 350 a6 6 0 1 0 0.1 0 z", fill: knopf }],
    },
    sneaker: {
      w: 460, h: 300,
      body: "M30 196 Q28 150 74 140 L160 96 Q196 80 220 106 L262 150 Q352 160 412 196 Q438 214 424 244 L36 248 Q24 236 30 196 Z",
      details: "M160 96 Q170 150 150 200 M180 116 L236 150 M172 132 L226 164 M164 148 L214 178 M262 150 Q300 190 300 236 M74 140 Q66 190 80 234",
      extra: [
        { d: "M26 226 L426 226 Q434 248 420 262 L40 266 Q22 254 26 226 Z", fill: sohle },
        { d: "M300 182 Q340 186 372 204", fill: "none" },
      ],
    },
    boots: {
      w: 400, h: 420,
      body: "M110 20 L240 20 L244 236 Q330 248 372 300 Q390 330 372 352 L60 356 Q46 344 52 300 L70 236 Q90 140 110 20 Z",
      details: "M110 20 L240 20 M160 40 L180 236 M150 70 L200 70 M146 100 L198 100 M142 130 L196 130 M138 160 L194 160 M244 236 Q240 290 260 330",
      extra: [{ d: "M48 336 L376 336 Q384 360 370 376 L58 380 Q40 368 48 336 Z", fill: shade(farbe, -0.55) }],
    },
    tasche: {
      w: 400, h: 400,
      body: "M60 150 Q60 130 80 130 L320 130 Q340 130 340 150 L356 360 Q356 380 336 380 L64 380 Q44 380 44 360 Z",
      details: "M60 190 L340 190 M200 190 L200 230 M80 130 Q200 -10 320 130",
      extra: [
        { d: "M188 222 h24 v18 h-24 z", fill: "#c9b27a" },
        { d: "M96 134 Q200 30 304 134 L292 134 Q200 46 108 134 Z", fill: shade(farbe, -0.2) },
      ],
    },
    guertel: {
      w: 560, h: 110,
      body: "M84 30 L540 30 Q556 30 556 46 L556 74 Q556 90 540 90 L84 90 Z",
      details: "M92 38 L548 38 M92 82 L548 82",
      extra: [
        { d: "M18 18 L96 18 Q108 18 108 30 L108 90 Q108 102 96 102 L18 102 Q6 102 6 90 L6 30 Q6 18 18 18 Z M24 34 L24 86 L90 86 L90 34 Z", fill: "#b9b3a6" },
        { d: "M22 57 L110 57 L110 63 L22 63 Z", fill: "#a39d90" },
        ...[380, 414, 448, 482].map((x) => ({ d: `M${x} 60 a5 5 0 1 0 0.1 0 z`, fill: shade(farbe, -0.5) })),
      ],
    },
    muetze: {
      w: 360, h: 320,
      body: "M40 220 Q40 40 180 30 Q320 40 320 220 L330 290 Q180 310 30 290 Z",
      details: "M36 222 Q180 240 324 222 M60 240 L58 288 M100 244 L100 294 M140 246 L140 298 M180 248 L180 300 M220 246 L220 298 M260 244 L260 294 M300 240 L302 288",
    },
  };
}

export function garmentSvg(form: Form, farbe: string, opts: { streifen?: string; detail?: string } = {}): { svg: string; w: number; h: number } {
  const s = shapes(farbe)[form];
  const dunkel = shade(farbe, -0.32);
  const hell = shade(farbe, 0.12);
  const linie = opts.detail ?? dunkel;
  const id = Math.random().toString(36).slice(2, 8);
  const pad = 30;
  const W = s.w + pad * 2, H = s.h + pad * 2;
  const streifen = opts.streifen
    ? `<pattern id="st${id}" width="40" height="34" patternUnits="userSpaceOnUse"><rect width="40" height="15" y="10" fill="${opts.streifen}"/></pattern>`
    : "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(W * 1.5)}" height="${Math.round(H * 1.5)}" viewBox="${-pad} ${-pad} ${W} ${H}">
<defs>
<linearGradient id="g${id}" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="#fff" stop-opacity="0.22"/>
<stop offset="0.45" stop-color="#fff" stop-opacity="0"/>
<stop offset="1" stop-color="#000" stop-opacity="0.16"/>
</linearGradient>
<radialGradient id="r${id}" cx="0.5" cy="0.35" r="0.7">
<stop offset="0" stop-color="#fff" stop-opacity="0.10"/>
<stop offset="1" stop-color="#000" stop-opacity="0.06"/>
</radialGradient>
<filter id="t${id}" x="0" y="0" width="100%" height="100%">
<feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="7"/>
<feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.09 0"/>
<feComposite in2="SourceGraphic" operator="in"/>
</filter>
<clipPath id="c${id}"><path d="${s.body}"/></clipPath>
${streifen}
</defs>
<path d="${s.body}" fill="${farbe}"/>
${opts.streifen ? `<rect x="0" y="0" width="${s.w}" height="${s.h}" fill="url(#st${id})" clip-path="url(#c${id})"/>` : ""}
<g clip-path="url(#c${id})">
<rect x="0" y="0" width="${s.w}" height="${s.h}" fill="url(#r${id})"/>
<rect x="0" y="0" width="${s.w}" height="${s.h}" fill="url(#g${id})"/>
<rect x="0" y="0" width="${s.w}" height="${s.h}" fill="${hell}" filter="url(#t${id})"/>
</g>
${(s.extra ?? []).map((e) => `<path d="${e.d}" fill="${e.fill}" ${e.fill === "none" ? `stroke="${dunkel}" stroke-width="3" stroke-linecap="round"` : ""}/>`).join("")}
<path d="${s.details}" fill="none" stroke="${linie}" stroke-opacity="0.55" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
${s.stitch ? `<path d="${s.stitch}" fill="none" stroke="#d29a4a" stroke-opacity="0.85" stroke-width="2" stroke-dasharray="6 5" stroke-linecap="round"/>` : ""}
<path d="${s.body}" fill="none" stroke="${dunkel}" stroke-opacity="0.35" stroke-width="1.5"/>
</svg>`;
  return { svg, w: Math.round(W * 1.5), h: Math.round(H * 1.5) };
}

/** Neutrale Schneiderpuppe für die Umkleide, falls noch kein eigenes Foto da ist. */
export function mannequinSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1600" viewBox="0 0 900 1600">
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#efece6"/><stop offset="1" stop-color="#e2ddd4"/></linearGradient>
<linearGradient id="k" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#d9d3c8"/><stop offset="0.5" stop-color="#ece7de"/><stop offset="1" stop-color="#d4cec2"/></linearGradient>
<radialGradient id="boden" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#000" stop-opacity="0.12"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
</defs>
<rect width="900" height="1600" fill="url(#bg)"/>
<ellipse cx="450" cy="1540" rx="260" ry="34" fill="url(#boden)"/>
<g fill="url(#k)" stroke="#c9c2b5" stroke-width="2">
<ellipse cx="450" cy="142" rx="80" ry="98"/>
<path d="M416 228 L484 228 L492 292 L408 292 Z"/>
<path d="M286 292 Q450 262 614 292 Q674 306 684 368 L714 724 Q718 754 692 758 L662 760 L620 424 L604 650 Q598 770 602 900 L298 900 Q302 770 296 650 L280 424 L238 760 L208 758 Q182 754 186 724 L216 368 Q226 306 286 292 Z"/>
<path d="M298 900 L602 900 L598 1000 L562 1500 Q556 1530 526 1530 L488 1530 Q472 1530 472 1500 L456 1040 L444 1040 L428 1500 Q428 1530 412 1530 L374 1530 Q344 1530 338 1500 L302 1000 Z"/>
</g>
</svg>`;
}

export async function svgToPng(svg: string, w: number, h: number): Promise<Blob> {
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    const img = new Image();
    img.width = w;
    img.height = h;
    img.src = url;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    c.getContext("2d")!.drawImage(img, 0, 0, w, h);
    return await new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("PNG"))), "image/png"));
  } finally {
    URL.revokeObjectURL(url);
  }
}
