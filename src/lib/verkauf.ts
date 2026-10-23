// Anzeigen für Vinted & Co. vorbereiten (Vinted hat keine offene API zum Einstellen –
// die App erzeugt Text und Foto, das Einstellen passiert in der Vinted-App).
import { CATEGORY, displayName, type Condition, type Item } from "./model";
import type { WearStat } from "./stats";

export const VINTED_NEU = "https://www.vinted.de/items/new";

const FAKTOR: Record<Condition, number> = {
  "Neu mit Etikett": 0.6,
  "Neu ohne Etikett": 0.5,
  "Sehr gut": 0.4,
  Gut: 0.3,
  Zufriedenstellend: 0.2,
};

export function preisVorschlag(item: Item, condition: Condition = item.condition): number | null {
  if (item.price === null) return null;
  const roh = item.price * FAKTOR[condition];
  return Math.max(3, roh >= 20 ? Math.round(roh / 5) * 5 : Math.round(roh));
}

export function anzeigeTitel(item: Item): string {
  const teile = [item.brand, item.sub || CATEGORY[item.category].singular, item.colors[0]?.name, item.size && item.size !== "One Size" ? `Gr. ${item.size}` : ""];
  return teile.filter(Boolean).join(" ").slice(0, 60);
}

export function anzeigeText(item: Item, stat: WearStat, condition: Condition = item.condition): string {
  const zeilen = [
    `${[item.brand, displayName(item)].filter(Boolean).join(" – ")}${item.colors.length ? ` in ${item.colors.map((c) => c.name).join("/")}` : ""}.`,
    "",
    item.size ? `Größe: ${item.size}` : "",
    `Zustand: ${condition}`,
    item.material ? `Material: ${item.material}` : "",
    stat.count > 0 && stat.count <= 6 ? `Nur ${stat.count}× getragen.` : "",
    item.notes ? `\n${item.notes}` : "",
    "",
    "Nichtraucherhaushalt, Versand innerhalb von 2 Tagen. Bei Fragen gern schreiben!",
    "",
    [item.brand, item.sub, item.colors[0]?.name].filter(Boolean).map((t) => `#${t!.toLowerCase().replace(/[^a-z0-9äöüß]/g, "")}`).join(" "),
  ];
  return zeilen.filter((z, i, a) => z !== "" || (a[i - 1] !== "" && i > 0)).join("\n").trim();
}
