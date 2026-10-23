import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { TabBar, TopBar } from "./components/Shell";
import { ToastProvider } from "./components/Toast";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./lib/db";
import { isBase, useRoute, type BaseName, type Route } from "./lib/router";
import { GarderobeProvider } from "./lib/store";
import { Schrank } from "./pages/Schrank";
import { TeilDetail } from "./pages/TeilDetail";
import { TeilNeu } from "./pages/TeilNeu";
import { Outfits, OutfitDetail } from "./pages/Outfits";
import { Umkleide } from "./pages/Umkleide";
import { Kalender } from "./pages/Kalender";
import { Analyse } from "./pages/Analyse";
import { Mehr } from "./pages/Mehr";

function useTheme() {
  const theme = useLiveQuery(() => db.settings.get("theme"), []);
  useEffect(() => {
    const t = (theme?.value as string | undefined) ?? "system";
    if (t === "system") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", t);
  }, [theme]);
}

export function App() {
  const route = useRoute();
  const [baseRoute, setBaseRoute] = useState<Route>(() => (isBase(route.name) ? route : { name: "schrank", q: new URLSearchParams() }));
  const base = baseRoute.name as BaseName;
  const zuletzt = useRef(base);
  useTheme();

  useEffect(() => {
    if (isBase(route.name)) setBaseRoute(route);
  }, [route]);

  useEffect(() => {
    if (zuletzt.current !== base) window.scrollTo({ top: 0 });
    zuletzt.current = base;
  }, [base]);

  return (
    <MotionConfig reducedMotion="user">
      <GarderobeProvider>
        <ToastProvider>
          <TopBar active={base} />
          <AnimatePresence mode="wait" initial={false}>
            <motion.main
              key={base}
              className="page"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            >
              {base === "schrank" && <Schrank q={baseRoute.q} />}
              {base === "outfits" && <Outfits q={baseRoute.q} />}
              {base === "umkleide" && <Umkleide q={baseRoute.q} />}
              {base === "kalender" && <Kalender />}
              {base === "analyse" && <Analyse />}
              {base === "mehr" && <Mehr />}
            </motion.main>
          </AnimatePresence>

          <AnimatePresence>
            {route.name === "teil" && <TeilDetail key={`teil-${route.id}`} id={route.id} />}
            {route.name === "neu" && <TeilNeu key="neu" q={route.q} />}
            {route.name === "bearbeiten" && <TeilNeu key={`bearbeiten-${route.id}`} q={route.q} editId={route.id} />}
            {route.name === "outfit" && <OutfitDetail key={`outfit-${route.id}`} id={route.id} />}
          </AnimatePresence>

          <TabBar active={base} />
        </ToastProvider>
      </GarderobeProvider>
    </MotionConfig>
  );
}
