// Navigation: obere Leiste (Desktop) und Tab-Leiste mit Plus-Knopf (Handy).
import { m } from "framer-motion";
import { Cloud, CloudOff, BarChart3, CalendarDays, Home, Plus, Settings2, Shirt, Sparkles, PersonStanding } from "lucide-react";
import type { ReactNode } from "react";
import type { BaseName } from "../lib/router";
import { useScrolled } from "./Motion";
import { useGarderobe } from "../lib/store";
import { displayName } from "../lib/model";
import { useSync } from "../lib/syncStatus";

const NAV: { name: BaseName; label: string; icon: ReactNode }[] = [
  { name: "heute", label: "Heute", icon: <Home size={20} strokeWidth={1.6} /> },
  { name: "schrank", label: "Schrank", icon: <Shirt size={20} strokeWidth={1.6} /> },
  { name: "outfits", label: "Outfits", icon: <Sparkles size={20} strokeWidth={1.6} /> },
  { name: "umkleide", label: "Umkleide", icon: <PersonStanding size={20} strokeWidth={1.6} /> },
  { name: "kalender", label: "Kalender", icon: <CalendarDays size={20} strokeWidth={1.6} /> },
  { name: "analyse", label: "Analyse", icon: <BarChart3 size={20} strokeWidth={1.6} /> },
];

export function TopBar({ active }: { active: BaseName }) {
  const scrolled = useScrolled();
  return (
    <header className={`topbar ${scrolled ? "is-scrolled" : ""}`}>
      <div className="topbar-inner">
        <a href="#/heute" className="wordmark display" aria-label="Garderobe – Startseite">
          Garderobe
        </a>
        <nav className="topnav" aria-label="Hauptnavigation">
          {NAV.map((n) => (
            <a key={n.name} href={`#/${n.name}`} className={`topnav-link ${active === n.name ? "is-on" : ""}`} aria-current={active === n.name ? "page" : undefined}>
              {n.label}
              {active === n.name && (
                <m.span layoutId="topnav-line" className="topnav-line" transition={{ type: "spring", stiffness: 500, damping: 40 }} />
              )}
            </a>
          ))}
        </nav>
        <div className="topbar-actions">
          <SyncAnzeige />
          <a href="#/kalender" className={`icon-btn only-mobile ${active === "kalender" ? "is-on" : ""}`} aria-label="Kalender">
            <CalendarDays size={19} strokeWidth={1.6} />
          </a>
          <a href="#/analyse" className={`icon-btn only-mobile ${active === "analyse" ? "is-on" : ""}`} aria-label="Analyse">
            <BarChart3 size={19} strokeWidth={1.6} />
          </a>
          <a href="#/mehr" className={`icon-btn ${active === "mehr" ? "is-on" : ""}`} aria-label="Einstellungen & Export">
            <Settings2 size={19} strokeWidth={1.6} />
          </a>
          <a href="#/neu" className="btn btn-primary btn-m only-desktop">
            <Plus size={16} />
            <span>Teil hinzufügen</span>
          </a>
        </div>
      </div>
    </header>
  );
}

/** Laufband unter der Kopfleiste – wie im Shop, mit echten Zahlen aus dem Schrank. */
export function Ticker() {
  const { schrank, outfits, wears, items } = useGarderobe();
  const heute = new Date().toISOString().slice(0, 10);
  const getragen = wears.some((w) => w.date === heute);
  const neu = [...items].sort((a, b) => b.createdAt - a.createdAt)[0];
  const texte = [
    <><b>{schrank.length}</b> Teile im Schrank</>,
    <><b>{outfits.length}</b> Outfits gespeichert</>,
    getragen ? <>Heutiger Look <b>eingetragen</b></> : <>Was ziehst du <b>heute</b> an?</>,
    neu ? <>Neu: <b>{displayName(neu)}</b></> : <>Fotografiere dein <b>erstes Teil</b></>,
    <>Swipe dich durch <b>neue Outfits</b></>,
  ];
  const reihe = [...texte, ...texte];
  return (
    <div className="ticker" aria-hidden>
      <div className="ticker-track">
        {reihe.map((t, i) => (
          <span key={i}>{t}</span>
        ))}
      </div>
    </div>
  );
}

export function TabBar({ active }: { active: BaseName }) {
  const tabs = NAV.filter((n) => n.name !== "analyse" && n.name !== "kalender");
  return (
    <nav className="tabbar" aria-label="Hauptnavigation">
      {tabs.slice(0, 2).map((n) => (
        <Tab key={n.name} {...n} on={active === n.name} />
      ))}
      <a href="#/neu" className="tab-plus" aria-label="Teil hinzufügen">
        <m.span whileTap={{ scale: 0.9 }} className="tab-plus-btn">
          <Plus size={22} strokeWidth={2} />
        </m.span>
      </a>
      {tabs.slice(2).map((n) => (
        <Tab key={n.name} {...n} on={active === n.name} />
      ))}
    </nav>
  );
}

function Tab({ name, label, icon, on }: { name: BaseName; label: string; icon: ReactNode; on: boolean }) {
  return (
    <a href={`#/${name}`} className={`tab ${on ? "is-on" : ""}`} aria-current={on ? "page" : undefined}>
      {on && <m.span layoutId="tab-dot" className="tab-dot" transition={{ type: "spring", stiffness: 500, damping: 36 }} />}
      {icon}
      <span>{label}</span>
    </a>
  );
}

/** Kleines Wolken-Symbol in der Kopfleiste (nur mit Konto). */
function SyncAnzeige() {
  const s = useSync();
  if (!s.angemeldet) return null;
  const titel = s.fehler ? "Abgleich fehlgeschlagen" : s.laeuft ? "Gleicht ab …" : s.offen ? `${s.offen} Änderungen ausstehend` : "Abgeglichen";
  return (
    <a href="#/mehr" className={`icon-btn sync-icon ${s.laeuft ? "is-busy" : ""} ${s.fehler ? "is-err" : ""}`} aria-label={titel} title={titel}>
      {s.fehler || !navigator.onLine ? <CloudOff size={18} strokeWidth={1.6} /> : <Cloud size={18} strokeWidth={1.6} />}
    </a>
  );
}
