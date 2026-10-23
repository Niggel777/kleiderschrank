// Edge Function "import": liest aus einem Shop-Link Produktname, Marke und Produktbild
// (Open-Graph-Tags und JSON-LD "Product"). Nur für angemeldete Nutzer, nur öffentliche http(s)-Adressen.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

/** Schutz vor Aufrufen ins interne Netz (SSRF): nur normale öffentliche Hostnamen. */
function erlaubt(u: URL): boolean {
  if (!["http:", "https:"].includes(u.protocol)) return false;
  const h = u.hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal") || !h.includes(".")) return false;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(h) || h.includes(":")) return false; // keine IP-Adressen
  return true;
}

async function holen(url: string, max: number): Promise<Response & { daten?: Uint8Array }> {
  let aktuell = new URL(url);
  for (let i = 0; i < 4; i++) {
    if (!erlaubt(aktuell)) throw new Error("Adresse nicht erlaubt");
    const r = await fetch(aktuell, { headers: { "User-Agent": UA, "Accept-Language": "de-DE,de;q=0.9" }, redirect: "manual", signal: AbortSignal.timeout(12_000) });
    if (r.status >= 300 && r.status < 400 && r.headers.get("location")) {
      aktuell = new URL(r.headers.get("location")!, aktuell);
      continue;
    }
    const buf = new Uint8Array(await r.arrayBuffer());
    if (buf.length > max) throw new Error("Antwort zu groß");
    return Object.assign(r, { daten: buf });
  }
  throw new Error("Zu viele Weiterleitungen");
}

function meta(html: string, ...namen: string[]): string | null {
  for (const n of namen) {
    const re = new RegExp(`<meta[^>]+(?:property|name)=["']${n}["'][^>]*content=["']([^"']+)["']|<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${n}["']`, "i");
    const m = html.match(re);
    if (m) return (m[1] ?? m[2]).trim();
  }
  return null;
}

function jsonLdProdukt(html: string): { name?: string; brand?: string; image?: string } {
  for (const block of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const daten = JSON.parse(block[1].trim());
      const liste = Array.isArray(daten) ? daten : daten["@graph"] ?? [daten];
      for (const d of liste) {
        const typ = [].concat(d?.["@type"] ?? []);
        if (!typ.includes("Product" as never)) continue;
        const bild = Array.isArray(d.image) ? d.image[0] : typeof d.image === "object" ? d.image?.url : d.image;
        const marke = typeof d.brand === "object" ? d.brand?.name : d.brand;
        return { name: d.name, brand: marke, image: bild };
      }
    } catch {
      /* ungültiges JSON-LD überspringen */
    }
  }
  return {};
}

const entities = (s: string | null | undefined) =>
  s?.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">") ?? null;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json(405, { fehler: "Nur POST" });

  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
  const { data: nutzer } = await sb.auth.getUser(jwt);
  if (!nutzer?.user) return json(401, { fehler: "Bitte anmelden, um Links zu importieren." });

  let link: string;
  try {
    link = String((await req.json()).url ?? "");
    new URL(link);
  } catch {
    return json(400, { fehler: "Das ist kein gültiger Link." });
  }

  try {
    const seite = await holen(link, 3_000_000);
    if (!seite.ok) return json(502, { fehler: `Der Shop hat die Seite nicht geliefert (${seite.status}).` });
    const html = new TextDecoder().decode(seite.daten);
    const ld = jsonLdProdukt(html);
    const titel = entities(ld.name ?? meta(html, "og:title", "twitter:title") ?? html.match(/<title>([^<]+)<\/title>/i)?.[1]);
    const marke = entities(ld.brand ?? meta(html, "product:brand", "og:brand", "og:site_name"));
    let bildUrl = ld.image ?? meta(html, "og:image:secure_url", "og:image", "twitter:image");
    if (!bildUrl) return json(422, { fehler: "Auf der Seite wurde kein Produktbild gefunden.", titel, marke });
    bildUrl = new URL(entities(bildUrl)!, link).href;
    const bild = await holen(bildUrl, 6_000_000);
    const typ = bild.headers.get("content-type") ?? "image/jpeg";
    if (!bild.ok || !typ.startsWith("image/")) return json(502, { fehler: "Das Produktbild konnte nicht geladen werden.", titel, marke });
    // Base64 ohne große Zwischenstrings
    let bin = "";
    const d = bild.daten!;
    for (let i = 0; i < d.length; i += 0x8000) bin += String.fromCharCode(...d.subarray(i, i + 0x8000));
    return json(200, { titel, marke, bild: `data:${typ};base64,${btoa(bin)}`, quelle: new URL(link).hostname });
  } catch (e) {
    return json(502, { fehler: e instanceof Error ? e.message : "Import fehlgeschlagen" });
  }
});
