import { AnimatePresence, LazyMotion, MotionConfig, m } from "framer-motion";
import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { TabBar, Ticker, TopBar } from "./components/Shell";
import { scrollToTop } from "./components/Motion";
import { ToastProvider } from "./components/Toast";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./lib/db";
import { isBase, useRoute, type BaseName, type Route } from "./lib/router";
import { GarderobeProvider } from "./lib/store";
import { Schrank } from "./pages/Schrank";
import { Heute } from "./pages/Heute";
// Seiten außer Heute und Schrank erst bei Bedarf laden (kleineres Startpaket)
const TeilDetail = lazy(() => import("./pages/TeilDetail").then((m) => ({ default: m.TeilDetail })));
const TeilNeu = lazy(() => import("./pages/TeilNeu").then((m) => ({ default: m.TeilNeu })));
const Outfits = lazy(() => import("./pages/Outfits").then((m) => ({ default: m.Outfits })));
const OutfitDetail = lazy(() => import("./pages/Outfits").then((m) => ({ default: m.OutfitDetail })));
const Umkleide = lazy(() => import("./pages/Umkleide").then((m) => ({ default: m.Umkleide })));
const Kalender = lazy(() => import("./pages/Kalender").then((m) => ({ default: m.Kalender })));
const Analyse = lazy(() => import("./pages/Analyse").then((m) => ({ default: m.Analyse })));
const Mehr = lazy(() => import("./pages/Mehr").then((m) => ({ default: m.Mehr })));

// Nach dem Start im Leerlauf vorladen, damit Seitenwechsel sofort gehen
if (typeof window !== "undefined") {
  const vorladen = () => {
    import("./pages/TeilDetail");
    import("./pages/Outfits");
    import("./pages/TeilNeu");
    import("./pages/Umkleide");
    import("./pages/Kalender");
    import("./pages/Analyse");
    import("./pages/Mehr");
  };
  window.addEventListener("load", () => setTimeout(vorladen, 1500), { once: true });
}

function Laden() {
  return <div className="seite-laedt" aria-busy="true"><span className="spinner" /></div>;
}

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
  const [baseRoute, setBaseRoute] = useState<Route>(() => (isBase(route.name) ? route : { name: "heute", q: new URLSearchParams() }));
  const base = baseRoute.name as BaseName;
  const zuletzt = useRef(base);
  useTheme();

  useEffect(() => {
    if (isBase(route.name)) setBaseRoute(route);
  }, [route]);

  useEffect(() => {
    if (zuletzt.current !== base) scrollToTop();
    zuletzt.current = base;
  }, [base]);

  return (
    <LazyMotion features={() => import("./lib/motionFeatures").then((r) => r.default)} strict>
    <MotionConfig reducedMotion="user">
      <GarderobeProvider>
        <ToastProvider>
          <TopBar active={base} />
          <Ticker />
          <m.main
              key={base}
              className="page"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              <Suspense fallback={<Laden />}>
              {base === "heute" && <Heute />}
              {base === "schrank" && <Schrank q={baseRoute.q} />}
              {base === "outfits" && <Outfits q={baseRoute.q} />}
              {base === "umkleide" && <Umkleide q={baseRoute.q} />}
              {base === "kalender" && <Kalender />}
              {base === "analyse" && <Analyse />}
              {base === "mehr" && <Mehr />}
              </Suspense>
            </m.main>

          <Suspense fallback={null}>
          <AnimatePresence>
            {route.name === "teil" && <TeilDetail key={`teil-${route.id}`} id={route.id} />}
            {route.name === "neu" && <TeilNeu key="neu" q={route.q} />}
            {route.name === "bearbeiten" && <TeilNeu key={`bearbeiten-${route.id}`} q={route.q} editId={route.id} />}
            {route.name === "outfit" && <OutfitDetail key={`outfit-${route.id}`} id={route.id} />}
          </AnimatePresence>
          </Suspense>

          <TabBar active={base} />
        </ToastProvider>
      </GarderobeProvider>
    </MotionConfig>
    </LazyMotion>
  );
}
