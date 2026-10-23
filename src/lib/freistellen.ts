// Hintergrund entfernen – komplett im Browser (ONNX-Modell, wird beim ersten
// Mal einmalig geladen und danach vom Browser zwischengespeichert).
import { colorsOf, makeThumb, normalizePhoto, packshotAufbereiten, trimTransparent } from "./image";
import type { ColorTag } from "./model";

type Modul = typeof import("@imgly/background-removal");
let modul: Promise<Modul> | null = null;

export type Phase = "vorbereiten" | "modell" | "freistellen" | "fertig";

export interface Fortschritt {
  phase: Phase;
  /** 0–1 */
  anteil: number;
}

// Grafikkarte (WebGPU) nutzen, wenn vorhanden – deutlich schneller; sonst Prozessor.
// Gerechnet wird in einem Worker, damit die Oberfläche flüssig bleibt.
let gpuOk = typeof navigator !== "undefined" && "gpu" in navigator;
function konfig(extra: Record<string, unknown> = {}) {
  return { model: "isnet_fp16" as const, device: (gpuOk ? "gpu" : "cpu") as "gpu" | "cpu", proxyToWorker: true, output: { format: "image/png" as const }, ...extra };
}

let vorgeladen: Promise<void> | null = null;
/** Modell schon laden, während der Nutzer noch fotografiert (einmalig pro Sitzung). */
export function freistellenVorladen(): Promise<void> {
  return (vorgeladen ??= (async () => {
    const { preload } = await (modul ??= import("@imgly/background-removal"));
    await preload(konfig()).catch(async () => {
      gpuOk = false;
      await preload(konfig());
    });
  })().catch(() => {
    vorgeladen = null;
  }));
}

export async function hintergrundEntfernen(
  foto: Blob,
  onFortschritt?: (f: Fortschritt) => void,
): Promise<Blob> {
  onFortschritt?.({ phase: "modell", anteil: 0 });
  const { removeBackground } = await (modul ??= import("@imgly/background-removal"));
  let gesehenFetch = false;
  const progress = (key: string, current: number, total: number) => {
    if (key.startsWith("fetch")) {
      gesehenFetch = true;
      onFortschritt?.({ phase: "modell", anteil: total ? current / total : 0 });
    } else if (key.startsWith("compute")) {
      onFortschritt?.({ phase: "freistellen", anteil: total ? current / total : 0.5 });
    } else if (!gesehenFetch) {
      onFortschritt?.({ phase: "freistellen", anteil: 0.2 });
    }
  };
  try {
    return await removeBackground(foto, konfig({ progress }));
  } catch (e) {
    if (!gpuOk) throw e;
    // WebGPU-Probleme (z. B. Treiber): einmal auf dem Prozessor wiederholen
    gpuOk = false;
    return removeBackground(foto, konfig({ progress }));
  }
}

export interface VerarbeitetesFoto {
  original: Blob;
  freigestellt: Blob | null;
  thumb: Blob;
  farben: ColorTag[];
  aspect: number;
  fehler: string | null;
}

/** Komplette Pipeline für ein neues Kleidungsstück. */
export async function verarbeite(
  datei: Blob,
  freistellen: boolean,
  onFortschritt?: (f: Fortschritt) => void,
): Promise<VerarbeitetesFoto> {
  onFortschritt?.({ phase: "vorbereiten", anteil: 0 });
  const norm = await normalizePhoto(datei);
  let freigestellt: Blob | null = null;
  let aspect = norm.width / norm.height;
  let fehler: string | null = null;
  if (freistellen) {
    try {
      const roh = await hintergrundEntfernen(norm.blob, onFortschritt);
      const sauber = await packshotAufbereiten(roh).catch(() => roh);
      const t = await trimTransparent(sauber);
      freigestellt = t.blob;
      aspect = t.width / t.height;
    } catch (e) {
      console.warn("Freistellen fehlgeschlagen", e);
      fehler = navigator.onLine
        ? "Freistellen hat nicht geklappt – das Originalfoto wird verwendet."
        : "Offline: Das Freistell-Modell muss einmal mit Internet geladen werden.";
    }
  }
  const basis = freigestellt ?? norm.blob;
  const [thumb, farben] = await Promise.all([makeThumb(basis), colorsOf(basis)]);
  onFortschritt?.({ phase: "fertig", anteil: 1 });
  return { original: norm.blob, freigestellt, thumb, farben, aspect, fehler };
}
