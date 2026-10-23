// KI-Anprobe über die kostenlose Hugging-Face-Demo von IDM-VTON (nur Oberkörper, nicht-kommerzielle Lizenz).
// Foto und Kleidungsstück werden dafür an Hugging Face geschickt – nur auf ausdrücklichen Knopfdruck.
import { productShot } from "./image";

const SPACE = "yisol/IDM-VTON";

export type KiStatus = { phase: "verbinden" | "warteschlange" | "rechnen" | "fertig"; position?: number; eta?: number };

export async function kiAnprobe(person: Blob, kleidung: Blob, freigestellt: boolean, beschreibung: string, onStatus: (s: KiStatus) => void): Promise<Blob> {
  onStatus({ phase: "verbinden" });
  const { Client } = await import("@gradio/client");
  // Der Gradio-Client schickt Cookies mit ("credentials: include"); der Space antwortet aber mit
  // "Access-Control-Allow-Origin: *" – das lehnt der Browser ab. Für Hugging Face daher ohne Cookies.
  const originalFetch = window.fetch;
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (/\.hf\.space|huggingface\.co/.test(url)) init = { ...init, credentials: "omit" };
    return originalFetch(input, init);
  };
  // Fehler des Space kommen im Browser nicht immer an – nach 3 Minuten abbrechen
  let timer: number | undefined;
  const zeitlimit = new Promise<never>((_, rej) => {
    timer = window.setTimeout(() => rej(new Error("Die KI hat nicht geantwortet. Meist erkennt sie keine Person im Foto – probier ein Ganzkörperfoto von vorn.")), 180_000);
  });
  try {
    return await Promise.race([ablauf(), zeitlimit]);
  } finally {
    window.clearTimeout(timer);
    window.fetch = originalFetch;
  }

  async function ablauf(): Promise<Blob> {
  const client = await Client.connect(SPACE, { events: ["data", "status"] });
  // Freigestellte Teile auf weißem Grund schicken – so erkennt das Modell das Teil am besten
  const garment = freigestellt ? await productShot(kleidung, "#ffffff", 768, 1024) : kleidung;
  const job = client.submit("/tryon", {
    dict: { background: person, layers: [], composite: null },
    garm_img: garment,
    garment_des: beschreibung,
    is_checked: true,
    is_checked_crop: true,
    denoise_steps: 30,
    seed: 42,
  });
  for await (const msg of job) {
    if (msg.type === "status") {
      const st = msg as unknown as { stage: string; position?: number; eta?: number; message?: string };
      if (st.stage === "error") throw new Error(fehlertext(st.message));
      if (st.stage === "pending") onStatus(st.position ? { phase: "warteschlange", position: st.position, eta: st.eta } : { phase: "rechnen", eta: st.eta });
    }
    if (msg.type === "data") {
      const ergebnis = (msg as unknown as { data: { url?: string; path?: string }[] }).data?.[0];
      const url = ergebnis?.url;
      if (!url) throw new Error("Die KI hat kein Bild geliefert.");
      const blob = await (await fetch(url)).blob();
      onStatus({ phase: "fertig" });
      return blob;
    }
  }
  throw new Error("Die Verbindung zur KI wurde unterbrochen.");
  }
}

function fehlertext(m?: string): string {
  if (!m) return "Die KI-Anprobe ist gerade nicht verfügbar.";
  if (/quota|GPU/i.test(m)) return "Das kostenlose Tageskontingent von Hugging Face ist aufgebraucht – bitte später erneut versuchen.";
  if (/IndexError|pose|keypoint/i.test(m)) return "Auf dem Foto wurde keine Person erkannt – bitte ein Foto von dir von vorn verwenden.";
  if (/queue|full/i.test(m)) return "Die Warteschlange ist voll – bitte gleich noch mal versuchen.";
  return m;
}
