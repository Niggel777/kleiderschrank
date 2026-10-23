// Vollbild-Ebene über der aktuellen Seite (Detailansichten, Hinzufügen).
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { back } from "../lib/router";

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
    return () => {
      window.removeEventListener("keydown", onKey);
      document.documentElement.classList.remove("has-overlay");
    };
  }, [onClose]);

  return (
    <motion.div
      className={`overlay ${className}`}
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
    </motion.div>
  );
}
