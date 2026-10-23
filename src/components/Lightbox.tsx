// Vollbild-Ansicht eines Bildes: Zoomen (Mausrad, Doppeltipp, zwei Finger), Verschieben, nach unten wischen zum Schließen.
import { AnimatePresence, m, useMotionValue, animate } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { pauseSmoothScroll } from "./Motion";

export function Lightbox({ src, cut, open, onClose }: { src: string | null; cut: boolean; open: boolean; onClose: () => void }) {
  const scale = useMotionValue(1);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const pinch = useRef<{ d: number; s: number } | null>(null);
  const punkte = useRef(new Map<number, { x: number; y: number }>());

  useEffect(() => {
    if (!open) return;
    scale.set(1);
    x.set(0);
    y.set(0);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    pauseSmoothScroll(true);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (!document.documentElement.classList.contains("has-overlay")) pauseSmoothScroll(false);
    };
  }, [open, onClose, scale, x, y]);

  const zoomen = (s: number) => {
    const neu = Math.min(5, Math.max(1, s));
    animate(scale, neu, { type: "spring", stiffness: 300, damping: 30 });
    if (neu === 1) {
      animate(x, 0);
      animate(y, 0);
    }
  };

  return createPortal(
    <AnimatePresence>
      {open && src && (
        <m.div
          className="lightbox"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => e.target === e.currentTarget && onClose()}
          onWheel={(e) => zoomen(scale.get() * (e.deltaY > 0 ? 0.88 : 1.14))}
        >
          <m.img
            src={src}
            alt=""
            className={`lightbox-img ${cut ? "is-cut" : ""}`}
            style={{ scale, x, y }}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            drag
            dragMomentum={false}
            onDragEnd={(_, info) => {
              if (scale.get() <= 1.02 && info.offset.y > 140) onClose();
              else if (scale.get() <= 1.02) {
                animate(x, 0);
                animate(y, 0);
              }
            }}
            onDoubleClick={() => zoomen(scale.get() > 1.2 ? 1 : 2.4)}
            onPointerDown={(e) => {
              punkte.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
              if (punkte.current.size === 2) {
                const [a, b] = [...punkte.current.values()];
                pinch.current = { d: Math.hypot(a.x - b.x, a.y - b.y), s: scale.get() };
              }
            }}
            onPointerMove={(e) => {
              if (!punkte.current.has(e.pointerId)) return;
              punkte.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
              if (pinch.current && punkte.current.size === 2) {
                const [a, b] = [...punkte.current.values()];
                scale.set(Math.min(5, Math.max(1, (pinch.current.s * Math.hypot(a.x - b.x, a.y - b.y)) / pinch.current.d)));
              }
            }}
            onPointerUp={(e) => {
              punkte.current.delete(e.pointerId);
              if (punkte.current.size < 2) pinch.current = null;
            }}
            draggable={false}
          />
          <button className="icon-btn lightbox-close" aria-label="Schließen" onClick={onClose}>
            <X size={20} />
          </button>
          <span className="lightbox-hint">Doppeltippen oder zwei Finger zum Zoomen · nach unten wischen zum Schließen</span>
        </m.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
