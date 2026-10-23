// Abgleich mit Supabase: lokale Änderungen hochladen, fremde Änderungen herunterladen.
// Lokal bleibt IndexedDB die Quelle für die App (offline-fähig); Supabase ist der Abgleich-Speicher.
import { createClient, type Session } from "@supabase/supabase-js";
import { setzeSyncStatus } from "./syncStatus";
import { db } from "./db";
import type { ImageKind, Item, Outfit, Setting, Wear } from "./model";

export const URL_ = "https://dcdfwhmwuzqqjpufshsc.supabase.co";
// Öffentlicher Schlüssel (für Browser gedacht); Zugriff ist per Row-Level-Security auf den eigenen Nutzer beschränkt.
export const KEY = "sb_publishable_e3_vs2FdQF3VQ29V3brqaw_OvlJELTZ";

export const supabase = createClient(URL_, KEY, { auth: { persistSession: true, autoRefreshToken: true, storageKey: "garderobe-auth" } });

type Kind = "item" | "wear" | "outfit" | "setting";
const TABELLE = { item: db.items, wear: db.wears, outfit: db.outfits, setting: db.settings } as const;
const SYNC_SETTINGS = new Set(["profil", "theme", "ort", "person"]);

/* ───────── Ausgang: welche Datensätze müssen hoch? ───────── */

const AUSGANG = "garderobe.sync.ausgang";
const HOCHGELADEN = "garderobe.sync.bilder";
const LETZTER_ABRUF = "garderobe.sync.abruf";

function lese<T>(k: string, f: T): T {
  try {
    const r = localStorage.getItem(k);
    return r ? (JSON.parse(r) as T) : f;
  } catch {
    return f;
  }
}
function schreibe(k: string, v: unknown) {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* voll */
  }
}

const ausgang = new Set<string>(lese<string[]>(AUSGANG, []));
let anwenden = false; // true, während Server-Daten lokal eingespielt werden
const hoerer = new Set<() => void>(); // nur intern

function merke(kind: Kind, id: string) {
  if (anwenden) return;
  ausgang.add(`${kind}:${id}`);
  schreibe(AUSGANG, [...ausgang]);
  melde();
  plane();
}

// Dexie-Hooks: jede lokale Änderung landet im Ausgang
for (const [kind, tabelle] of Object.entries(TABELLE) as [Kind, (typeof TABELLE)[Kind]][]) {
  const key = (obj: unknown, pk: unknown) => String(pk ?? (obj as { id?: string; key?: string }).id ?? (obj as { key?: string }).key);
  const relevant = (k: string) => kind !== "setting" || SYNC_SETTINGS.has(k);
  tabelle.hook("creating", (pk, obj) => {
    const k = key(obj, pk);
    if (relevant(k)) merke(kind, k);
  });
  tabelle.hook("updating", (_m, pk) => {
    const k = String(pk);
    if (relevant(k)) merke(kind, k);
  });
  tabelle.hook("deleting", (pk) => {
    const k = String(pk);
    if (relevant(k)) merke(kind, k);
  });
}

/* ───────── Status für die Oberfläche ───────── */

export interface SyncStatus {
  session: Session | null;
  laeuft: boolean;
  offen: number;
  zuletzt: number | null;
  fehler: string | null;
}

let status: SyncStatus = { session: null, laeuft: false, offen: ausgang.size, zuletzt: lese<number | null>("garderobe.sync.zuletzt", null), fehler: null };

function melde(p: Partial<SyncStatus> = {}) {
  status = { ...status, offen: ausgang.size, ...p };
  hoerer.forEach((f) => f());
  setzeSyncStatus({
    angemeldet: Boolean(status.session),
    email: status.session?.user.email ?? null,
    laeuft: status.laeuft,
    offen: status.offen,
    zuletzt: status.zuletzt,
    fehler: status.fehler,
  });
}

/* ───────── Abgleich ───────── */

let timer: number | undefined;
function plane(ms = 2500) {
  if (!status.session) return;
  window.clearTimeout(timer);
  timer = window.setTimeout(() => abgleichen(), ms);
}

let laufend: Promise<void> | null = null;
export function abgleichen(): Promise<void> {
  if (!status.session || !navigator.onLine) return Promise.resolve();
  return (laufend ??= (async () => {
    melde({ laeuft: true, fehler: null });
    try {
      await hochladen();
      await herunterladen();
      const jetzt = Date.now();
      schreibe("garderobe.sync.zuletzt", jetzt);
      melde({ zuletzt: jetzt });
    } catch (e) {
      console.warn("Abgleich fehlgeschlagen", e);
      melde({ fehler: e instanceof Error ? e.message : "Abgleich fehlgeschlagen" });
    } finally {
      laufend = null;
      melde({ laeuft: false });
    }
  })());
}

function uid(): string {
  return status.session!.user.id;
}

function bilderVon(kind: Kind, data: unknown): string[] {
  if (kind === "item") {
    const i = data as Item;
    return [i.imageOriginal, i.imageCutout, i.imageThumb].filter(Boolean) as string[];
  }
  if (kind === "outfit") return [(data as Outfit).lookImage].filter(Boolean) as string[];
  if (kind === "setting" && (data as Setting).key === "person") return [((data as Setting).value as { imageId?: string })?.imageId].filter(Boolean) as string[];
  return [];
}

async function bildHoch(id: string, hochgeladen: Set<string>) {
  if (hochgeladen.has(id)) return;
  const img = await db.images.get(id);
  if (!img) return;
  const { error } = await supabase.storage.from("bilder").upload(`${uid()}/${id}`, img.blob, { contentType: img.blob.type || "image/png", upsert: true });
  if (error && !/exists/i.test(error.message)) throw error;
  hochgeladen.add(id);
}

async function hochladen() {
  const hochgeladen = new Set<string>(lese<string[]>(HOCHGELADEN, []));
  const keys = [...ausgang];
  for (let n = 0; n < keys.length; n += 25) {
    const rows = [];
    for (const key of keys.slice(n, n + 25)) {
      const [kind, ...rest] = key.split(":") as [Kind, ...string[]];
      const id = rest.join(":");
      const data = await TABELLE[kind].get(id as never);
      // Beispiel-Schrank bleibt lokal
      if (data && (data as { demo?: boolean }).demo) {
        ausgang.delete(key);
        continue;
      }
      if (data) for (const b of bilderVon(kind, data)) await bildHoch(b, hochgeladen);
      rows.push({ user_id: uid(), kind, id, data: data ?? null, deleted: !data });
    }
    if (rows.length) {
      const { error } = await supabase.from("docs").upsert(rows, { onConflict: "user_id,kind,id" });
      if (error) throw error;
    }
    for (const key of keys.slice(n, n + 25)) ausgang.delete(key);
    schreibe(AUSGANG, [...ausgang]);
    schreibe(HOCHGELADEN, [...hochgeladen]);
    melde();
  }
}

async function herunterladen() {
  const seit = lese<string>(LETZTER_ABRUF, "1970-01-01T00:00:00Z");
  let neuester = seit;
  for (let seite = 0; ; seite++) {
    const { data, error } = await supabase
      .from("docs")
      .select("kind,id,data,deleted,updated_at")
      .gt("updated_at", seit)
      .order("updated_at", { ascending: true })
      .range(seite * 500, seite * 500 + 499);
    if (error) throw error;
    if (!data?.length) break;
    anwenden = true;
    try {
      await db.transaction("rw", [db.items, db.wears, db.outfits, db.settings], async () => {
        for (const r of data as { kind: Kind; id: string; data: unknown; deleted: boolean; updated_at: string }[]) {
          // Eigene, noch nicht hochgeladene Änderungen haben Vorrang
          if (ausgang.has(`${r.kind}:${r.id}`)) continue;
          const t = TABELLE[r.kind];
          if (r.deleted || !r.data) await t.delete(r.id as never);
          else await t.put(r.data as never);
          if (r.updated_at > neuester) neuester = r.updated_at;
        }
      });
    } finally {
      anwenden = false;
    }
    if (data.length < 500) break;
  }
  schreibe(LETZTER_ABRUF, neuester);
}

/** Lädt ein Bild aus der Cloud, wenn es lokal fehlt (z. B. auf dem zweiten Gerät). */
export async function bildAusCloud(id: string): Promise<Blob | null> {
  if (!status.session) return null;
  const { data, error } = await supabase.storage.from("bilder").download(`${uid()}/${id}`);
  if (error || !data) return null;
  const kind: ImageKind = "cutout";
  await db.images.put({ id, kind, blob: data, createdAt: Date.now() });
  return data;
}

/** Löscht große Bilder lokal, die sicher in der Cloud liegen (Vorschaubilder bleiben). */
export async function platzSparen(): Promise<number> {
  const hochgeladen = new Set<string>(lese<string[]>(HOCHGELADEN, []));
  const items = await db.items.toArray();
  const gross = new Set(items.filter((i) => !i.demo).flatMap((i) => [i.imageOriginal, i.imageCutout]).filter(Boolean) as string[]);
  const weg = [...gross].filter((id) => hochgeladen.has(id));
  await db.images.bulkDelete(weg);
  return weg.length;
}

/* ───────── Anmeldung ───────── */

export async function anmelden(email: string, passwort: string, neu: boolean): Promise<void> {
  const r = neu ? await supabase.auth.signUp({ email, password: passwort }) : await supabase.auth.signInWithPassword({ email, password: passwort });
  if (r.error) throw new Error(uebersetze(r.error.message));
  if (neu && !r.data.session) throw new Error("Konto angelegt – bitte jetzt anmelden.");
}

export async function abmelden(): Promise<void> {
  await supabase.auth.signOut();
  ausgang.clear();
  schreibe(AUSGANG, []);
  schreibe(LETZTER_ABRUF, "1970-01-01T00:00:00Z");
  schreibe(HOCHGELADEN, []);
  melde();
}

function uebersetze(m: string): string {
  if (/invalid login/i.test(m)) return "E-Mail oder Passwort stimmt nicht.";
  if (/already registered/i.test(m)) return "Für diese E-Mail gibt es schon ein Konto – bitte anmelden.";
  if (/password/i.test(m) && /least/i.test(m)) return "Das Passwort braucht mindestens 8 Zeichen.";
  return m;
}

/** Alle lokalen Daten zum Hochladen vormerken (beim ersten Anmelden). */
async function allesVormerken() {
  const [items, wears, outfits, settings] = await Promise.all([db.items.toArray(), db.wears.toArray(), db.outfits.toArray(), db.settings.toArray()]);
  items.forEach((i) => merke("item", i.id));
  wears.forEach((w: Wear) => merke("wear", w.id));
  outfits.forEach((o) => merke("outfit", o.id));
  settings.filter((s) => SYNC_SETTINGS.has(s.key)).forEach((s) => merke("setting", s.key));
}

export function startSync(): void {
  supabase.auth.getSession().then(({ data }) => {
    melde({ session: data.session });
    if (data.session) abgleichen();
  });
  supabase.auth.onAuthStateChange((ereignis, session) => {
    const vorher = status.session;
    melde({ session });
    if (ereignis === "SIGNED_IN" && !vorher && session) {
      if (!localStorage.getItem(`garderobe.sync.user.${session.user.id}`)) {
        localStorage.setItem(`garderobe.sync.user.${session.user.id}`, "1");
        allesVormerken().then(() => abgleichen());
      } else abgleichen();
    }
  });
  window.addEventListener("online", () => abgleichen());
  document.addEventListener("visibilitychange", () => document.visibilityState === "visible" && abgleichen());
  window.setInterval(() => document.visibilityState === "visible" && abgleichen(), 60_000);
}
