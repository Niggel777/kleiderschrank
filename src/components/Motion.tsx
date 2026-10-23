// Bewegung: weiches Scrollen, 3D-Neigung, hochzählende Zahlen, Konfetti.
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { animate, m, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";

let lenis: Lenis | null = null;

export function startSmoothScroll(): void {
  if (lenis || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  lenis = new Lenis({ autoRaf: true, lerp: 0.11, wheelMultiplier: 0.95, prevent: (n) => Boolean(n.closest?.(".overlay, .sheet, .scroll-x, .fitting-stage")) });
}

/** Bei offenen Ebenen (Detailseite, Sheet) das Seiten-Scrollen anhalten. */
export function pauseSmoothScroll(pause: boolean): void {
  if (!lenis) return;
  if (pause) lenis.stop();
  else lenis.start();
}

export function scrollToTop(): void {
  if (lenis) lenis.scrollTo(0, { immediate: true });
  else window.scrollTo({ top: 0 });
}

export function useScrolled(schwelle = 8): boolean {
  const [s, setS] = useState(false);
  useEffect(() => {
    const on = () => setS(window.scrollY > schwelle);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, [schwelle]);
  return s;
}

/** Leichte 3D-Neigung zur Mausposition (nur bei Geräten mit Hover). */
export function Tilt({ children, staerke = 7, className = "" }: { children: ReactNode; staerke?: number; className?: string }) {
  const x = useMotionValue(0.5);
  const y = useMotionValue(0.5);
  const rx = useSpring(useTransform(y, [0, 1], [staerke, -staerke]), { stiffness: 220, damping: 22 });
  const ry = useSpring(useTransform(x, [0, 1], [-staerke, staerke]), { stiffness: 220, damping: 22 });
  const hover = typeof matchMedia !== "undefined" && matchMedia("(hover: hover)").matches;
  if (!hover) return <div className={className}>{children}</div>;
  return (
    <m.div
      className={`tilt ${className}`}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 900 }}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        x.set((e.clientX - r.left) / r.width);
        y.set((e.clientY - r.top) / r.height);
      }}
      onPointerLeave={() => {
        x.set(0.5);
        y.set(0.5);
      }}
    >
      {children}
    </m.div>
  );
}

/** Zahl zählt beim Erscheinen hoch. */
export function CountUp({ wert, suffix = "" }: { wert: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const c = animate(0, wert, {
      duration: 1.1,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => (el.textContent = `${Math.round(v)}${suffix}`),
    });
    return () => c.stop();
  }, [wert, suffix]);
  return <span ref={ref} className="tabular">{`0${suffix}`}</span>;
}

export async function konfetti(): Promise<void> {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  haptik([12, 40, 18]);
  const { default: confetti } = await import("canvas-confetti");
  const farben = ["#9e5428", "#d88f5f", "#16140f", "#50665a", "#e8e3da"];
  confetti({ particleCount: 70, spread: 75, startVelocity: 38, origin: { y: 0.75 }, colors: farben, scalar: 0.9, ticks: 160 });
}

/** Kurzes Vibrieren als Bestätigung (Android; iOS-Safari ignoriert es still). */
export function haptik(muster: number | number[] = 12): void {
  try {
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches) navigator.vibrate?.(muster);
  } catch {
    /* nicht unterstützt */
  }
}
