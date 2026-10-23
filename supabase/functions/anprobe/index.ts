// Edge Function "anprobe": leitet eine KI-Anprobe an die Hugging-Face-Demo von Leffa weiter.
// Der Hugging-Face-Token liegt nur hier als Secret (HF_TOKEN) und erreicht nie den Browser.
// Aufruf nur für angemeldete Nutzer (JWT-Prüfung von Supabase). Pro Aufruf ein Kleidungsstück,
// damit jeder Aufruf unter dem Zeitlimit der Funktion bleibt; die App ruft für Oben/Unten nacheinander auf.
import { Client } from "npm:@gradio/client@1.19.1";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const SPACE = "franciszzj/Leffa";
const ARTEN = new Set(["upper_body", "lower_body", "dresses"]);

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function fehler(status: number, meldung: string) {
  return new Response(JSON.stringify({ fehler: meldung }), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  // Gesundheitscheck ohne Anmeldung: Ist der Token hinterlegt und gültig? Gibt nur Ja/Nein zurück.
  if (req.method === "GET") {
    const t = Deno.env.get("HF_TOKEN");
    if (!t) return new Response(JSON.stringify({ token: false }), { headers: { ...cors, "Content-Type": "application/json" } });
    const r = await fetch("https://huggingface.co/api/whoami-v2", { headers: { Authorization: `Bearer ${t}` } });
    return new Response(JSON.stringify({ token: true, gueltig: r.ok }), { headers: { ...cors, "Content-Type": "application/json" } });
  }
  if (req.method !== "POST") return fehler(405, "Nur POST");

  // Nur echte, angemeldete Nutzer – der öffentliche App-Schlüssel allein reicht nicht
  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
  const { data: nutzer } = await sb.auth.getUser(jwt);
  if (!nutzer?.user) return fehler(401, "Bitte anmelden, um die KI-Anprobe zu nutzen.");

  const token = Deno.env.get("HF_TOKEN");
  if (!token) return fehler(500, "HF_TOKEN ist nicht hinterlegt.");

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fehler(400, "Erwartet multipart/form-data mit person, kleid, art.");
  }
  const person = form.get("person");
  const kleid = form.get("kleid");
  const art = String(form.get("art") ?? "");
  if (!(person instanceof File) || !(kleid instanceof File) || !ARTEN.has(art)) return fehler(400, "person, kleid oder art fehlt.");
  if (person.size > 8_000_000 || kleid.size > 8_000_000) return fehler(413, "Bild zu groß.");

  try {
    const client = await Client.connect(SPACE, { hf_token: token as `hf_${string}` });
    const r = await client.predict("/leffa_predict_vt", {
      src_image_path: person,
      ref_image_path: kleid,
      ref_acceleration: false,
      step: 30,
      scale: 2.5,
      seed: 42,
      vt_model_type: art === "upper_body" ? "viton_hd" : "dress_code",
      vt_garment_type: art,
      vt_repaint: false,
    });
    const url = (r.data as { url?: string }[])[0]?.url;
    if (!url) return fehler(502, "Die KI hat kein Bild geliefert.");
    const bild = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!bild.ok) return fehler(502, "Ergebnisbild konnte nicht geladen werden.");
    return new Response(await bild.arrayBuffer(), {
      headers: { ...cors, "Content-Type": bild.headers.get("Content-Type") ?? "image/webp", "Cache-Control": "no-store" },
    });
  } catch (e) {
    const m = e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e);
    return fehler(502, m);
  }
});
