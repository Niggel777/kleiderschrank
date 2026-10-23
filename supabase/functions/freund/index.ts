// Edge Function "freund": liefert zu einem Freigabe-Link den Schrank zum Ansehen (nur lesen).
// Ohne gültigen Token gibt es nichts. Ausgegeben werden nur Teile im Schrank (keine Wunschliste,
// nichts Verkauftes) mit wenigen Feldern und zeitlich begrenzten Bild-Links.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" } });

interface Teil {
  id: string;
  name: string;
  brand: string;
  category: string;
  sub: string;
  colors: { name: string; hex: string }[];
  size: string;
  status: string;
  imageThumb: string | null;
  imageCutout: string | null;
  aspect: number;
  createdAt: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const token = new URL(req.url).searchParams.get("token") ?? "";
  if (!/^[0-9a-f]{24}$/.test(token)) return json(400, { fehler: "Ungültiger Link." });

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: freigabe } = await sb.from("freigaben").select("user_id, name").eq("token", token).maybeSingle();
  if (!freigabe) return json(404, { fehler: "Dieser Link ist nicht (mehr) gültig." });

  const { data: docs, error } = await sb.from("docs").select("data").eq("user_id", freigabe.user_id).eq("kind", "item").eq("deleted", false);
  if (error) return json(500, { fehler: "Schrank konnte nicht geladen werden." });

  const teile = (docs ?? [])
    .map((d) => d.data as Teil)
    .filter((t) => t && (t.status === "owned" || t.status === "selling"))
    .sort((a, b) => b.createdAt - a.createdAt);

  // Zeitlich begrenzte Links nur für die Vorschau- und Freistellerbilder
  const pfade = teile.flatMap((t) => [t.imageThumb, t.imageCutout]).filter(Boolean).map((id) => `${freigabe.user_id}/${id}`);
  const urls = new Map<string, string>();
  for (let i = 0; i < pfade.length; i += 100) {
    const { data } = await sb.storage.from("bilder").createSignedUrls(pfade.slice(i, i + 100), 60 * 60);
    for (const s of data ?? []) if (s.signedUrl && s.path) urls.set(s.path.split("/").pop()!, s.signedUrl);
  }

  return json(200, {
    name: freigabe.name,
    teile: teile.map((t) => ({
      id: t.id,
      name: t.name,
      brand: t.brand,
      category: t.category,
      sub: t.sub,
      colors: (t.colors ?? []).map((c) => ({ name: c.name, hex: c.hex })),
      size: t.size,
      aspect: t.aspect,
      thumb: t.imageThumb ? urls.get(t.imageThumb) ?? null : null,
      bild: t.imageCutout ? urls.get(t.imageCutout) ?? null : null,
      freigestellt: Boolean(t.imageCutout),
    })),
  });
});
