// Bottom-Sheet auf dem Handy, zentrierter Dialog auf größeren Bildschirmen.
import { AnimatePresence, motion, useDragControls, type PanInfo } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useMedia } from "../lib/hooks";

export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  const desktop = useMedia("(min-width: 760px)");
  const drag = useDragControls();
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    setTimeout(() => panel.current?.focus(), 30);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      prev?.focus?.();
    };
  }, [open, onClose]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 120 || info.velocity.y > 600) onClose();
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="sheet-root">
          <motion.div
            className="sheet-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
          />
          <motion.div
            ref={panel}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            className={`sheet ${desktop ? "is-dialog" : "is-sheet"} ${wide ? "is-wide" : ""}`}
            initial={desktop ? { opacity: 0, y: 24, scale: 0.97 } : { y: "100%" }}
            animate={desktop ? { opacity: 1, y: 0, scale: 1 } : { y: 0 }}
            exit={desktop ? { opacity: 0, y: 16, scale: 0.98 } : { y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 38, mass: 0.9 }}
            drag={desktop ? false : "y"}
            dragControls={drag}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={onDragEnd}
          >
            {!desktop && (
              <div className="sheet-grip" onPointerDown={(e) => drag.start(e)}>
                <span />
              </div>
            )}
            {(title || desktop) && (
              <div className="sheet-head" onPointerDown={(e) => !desktop && drag.start(e)}>
                <h2 className="sheet-title">{title}</h2>
                <button className="icon-btn" aria-label="Schließen" onClick={onClose}>
                  <X size={18} />
                </button>
              </div>
            )}
            <div className="sheet-body">{children}</div>
            {footer && <div className="sheet-foot">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
