// Hinweis "Als App installieren": Android/Desktop über den Browser-Dialog, iPhone mit kurzer Anleitung.
import { AnimatePresence, m } from "framer-motion";
import { Download, Share, X } from "lucide-react";
import { useEffect, useState } from "react";

interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let gemerkt: InstallEvent | null = null;
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    gemerkt = e as InstallEvent;
    window.dispatchEvent(new Event("garderobe-installierbar"));
  });
}

const SCHLUESSEL = "garderobe.installieren.weg";

function istInstalliert(): boolean {
  return matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function istIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);
}

export function Installieren() {
  const [modus, setModus] = useState<"android" | "ios" | null>(null);

  useEffect(() => {
    if (istInstalliert() || localStorage.getItem(SCHLUESSEL)) return;
    if (istIos()) {
      const t = setTimeout(() => setModus("ios"), 2500);
      return () => clearTimeout(t);
    }
    const an = () => setModus("android");
    if (gemerkt) an();
    window.addEventListener("garderobe-installierbar", an);
    return () => window.removeEventListener("garderobe-installierbar", an);
  }, []);

  function weg() {
    try {
      localStorage.setItem(SCHLUESSEL, "1");
    } catch {
      /* egal */
    }
    setModus(null);
  }

  return (
    <AnimatePresence>
      {modus && (
        <m.div
          className="install"
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
        >
          <img src="./icon-192.png" alt="" className="install-icon" />
          <div className="install-text">
            <strong>Garderobe als App</strong>
            {modus === "ios" ? (
              <span>
                Tippe unten auf <Share size={13} className="install-inline" /> und dann „Zum Home-Bildschirm“.
              </span>
            ) : (
              <span>Startet schneller, funktioniert offline, Vollbild ohne Browserleiste.</span>
            )}
          </div>
          {modus === "android" && (
            <button
              className="btn btn-primary btn-s"
              onClick={async () => {
                if (!gemerkt) return;
                await gemerkt.prompt();
                const r = await gemerkt.userChoice;
                gemerkt = null;
                if (r.outcome === "accepted") weg();
                else setModus(null);
              }}
            >
              <Download size={14} />
              <span>Installieren</span>
            </button>
          )}
          <button className="icon-btn install-x" aria-label="Ausblenden" onClick={weg}>
            <X size={16} />
          </button>
        </m.div>
      )}
    </AnimatePresence>
  );
}
