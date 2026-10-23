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
import { App } from "./App";
import { installRouter } from "./lib/router";
import { startSmoothScroll } from "./components/Motion";
import { startSync } from "./lib/sync";

installRouter();
startSmoothScroll();
startSync();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}
