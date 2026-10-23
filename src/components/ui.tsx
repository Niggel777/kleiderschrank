// Kleine, wiederverwendbare Bausteine.
import { motion } from "framer-motion";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { PALETTE_BY_NAME } from "../lib/colors";

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "s" | "m" | "l";
  icon?: ReactNode;
  block?: boolean;
};

export function Button({ variant = "secondary", size = "m", icon, block, className = "", children, ...rest }: BtnProps) {
  return (
    <button className={`btn btn-${variant} btn-${size} ${block ? "btn-block" : ""} ${className}`} {...rest}>
      {icon}
      {children && <span>{children}</span>}
    </button>
  );
}

export function IconButton({
  label,
  children,
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button className={`icon-btn ${className}`} aria-label={label} title={label} {...rest}>
      {children}
    </button>
  );
}

export function Chip({
  on,
  onClick,
  children,
  count,
  layoutGroup,
}: {
  on?: boolean;
  onClick?: () => void;
  children: ReactNode;
  count?: number;
  layoutGroup?: string;
}) {
  return (
    <button className={`chip ${on ? "is-on" : ""}`} aria-pressed={on} onClick={onClick}>
      {on && layoutGroup && (
        <motion.span
          layoutId={`chip-bg-${layoutGroup}`}
          className="chip-bg"
          transition={{ type: "spring", stiffness: 500, damping: 38 }}
        />
      )}
      <span className="chip-label">{children}</span>
      {count !== undefined && <span className="chip-count">{count}</span>}
    </button>
  );
}

export function Swatch({ name, hex, size = 14, ring }: { name: string; hex?: string; size?: number; ring?: boolean }) {
  const farbe = hex ?? PALETTE_BY_NAME[name]?.hex ?? "#999";
  return (
    <span
      className={`swatch ${ring ? "has-ring" : ""}`}
      style={{ width: size, height: size, background: farbe }}
      title={name}
      aria-hidden
    />
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  id,
}: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (v: T) => void;
  id: string;
}) {
  return (
    <div className="segmented" role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          className={value === o.value ? "is-on" : ""}
          onClick={() => onChange(o.value)}
        >
          {value === o.value && (
            <motion.span
              layoutId={`seg-${id}`}
              className="segmented-bg"
              transition={{ type: "spring", stiffness: 520, damping: 40 }}
            />
          )}
          <span className="segmented-label">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: ReactNode }) {
  return (
    <label className="toggle">
      <span>{label}</span>
      <button role="switch" aria-checked={on} className={`switch ${on ? "is-on" : ""}`} onClick={() => onChange(!on)}>
        <motion.span className="switch-knob" layout transition={{ type: "spring", stiffness: 700, damping: 40 }} />
      </button>
    </label>
  );
}

export function Empty({
  title,
  text,
  action,
  art,
}: {
  title: ReactNode;
  text?: ReactNode;
  action?: ReactNode;
  art?: ReactNode;
}) {
  return (
    <motion.div
      className="empty"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {art && <div className="empty-art">{art}</div>}
      <h3 className="display empty-title">{title}</h3>
      {text && <p className="empty-text">{text}</p>}
      {action && <div className="empty-action">{action}</div>}
    </motion.div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

export function PageHeader({
  eyebrow,
  title,
  aside,
  children,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  aside?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="page-head">
      <div className="page-head-main">
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1 className="display page-title">{title}</h1>
        {children}
      </div>
      {aside && <div className="page-head-aside">{aside}</div>}
    </header>
  );
}

export const fadeUp = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
} as const;
