// Darstellung eines Kleidungsstücks: freigestellt mit weichem Schatten oder als Foto.
import { m } from "framer-motion";
import { Heart, Check } from "lucide-react";
import { forwardRef, memo, useEffect, useRef, useState } from "react";
import { relativeDay } from "../lib/dates";
import { db, logWear } from "../lib/db";
import { isoDay } from "../lib/dates";
import { displayName, type Item } from "../lib/model";
import { displayImageId, imageUrl, useImageUrl } from "../lib/store";
import { idleDays, type WearStat } from "../lib/stats";
import { useToast } from "./Toast";
import { Swatch } from "./ui";
import { Tilt } from "./Motion";

// Bilder erst laden, wenn sie in die Nähe des sichtbaren Bereichs kommen (spart Arbeit bei großen Schränken)
const sichtbarSchon = new Set<string>();
let beobachter: IntersectionObserver | null = null;
const rueckrufe = new WeakMap<Element, () => void>();
function beobachte(el: Element, f: () => void) {
  if (typeof IntersectionObserver === "undefined") return f();
  beobachter ??= new IntersectionObserver(
    (eintraege) => {
      for (const e of eintraege) {
        if (!e.isIntersecting) continue;
        rueckrufe.get(e.target)?.();
        beobachter!.unobserve(e.target);
        rueckrufe.delete(e.target);
      }
    },
    { rootMargin: "600px 0px" },
  );
  rueckrufe.set(el, f);
  beobachter.observe(el);
}

export const GarmentImage = memo(function GarmentImage({
  item,
  large,
  className = "",
  fit = "contain",
}: {
  item: Item;
  large?: boolean;
  className?: string;
  fit?: "contain" | "cover";
}) {
  const bildId = displayImageId(item, large);
  const ref = useRef<HTMLDivElement>(null);
  const [sichtbar, setSichtbar] = useState(() => large || (bildId ? sichtbarSchon.has(bildId) : false));
  useEffect(() => {
    if (sichtbar || !ref.current) return;
    beobachte(ref.current, () => {
      if (bildId) sichtbarSchon.add(bildId);
      setSichtbar(true);
    });
    const el = ref.current;
    // Absicherung: falls der Beobachter nicht feuert (z. B. Hintergrund-Tab), trotzdem laden
    const t = window.setTimeout(() => setSichtbar(true), 2500);
    return () => {
      window.clearTimeout(t);
      beobachter?.unobserve(el);
      rueckrufe.delete(el);
    };
  }, [sichtbar, bildId]);
  const url = useImageUrl(sichtbar ? bildId : null);
  const cut = Boolean(item.imageCutout);
  return (
    <div ref={ref} className={`garment ${cut ? "is-cut" : "is-photo"} fit-${fit} ${className}`}>
      {url ? (
        <m.img
          src={url}
          alt={displayName(item)}
          draggable={false}
          decoding="async"
          initial={sichtbarSchon.has(`fade:${bildId}`) ? false : { opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          onAnimationComplete={() => sichtbarSchon.add(`fade:${bildId}`)}
        />
      ) : (
        <span className="garment-placeholder" />
      )}
    </div>
  );
});

export const ProductCard = forwardRef<HTMLElement, {
  item: Item;
  stat: WearStat;
  index?: number;
  onOpen?: () => void;
}>(function ProductCard({ item, stat, index = 0, onOpen }, ref) {
  const toast = useToast();
  const idle = idleDays(item, stat);
  const heute = stat.last === isoDay();
  const schlaefer = item.status === "owned" && idle >= 60;

  async function getragen(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    await logWear(isoDay(), [item.id]);
    toast(`${displayName(item)} heute getragen`);
  }
  async function favorit(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    await db.items.update(item.id, { favorite: !item.favorite });
  }

  return (
    <m.article
      ref={ref}
      className="card"
      layout="position"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: Math.min(index, 12) * 0.035 }}
    >
      <a
        href={`#/teil/${item.id}`}
        className="card-media"
        onPointerEnter={() => {
          const gross = displayImageId(item, true);
          if (gross) imageUrl(gross);
        }}
        onClick={(e) => {
          if (onOpen) {
            e.preventDefault();
            onOpen();
          }
        }}
      >
        <Tilt>
          <m.div layoutId={`media-${item.id}`} className="tile" transition={{ type: "spring", stiffness: 260, damping: 32 }}>
            <GarmentImage item={item} />
          </m.div>
        </Tilt>
        <div className="card-badges">
          {item.status === "wish" && <span className="badge">Wunsch</span>}
          {item.inWaesche && <span className="badge badge-wash">Wäsche</span>}
          {item.status === "selling" && <span className="badge badge-rust">Zum Verkauf</span>}
          {item.status === "sold" && <span className="badge">Verkauft</span>}
          {schlaefer && <span className="badge badge-quiet">{stat.count ? `${Math.floor(idle / 30)} Mon. nicht getragen` : "Noch nie getragen"}</span>}
        </div>
      </a>
      <div className="card-actions">
        <button className={`card-action ${item.favorite ? "is-on" : ""}`} onClick={favorit} aria-label={item.favorite ? "Favorit entfernen" : "Als Favorit markieren"}>
          <Heart size={16} fill={item.favorite ? "currentColor" : "none"} />
        </button>
        {item.status !== "wish" && item.status !== "sold" && (
          <button className={`card-action ${heute ? "is-on" : ""}`} onClick={getragen} aria-label="Heute getragen" disabled={heute}>
            <Check size={16} />
          </button>
        )}
      </div>
      <a href={`#/teil/${item.id}`} className="card-info" tabIndex={-1}>
        <div className="card-row">
          <span className="card-brand">{item.brand || item.sub || "Ohne Marke"}</span>
        </div>
        <div className="card-name">{displayName(item)}</div>
        <div className="card-meta">
          <span className="card-swatches">
            {item.colors.slice(0, 3).map((c) => (
              <Swatch key={c.name} name={c.name} size={10} ring />
            ))}
          </span>
          {item.size && <span>{item.size === "One Size" ? item.size : `Gr. ${item.size}`}</span>}
          <span className="dot" />
          <span>{item.status === "wish" ? "Wunschliste" : stat.count ? relativeDay(stat.last) : "noch nie getragen"}</span>
        </div>
      </a>
    </m.article>
  );
});
