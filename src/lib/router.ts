// Minimaler Hash-Router (funktioniert auf GitHub Pages ohne Server-Konfiguration).
// Interne Links laufen über pushState mit einer Tiefe im State, damit "Zurück"
// innerhalb der App sauber funktioniert und bei Direktaufrufen nicht aus der App führt.
import { useEffect, useState } from "react";

export type Route =
  | { name: "schrank"; q: URLSearchParams }
  | { name: "teil"; id: string; q: URLSearchParams }
  | { name: "neu"; q: URLSearchParams }
  | { name: "bearbeiten"; id: string; q: URLSearchParams }
  | { name: "outfits"; q: URLSearchParams }
  | { name: "outfit"; id: string; q: URLSearchParams }
  | { name: "umkleide"; q: URLSearchParams }
  | { name: "kalender"; q: URLSearchParams }
  | { name: "analyse"; q: URLSearchParams }
  | { name: "mehr"; q: URLSearchParams };

export type BaseName = "schrank" | "outfits" | "umkleide" | "kalender" | "analyse" | "mehr";

const EVENT = "routechange";

export function parse(hash: string): Route {
  const [pfad, query = ""] = hash.replace(/^#\/?/, "").split("?");
  const q = new URLSearchParams(query);
  const [a, b] = pfad.split("/");
  switch (a) {
    case "teil":
      return b ? { name: "teil", id: b, q } : { name: "schrank", q };
    case "bearbeiten":
      return b ? { name: "bearbeiten", id: b, q } : { name: "schrank", q };
    case "outfit":
      return b ? { name: "outfit", id: b, q } : { name: "outfits", q };
    case "neu":
    case "outfits":
    case "umkleide":
    case "kalender":
    case "analyse":
    case "mehr":
      return { name: a, q } as Route;
    default:
      return { name: "schrank", q };
  }
}

function depth(): number {
  return (history.state as { d?: number } | null)?.d ?? 0;
}

export function go(path: string, replace = false): void {
  const h = path.startsWith("#") ? path : `#/${path.replace(/^\//, "")}`;
  if (h === location.hash && !replace) return;
  if (replace) history.replaceState({ d: depth() }, "", h);
  else history.pushState({ d: depth() + 1 }, "", h);
  window.dispatchEvent(new Event(EVENT));
}

export function back(fallback = "schrank"): void {
  if (depth() > 0) history.back();
  else go(fallback, true);
}

let installed = false;
export function installRouter(): void {
  if (installed) return;
  installed = true;
  if (!history.state) history.replaceState({ d: 0 }, "", location.hash || "#/schrank");
  document.addEventListener("click", (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as Element | null)?.closest?.('a[href^="#/"]');
    if (!a) return;
    e.preventDefault();
    go(a.getAttribute("href")!);
  });
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parse(location.hash));
  useEffect(() => {
    const on = () => setRoute(parse(location.hash));
    window.addEventListener(EVENT, on);
    window.addEventListener("popstate", on);
    window.addEventListener("hashchange", on);
    return () => {
      window.removeEventListener(EVENT, on);
      window.removeEventListener("popstate", on);
      window.removeEventListener("hashchange", on);
    };
  }, []);
  return route;
}

export function isBase(name: Route["name"]): name is BaseName {
  return ["schrank", "outfits", "umkleide", "kalender", "analyse", "mehr"].includes(name);
}
