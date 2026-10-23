// Vollbild-Ebene über der aktuellen Seite (Detailansichten, Hinzufügen).
import { animate, m, useMotionValue, useTransform } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { back } from "../lib/router";
import { pauseSmoothScroll } from "./Motion";

export function Overlay({
  children,
  actions,
  title,
  onClose = () => back(),
  className = "",
}: {
  children: ReactNode;
  actions?: ReactNode;
  title?: ReactNode;
  onClose?: () => void;
  className?: string;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.querySelector(".sheet-root")) onClose();
    };
    window.addEventListener("keydown", onKey);
    document.documentElement.classList.add("has-overlay");
    pauseSmoothScroll(true);
    return () => {
      pauseSmoothScroll(false);
      window.removeEventListener("keydown", onKey);
      document.documentElement.classList.remove("has-overlay");
    };
  }, [onClose]);

  // Vom linken Rand nach rechts wischen = zurück (wie in iOS-Apps)
  const x = useMotionValue(0);
  const schatten = useTransform(x, [0, 300], [0.35, 0]);
  const start = useRef<{ x: number; y: number; aktiv: boolean } | null>(null);
  const handler = {
    onTouchStart: (e: React.TouchEvent) => {
      const t = e.touches[0];
      start.current = t.clientX < 28 ? { x: t.clientX, y: t.clientY, aktiv: false } : null;
    },
    onTouchMove: (e: React.TouchEvent) => {
      const s = start.current;
      if (!s) return;
      const t = e.touches[0];
      const dx = t.clientX - s.x, dy = Math.abs(t.clientY - s.y);
      if (!s.aktiv && dy > 14 && dy > dx) return (start.current = null);
      if (dx > 8) s.aktiv = true;
      if (s.aktiv) x.set(Math.max(0, dx));
    },
    onTouchEnd: () => {
      const s = start.current;
      start.current = null;
      if (!s?.aktiv) return;
      if (x.get() > 110) {
        animate(x, window.innerWidth, { duration: 0.22, ease: "easeOut" }).then(onClose);
      } else animate(x, 0, { type: "spring", stiffness: 500, damping: 40 });
    },
  };

  return (
    <m.div
      {...handler}
      style={{ x, boxShadow: useTransform(schatten, (o) => `-20px 0 40px rgba(0,0,0,${o})`) }}
      className={`overlay ${className}`}
      data-lenis-prevent
      role="dialog"
      aria-modal="true"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.22 } }}
      transition={{ duration: 0.28 }}
    >
      <div className="overlay-bar">
        <button className="icon-btn overlay-back" onClick={onClose} aria-label="Zurück">
          <ArrowLeft size={19} />
        </button>
        {title && <div className="overlay-title">{title}</div>}
        <div className="overlay-actions">{actions}</div>
      </div>
      {children}
    </m.div>
  );
}
