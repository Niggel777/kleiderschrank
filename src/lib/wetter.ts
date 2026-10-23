// Wetter über Open-Meteo (kostenlos, ohne Konto). Nur wenn ein Ort eingestellt ist.
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState } from "react";
import { db } from "./db";
import { addDays } from "./dates";

export interface Ort {
  name: string;
  lat: number;
  lon: number;
}

export interface Wetter {
  temp: number;
  max: number;
  min: number;
  code: number;
}

const cache = new Map<string, { t: number; w: Wetter }>();

export async function sucheOrt(name: string): Promise<Ort[]> {
  const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=5&language=de&format=json`);
  const j = await r.json();
  return (j.results ?? []).map((x: { name: string; admin1?: string; country?: string; latitude: number; longitude: number }) => ({
    name: [x.name, x.admin1 && x.admin1 !== x.name ? x.admin1 : null, x.country].filter(Boolean).join(", "),
    lat: x.latitude,
    lon: x.longitude,
  }));
}

export async function ladeWetter(ort: Ort): Promise<Wetter> {
  const key = `${ort.lat.toFixed(2)},${ort.lon.toFixed(2)}`;
  const c = cache.get(key);
  if (c && Date.now() - c.t < 30 * 60_000) return c.w;
  const r = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${ort.lat}&longitude=${ort.lon}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&forecast_days=1&timezone=auto`,
  );
  const j = await r.json();
  const w: Wetter = {
    temp: Math.round(j.current.temperature_2m),
    code: j.current.weather_code,
    max: Math.round(j.daily.temperature_2m_max[0]),
    min: Math.round(j.daily.temperature_2m_min[0]),
  };
  cache.set(key, { t: Date.now(), w });
  return w;
}

export function wetterText(code: number): string {
  if (code === 0) return "Klar";
  if (code <= 2) return "Leicht bewölkt";
  if (code === 3) return "Bewölkt";
  if (code <= 48) return "Nebel";
  if (code <= 57) return "Niesel";
  if (code <= 67) return "Regen";
  if (code <= 77) return "Schnee";
  if (code <= 82) return "Schauer";
  if (code <= 86) return "Schneeschauer";
  return "Gewitter";
}

export function useWetter(): { ort: Ort | null; wetter: Wetter | null; fehler: boolean } {
  const s = useLiveQuery(() => db.settings.get("ort"), []);
  const ort = (s?.value as Ort | undefined) ?? null;
  const [wetter, setWetter] = useState<Wetter | null>(null);
  const [fehler, setFehler] = useState(false);
  useEffect(() => {
    if (!ort) {
      setWetter(null);
      return;
    }
    let aktiv = true;
    ladeWetter(ort)
      .then((w) => aktiv && (setWetter(w), setFehler(false)))
      .catch(() => aktiv && setFehler(true));
    return () => {
      aktiv = false;
    };
  }, [ort?.lat, ort?.lon]); // eslint-disable-line react-hooks/exhaustive-deps
  return { ort, wetter, fehler };
}

/** Tagesvorhersage (bis 16 Tage im Voraus); Tage außerhalb liefern null. */
export async function ladeVorhersage(ort: Ort, start: string, tage: number): Promise<(Wetter | null)[]> {
  const r = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${ort.lat}&longitude=${ort.lon}&daily=temperature_2m_max,temperature_2m_min,weather_code&forecast_days=16&timezone=auto`,
  );
  const j = await r.json();
  const tageListe: string[] = j.daily?.time ?? [];
  return Array.from({ length: tage }, (_, i) => {
    const iso = addDays(start, i);
    const k = tageListe.indexOf(iso);
    if (k < 0) return null;
    const max = Math.round(j.daily.temperature_2m_max[k]);
    const min = Math.round(j.daily.temperature_2m_min[k]);
    return { temp: Math.round((max + min) / 2), max, min, code: j.daily.weather_code[k] };
  });
}
