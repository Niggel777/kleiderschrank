// Gemeinsamer Datenzugriff für alle Seiten: Teile, Tragetage, Outfits (live aus IndexedDB).
import { useLiveQuery } from "dexie-react-hooks";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { db } from "./db";
import { setProfil, type Item, type Outfit, type Profil, type Wear } from "./model";
import { wearIndex, type WearIndex } from "./stats";

interface Garderobe {
  bereit: boolean;
  items: Item[];
  /** Teile im Schrank (ohne Wunschliste und Verkauftes) */
  schrank: Item[];
  byId: Map<string, Item>;
  wears: Wear[];
  outfits: Outfit[];
  idx: WearIndex;
  profil: Profil;
}

const Ctx = createContext<Garderobe | null>(null);

export function GarderobeProvider({ children }: { children: ReactNode }) {
  const items = useLiveQuery(() => db.items.orderBy("createdAt").reverse().toArray(), []);
  const wears = useLiveQuery(() => db.wears.orderBy("date").toArray(), []);
  const outfits = useLiveQuery(() => db.outfits.orderBy("createdAt").reverse().toArray(), []);
  const profilSetting = useLiveQuery(() => db.settings.get("profil"), []);
  const profil = (profilSetting?.value as Profil | undefined) ?? "herren";
  // Kategorien/Größen vor dem Rendern der Kinder auf das Profil umstellen
  useMemo(() => setProfil(profil), [profil]);

  const value = useMemo<Garderobe>(() => {
    const it = items ?? [];
    return {
      bereit: items !== undefined && wears !== undefined && outfits !== undefined,
      items: it,
      schrank: it.filter((i) => i.status === "owned" || i.status === "selling"),
      byId: new Map(it.map((i) => [i.id, i])),
      wears: wears ?? [],
      outfits: outfits ?? [],
      idx: wearIndex(wears ?? []),
      profil,
    };
  }, [items, wears, outfits, profil]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useGarderobe(): Garderobe {
  const v = useContext(Ctx);
  if (!v) throw new Error("GarderobeProvider fehlt");
  return v;
}

/* ───────── Bild-URLs aus der Datenbank ───────── */

const urls = new Map<string, string>();
const laden = new Map<string, Promise<string | null>>();

export function imageUrl(id: string): Promise<string | null> {
  const fertig = urls.get(id);
  if (fertig) return Promise.resolve(fertig);
  let p = laden.get(id);
  if (!p) {
    p = db.images.get(id).then((img) => {
      laden.delete(id);
      if (!img) return null;
      const u = URL.createObjectURL(img.blob);
      urls.set(id, u);
      return u;
    });
    laden.set(id, p);
  }
  return p;
}

export function forgetImage(id: string | null | undefined): void {
  if (!id) return;
  const u = urls.get(id);
  if (u) URL.revokeObjectURL(u);
  urls.delete(id);
}

export function useImageUrl(id: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(() => (id ? urls.get(id) ?? null : null));
  useEffect(() => {
    if (!id) {
      setUrl(null);
      return;
    }
    const sofort = urls.get(id);
    if (sofort) {
      setUrl(sofort);
      return;
    }
    let aktiv = true;
    imageUrl(id).then((u) => aktiv && setUrl(u));
    return () => {
      aktiv = false;
    };
  }, [id]);
  return url;
}

/** Bestes Anzeigebild eines Teils: Vorschau, sonst Freisteller, sonst Original. */
export function displayImageId(item: Item, gross = false): string | null {
  if (gross) return item.imageCutout ?? item.imageOriginal ?? item.imageThumb;
  return item.imageThumb ?? item.imageCutout ?? item.imageOriginal;
}
