// Schrank mit Freunden teilen: Links zum Ansehen anlegen, auflisten, widerrufen.
import { URL_, supabase } from "./sync";

export interface Freigabe {
  token: string;
  name: string | null;
  created_at: string;
}

export interface FreundTeil {
  id: string;
  name: string;
  brand: string;
  category: string;
  sub: string;
  colors: { name: string; hex: string }[];
  size: string;
  aspect: number;
  thumb: string | null;
  bild: string | null;
  freigestellt: boolean;
}

export function freigabeLink(token: string): string {
  return `${location.origin}${location.pathname}#/freund/${token}`;
}

export async function freigabenLaden(): Promise<Freigabe[]> {
  const { data, error } = await supabase.from("freigaben").select("token,name,created_at").order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function freigabeErstellen(name: string): Promise<Freigabe> {
  const { data, error } = await supabase.from("freigaben").insert({ name }).select("token,name,created_at").single();
  if (error) throw error;
  return data;
}

export async function freigabeLoeschen(token: string): Promise<void> {
  const { error } = await supabase.from("freigaben").delete().eq("token", token);
  if (error) throw error;
}

export async function freundSchrank(token: string): Promise<{ name: string | null; teile: FreundTeil[] }> {
  const r = await fetch(`${URL_}/functions/v1/freund?token=${encodeURIComponent(token)}`);
  const j = await r.json();
  if (!r.ok) throw new Error(j.fehler ?? "Link nicht gültig");
  return j;
}
