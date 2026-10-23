// Navigation: obere Leiste (Desktop) und Tab-Leiste mit Plus-Knopf (Handy).
import { motion } from "framer-motion";
import { BarChart3, CalendarDays, Plus, Settings2, Shirt, Sparkles, PersonStanding } from "lucide-react";
import type { ReactNode } from "react";
import type { BaseName } from "../lib/router";

const NAV: { name: BaseName; label: string; icon: ReactNode }[] = [
  { name: "schrank", label: "Schrank", icon: <Shirt size={20} strokeWidth={1.6} /> },
  { name: "outfits", label: "Outfits", icon: <Sparkles size={20} strokeWidth={1.6} /> },
  { name: "umkleide", label: "Umkleide", icon: <PersonStanding size={20} strokeWidth={1.6} /> },
  { name: "kalender", label: "Kalender", icon: <CalendarDays size={20} strokeWidth={1.6} /> },
  { name: "analyse", label: "Analyse", icon: <BarChart3 size={20} strokeWidth={1.6} /> },
];

export function TopBar({ active }: { active: BaseName }) {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <a href="#/schrank" className="wordmark display" aria-label="Garderobe – zum Schrank">
          Garderobe
        </a>
        <nav className="topnav" aria-label="Hauptnavigation">
          {NAV.map((n) => (
            <a key={n.name} href={`#/${n.name}`} className={`topnav-link ${active === n.name ? "is-on" : ""}`} aria-current={active === n.name ? "page" : undefined}>
              {n.label}
              {active === n.name && (
                <motion.span layoutId="topnav-line" className="topnav-line" transition={{ type: "spring", stiffness: 500, damping: 40 }} />
              )}
            </a>
          ))}
        </nav>
        <div className="topbar-actions">
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

export function TabBar({ active }: { active: BaseName }) {
  const tabs = NAV.filter((n) => n.name !== "analyse");
  return (
    <nav className="tabbar" aria-label="Hauptnavigation">
      {tabs.slice(0, 2).map((n) => (
        <Tab key={n.name} {...n} on={active === n.name} />
      ))}
      <a href="#/neu" className="tab-plus" aria-label="Teil hinzufügen">
        <motion.span whileTap={{ scale: 0.9 }} className="tab-plus-btn">
          <Plus size={22} strokeWidth={2} />
        </motion.span>
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
      {on && <motion.span layoutId="tab-dot" className="tab-dot" transition={{ type: "spring", stiffness: 500, damping: 36 }} />}
      {icon}
      <span>{label}</span>
    </a>
  );
}
