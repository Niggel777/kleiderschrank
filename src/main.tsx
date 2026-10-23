import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/instrument-serif/400.css";
import "@fontsource/instrument-serif/400-italic.css";
import "@fontsource-variable/geist";
import "./styles/base.css";
import "./styles/ui.css";
import "./styles/pages.css";
import "./styles/detail.css";
import "./styles/add.css";
import "./styles/outfits.css";
import "./styles/umkleide.css";
import "./styles/kalender.css";
import "./styles/mehr.css";
import "./styles/heute.css";
import "./styles/swipe.css";
import "./styles/shop.css";
import "./styles/luxe.css";
import "./styles/neon.css";
import { App } from "./App";
import { installRouter } from "./lib/router";
import { startSmoothScroll } from "./components/Motion";

installRouter();
startSmoothScroll();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Cloud-Abgleich (große Supabase-Bibliothek) erst nach dem ersten Bild laden
const spaeter = (f: () => void) => ("requestIdleCallback" in window ? requestIdleCallback(f, { timeout: 2000 }) : setTimeout(f, 800));
spaeter(() => import("./lib/sync").then((m) => m.startSync()));

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}
