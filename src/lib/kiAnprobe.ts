// KI-Anprobe über die kostenlose Hugging-Face-Demo von Leffa (MIT-Lizenz).
// Leffa kann Oberteile, Hosen/Röcke und Kleider – für ein ganzes Outfit werden die Teile
// nacheinander angezogen: zuerst oben, dann unten. Foto und Teile gehen dabei an Hugging Face.
import { productShot } from "./image";
import type { Item } from "./model";
import { KEY, URL_, supabase } from "./sync";

const SPACE = "franciszzj/Leffa";

export type KiStatus = {
  phase: "verbinden" | "warteschlange" | "rechnen" | "fertig";
  position?: number;
  eta?: number;
  /** z. B. "Jeans · 2 von 2" */
  schritt?: string;
};

type Art = "upper_body" | "lower_body" | "dresses";

export interface KiTeil {
  item: Item;
  bild: Blob;
}

function artVon(i: Item): Art | null {
  if (i.category === "kleider") return "dresses";
  if (i.category === "unterteile") return "lower_body";
  if (i.category === "oberteile" || i.category === "jacken") return "upper_body";
  return null;
}

/** Welche Teile die KI anziehen kann – oben (Jacke vor Oberteil), unten oder ein Kleid. */
export function kiReihenfolge(items: Item[]): Item[] {
  const kleid = items.find((i) => i.category === "kleider");
  if (kleid) return [kleid];
  const oben = items.find((i) => i.category === "jacken") ?? items.find((i) => i.category === "oberteile");
  const unten = items.find((i) => i.category === "unterteile");
  return [oben, unten].filter(Boolean) as Item[];
}

export async function kiAnprobe(person: Blob, teile: KiTeil[], onStatus: (s: KiStatus) => void): Promise<Blob> {
  onStatus({ phase: "verbinden" });
  const { Client } = await import("@gradio/client");
  // Der Gradio-Client schickt Cookies mit; Hugging-Face-Spaces antworten mit "Allow-Origin: *",
  // was der Browser dann ablehnt. Für Hugging Face daher ohne Cookies.
  const originalFetch = window.fetch;
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (/\.hf\.space|huggingface\.co/.test(url)) init = { ...init, credentials: "omit" };
    return originalFetch(input, init);
  };
  let timer: number | undefined;
  const zeitlimit = new Promise<never>((_, rej) => {
    timer = window.setTimeout(
      () => rej(new Error("Die KI hat nicht geantwortet. Meist erkennt sie keine Person im Foto – probier ein Ganzkörperfoto von vorn.")),
      Math.max(1, teile.length) * 120_000,
    );
  });
  try {
    return await Promise.race([ablauf(), zeitlimit]);
  } finally {
    window.clearTimeout(timer);
    window.fetch = originalFetch;
  }

  async function ablauf(): Promise<Blob> {
    // Angemeldet: über die eigene Supabase-Funktion mit Hugging-Face-Token (mehr Kontingent)
    const { data: s } = await supabase.auth.getSession();
    const jwt = s.session?.access_token;
    if (jwt) {
      let aktuell = person;
      for (let n = 0; n < teile.length; n++) {
        const { item, bild } = teile[n];
        const art = artVon(item);
        if (!art) continue;
        onStatus({ phase: "rechnen", schritt: `${item.sub || (art === "lower_body" ? "Hose" : "Oberteil")} · ${n + 1} von ${teile.length}` });
        const kleid = item.imageCutout ? await productShot(bild, "#ffffff", 768, 1024) : bild;
        const fd = new FormData();
        fd.append("person", aktuell, "person.jpg");
        fd.append("kleid", kleid, "kleid.jpg");
        fd.append("art", art);
        const r = await originalFetch(`${URL_}/functions/v1/anprobe`, { method: "POST", headers: { Authorization: `Bearer ${jwt}`, apikey: KEY }, body: fd });
        if (!r.ok) {
          const j = (await r.json().catch(() => ({}))) as { fehler?: string };
          throw new Error(fehlertext(j.fehler));
        }
        aktuell = await r.blob();
      }
      onStatus({ phase: "fertig" });
      return aktuell;
    }

    // Nicht angemeldet: direkt und anonym (kleines Kontingent)
    const client = await Client.connect(SPACE, { events: ["data", "status"] });
    let aktuell = person;
    for (let n = 0; n < teile.length; n++) {
      const { item, bild } = teile[n];
      const art = artVon(item);
      if (!art) continue;
      const schritt = `${item.sub || (art === "lower_body" ? "Hose" : "Oberteil")} · ${n + 1} von ${teile.length}`;
      // Freigestellte Teile auf weißem Grund – so erkennt das Modell das Teil am besten
      const kleid = item.imageCutout ? await productShot(bild, "#ffffff", 768, 1024) : bild;
      const job = client.submit("/leffa_predict_vt", {
        src_image_path: aktuell,
        ref_image_path: kleid,
        ref_acceleration: false,
        step: 30,
        scale: 2.5,
        seed: 42,
        vt_model_type: art === "upper_body" ? "viton_hd" : "dress_code",
        vt_garment_type: art,
        vt_repaint: false,
      });
      let fertig: Blob | null = null;
      for await (const msg of job) {
        if (msg.type === "status") {
          const st = msg as unknown as { stage: string; position?: number; eta?: number; message?: string };
          if (st.stage === "error") throw new Error(fehlertext(st.message));
          if (st.stage === "pending") onStatus(st.position ? { phase: "warteschlange", position: st.position, eta: st.eta, schritt } : { phase: "rechnen", eta: st.eta, schritt });
        }
        if (msg.type === "data") {
          const url = (msg as unknown as { data: { url?: string }[] }).data?.[0]?.url;
          if (!url) throw new Error("Die KI hat kein Bild geliefert.");
          fertig = await (await originalFetch(url)).blob();
          break;
        }
      }
      if (!fertig) throw new Error("Die Verbindung zur KI wurde unterbrochen.");
      aktuell = fertig;
    }
    onStatus({ phase: "fertig" });
    return aktuell;
  }
}

function fehlertext(m?: string): string {
  if (!m) return "Die KI-Anprobe ist gerade nicht verfügbar.";
  if (/quota|GPU/i.test(m)) {
    const wann = m.match(/Try again in ([\d:]+)/)?.[1];
    return `Das kostenlose Tageskontingent von Hugging Face ist aufgebraucht${wann ? ` – wieder verfügbar in ${wann} h` : ""}.`;
  }
  if (/IndexError|pose|keypoint|densepose/i.test(m)) return "Auf dem Foto wurde keine Person erkannt – bitte ein Foto von dir von vorn verwenden.";
  if (/HF_TOKEN/.test(m)) return "Der Hugging-Face-Token ist noch nicht hinterlegt.";
  if (/queue|full/i.test(m)) return "Die Warteschlange ist voll – bitte gleich noch mal versuchen.";
  return m;
}
