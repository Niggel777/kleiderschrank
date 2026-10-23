// Export als Obsidian-Vault (Markdown + Bilder, Dataview-tauglich) und Backup/Restore.
import { strFromU8, strToU8, unzipSync, zipSync, type Zippable } from "fflate";
import { db } from "./db";
import { isoDay } from "./dates";
import { CATEGORY, STATUS_LABEL, displayName, type Item, type Outfit, type Setting, type StoredImage, type Wear } from "./model";
import { costPerWear, statOf, wearIndex } from "./stats";

const EXT: Record<string, string> = { "image/webp": "webp", "image/png": "png", "image/jpeg": "jpg" };

function dateiname(s: string): string {
  return s.replace(/[\\/:*?"<>|#^[\]]/g, "").replace(/\s+/g, " ").trim().slice(0, 80) || "Ohne Namen";
}

function yaml(v: unknown): string {
  if (v === null || v === undefined || v === "") return '""';
  if (Array.isArray(v)) return `[${v.map((x) => JSON.stringify(x)).join(", ")}]`;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return JSON.stringify(String(v));
}

async function bytes(b: Blob): Promise<Uint8Array> {
  return new Uint8Array(await b.arrayBuffer());
}

/** Obsidian-Vault: eine Notiz pro Teil, pro Outfit, ein Tagebuch pro Tag, Dashboard mit Dataview. */
export async function obsidianVault(): Promise<Blob> {
  const [items, wears, outfits] = await Promise.all([db.items.toArray(), db.wears.toArray(), db.outfits.toArray()]);
  const idx = wearIndex(wears);
  const files: Zippable = {};
  const namen = new Map<string, string>();
  const vergeben = new Set<string>();
  for (const i of items) {
    let n = dateiname(`${displayName(i)}${i.brand ? ` (${i.brand})` : ""}`);
    while (vergeben.has(n)) n += " ·";
    vergeben.add(n);
    namen.set(i.id, n);
  }
  const R = "Garderobe";

  for (const i of items) {
    const s = statOf(idx, i.id);
    const bildId = i.imageCutout ?? i.imageOriginal;
    let bild = "";
    if (bildId) {
      const img = await db.images.get(bildId);
      if (img) {
        bild = `Bilder/${i.id}.${EXT[img.blob.type] ?? "png"}`;
        files[`${R}/${bild}`] = [await bytes(img.blob), { level: 0 }];
      }
    }
    const cpw = costPerWear(i, s);
    const fm = {
      typ: "kleidungsstueck",
      kategorie: CATEGORY[i.category].label,
      art: i.sub,
      marke: i.brand,
      groesse: i.size,
      farben: i.colors.map((c) => c.name),
      preis: i.price,
      gekauft: i.purchaseDate,
      saison: i.seasons,
      anlass: i.occasions,
      material: i.material,
      zustand: i.condition,
      status: STATUS_LABEL[i.status],
      favorit: i.favorite,
      getragen: s.count,
      zuletzt_getragen: s.last,
      kosten_pro_tragen: cpw !== null ? Math.round(cpw * 100) / 100 : null,
    };
    const md = [
      "---",
      ...Object.entries(fm).map(([k, v]) => `${k}: ${yaml(v)}`),
      "---",
      "",
      bild ? `![[${bild.split("/").pop()}|320]]` : "",
      "",
      `# ${displayName(i)}`,
      "",
      i.notes ? `${i.notes}\n` : "",
      "## Getragen",
      s.dates.length ? s.dates.map((d) => `- [[${d}]]`).join("\n") : "_noch nie_",
    ].join("\n");
    files[`${R}/Teile/${namen.get(i.id)}.md`] = strToU8(md);
  }

  for (const o of outfits) {
    const md = [
      "---",
      `typ: "outfit"`,
      `teile: ${yaml(o.itemIds.map((id) => namen.get(id)).filter(Boolean))}`,
      `favorit: ${o.favorite}`,
      "---",
      "",
      `# ${o.name}`,
      "",
      ...o.itemIds.filter((id) => namen.has(id)).map((id) => `- [[${namen.get(id)}]]`),
    ].join("\n");
    files[`${R}/Outfits/${dateiname(o.name)} ${o.id.slice(0, 4)}.md`] = strToU8(md);
  }

  const tage = new Map<string, string[]>();
  for (const w of wears) tage.set(w.date, [...(tage.get(w.date) ?? []), ...w.itemIds]);
  for (const [tag, ids] of tage) {
    files[`${R}/Tagebuch/${tag}.md`] = strToU8(["---", `typ: "tragetag"`, `datum: ${tag}`, "---", "", ...ids.filter((id) => namen.has(id)).map((id) => `- [[${namen.get(id)}]]`)].join("\n"));
  }

  files[`${R}/Garderobe.md`] = strToU8(
    [
      "# Garderobe",
      "",
      `Export vom ${isoDay()} · ${items.length} Teile · ${wears.length} Tragetage`,
      "",
      "Die Tabellen brauchen das Community-Plugin **Dataview**.",
      "",
      "## Lange nicht getragen",
      "```dataview",
      'TABLE marke, zuletzt_getragen, getragen FROM "Garderobe/Teile"',
      'WHERE status = "Im Schrank"',
      "SORT zuletzt_getragen ASC",
      "LIMIT 15",
      "```",
      "",
      "## Meistgetragen",
      "```dataview",
      'TABLE getragen, kosten_pro_tragen FROM "Garderobe/Teile"',
      "SORT getragen DESC",
      "LIMIT 15",
      "```",
      "",
      "## Nach Kategorie",
      "```dataview",
      'TABLE length(rows) AS Anzahl FROM "Garderobe/Teile"',
      "GROUP BY kategorie",
      "```",
    ].join("\n"),
  );

  return new Blob([zipSync(files)], { type: "application/zip" });
}

interface Sicherung {
  version: 1;
  erstellt: string;
  items: Item[];
  wears: Wear[];
  outfits: Outfit[];
  settings: Setting[];
  images: { id: string; kind: StoredImage["kind"]; type: string; createdAt: number }[];
}

export async function backup(): Promise<Blob> {
  const [items, wears, outfits, settings, images] = await Promise.all([db.items.toArray(), db.wears.toArray(), db.outfits.toArray(), db.settings.toArray(), db.images.toArray()]);
  const files: Zippable = {};
  const meta: Sicherung = {
    version: 1,
    erstellt: new Date().toISOString(),
    items,
    wears,
    outfits,
    settings,
    images: images.map((i) => ({ id: i.id, kind: i.kind, type: i.blob.type, createdAt: i.createdAt })),
  };
  for (const i of images) files[`bilder/${i.id}`] = [await bytes(i.blob), { level: 0 }];
  files["garderobe.json"] = strToU8(JSON.stringify(meta));
  return new Blob([zipSync(files)], { type: "application/zip" });
}

/** Stellt eine Sicherung wieder her. Vorhandene Daten mit gleicher ID werden überschrieben. */
export async function restore(datei: Blob, ersetzen: boolean): Promise<number> {
  const zip = unzipSync(new Uint8Array(await datei.arrayBuffer()));
  const raw = zip["garderobe.json"];
  if (!raw) throw new Error("Keine Garderobe-Sicherung");
  const meta = JSON.parse(strFromU8(raw)) as Sicherung;
  const images: StoredImage[] = meta.images
    .filter((m) => zip[`bilder/${m.id}`])
    .map((m) => ({ id: m.id, kind: m.kind, createdAt: m.createdAt, blob: new Blob([zip[`bilder/${m.id}`]], { type: m.type }) }));
  await db.transaction("rw", [db.items, db.wears, db.outfits, db.settings, db.images], async () => {
    if (ersetzen) await Promise.all([db.items.clear(), db.wears.clear(), db.outfits.clear(), db.images.clear()]);
    await db.images.bulkPut(images);
    await db.items.bulkPut(meta.items);
    await db.wears.bulkPut(meta.wears);
    await db.outfits.bulkPut(meta.outfits);
    await db.settings.bulkPut(meta.settings);
  });
  return meta.items.length;
}
