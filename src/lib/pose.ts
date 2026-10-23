// Körperpunkte im Foto erkennen (MediaPipe Pose Landmarker, läuft im Browser).
import type { Koerper, Punkt } from "./koerper";
import { loadBitmap } from "./image";

const VERSION = "0.10.21";
const WASM = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VERSION}/wasm`;
const MODELL = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task";

type Landmarker = import("@mediapipe/tasks-vision").PoseLandmarker;
let landmarker: Promise<Landmarker> | null = null;

function lade(): Promise<Landmarker> {
  return (landmarker ??= (async () => {
    const { FilesetResolver, PoseLandmarker } = await import("@mediapipe/tasks-vision");
    const files = await FilesetResolver.forVisionTasks(WASM);
    const opts = (delegate: "GPU" | "CPU") => ({
      baseOptions: { modelAssetPath: MODELL, delegate },
      runningMode: "IMAGE" as const,
      numPoses: 1,
      minPoseDetectionConfidence: 0.4,
    });
    try {
      return await PoseLandmarker.createFromOptions(files, opts("GPU"));
    } catch {
      return await PoseLandmarker.createFromOptions(files, opts("CPU"));
    }
  })().catch((e) => {
    landmarker = null;
    throw e;
  }));
}

/** Erkennt die Körperpunkte; null, wenn keine Person sicher erkannt wurde. */
export async function erkenneKoerper(foto: Blob): Promise<Koerper | null> {
  const lm = await lade();
  const bmp = await loadBitmap(foto);
  // Für die Erkennung reicht eine mittlere Auflösung
  const s = Math.min(1, 1024 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * s);
  c.height = Math.round(bmp.height * s);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close();
  const r = lm.detect(c);
  const p = r.landmarks?.[0];
  if (!p) return null;
  const pt = (i: number, minSicht = 0.35): Punkt | undefined =>
    p[i] && (p[i].visibility ?? 1) >= minSicht ? { x: p[i].x, y: p[i].y } : undefined;
  const pflicht = [pt(11, 0.2), pt(12, 0.2), pt(23, 0.2), pt(24, 0.2)];
  if (pflicht.some((x) => !x)) return null;
  return {
    nase: pt(0),
    schulterL: pflicht[0]!,
    schulterR: pflicht[1]!,
    huefteL: pflicht[2]!,
    huefteR: pflicht[3]!,
    knieL: pt(25),
    knieR: pt(26),
    knoechelL: pt(27),
    knoechelR: pt(28),
    handL: pt(15),
    handR: pt(16),
  };
}
