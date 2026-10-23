// Outfit als Flat-Lay: Teile wie auf dem Boden ausgelegt arrangieren.
import { AnimatePresence, m } from "framer-motion";
import type { CategoryKey, Item } from "../lib/model";
import { GarmentImage } from "./Garment";

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  r: number;
}

type Slots = Partial<Record<CategoryKey, Box>>;

const MIT_JACKE: Slots = {
  jacken: { x: 3, y: 3, w: 48, h: 46, z: 2, r: -3 },
  oberteile: { x: 47, y: 5, w: 49, h: 40, z: 3, r: 2 },
  kleider: { x: 44, y: 3, w: 52, h: 66, z: 3, r: 1 },
  unterteile: { x: 26, y: 38, w: 44, h: 56, z: 1, r: -1 },
  schuhe: { x: 66, y: 70, w: 31, h: 25, z: 4, r: 4 },
  accessoires: { x: 3, y: 58, w: 25, h: 24, z: 4, r: -6 },
};

const OHNE_JACKE: Slots = {
  oberteile: { x: 4, y: 3, w: 56, h: 46, z: 2, r: -2 },
  kleider: { x: 14, y: 3, w: 56, h: 72, z: 2, r: -1 },
  unterteile: { x: 44, y: 28, w: 50, h: 64, z: 1, r: 2 },
  schuhe: { x: 6, y: 64, w: 38, h: 28, z: 3, r: -4 },
  accessoires: { x: 66, y: 4, w: 29, h: 24, z: 3, r: 6 },
};

const KLEID_SCHUHE: Partial<Record<CategoryKey, Box>> = {
  schuhe: { x: 62, y: 70, w: 34, h: 25, z: 3, r: 5 },
  accessoires: { x: 70, y: 8, w: 26, h: 24, z: 3, r: 6 },
};

export function layout(items: Item[]): { item: Item; box: Box }[] {
  const hatJacke = items.some((i) => i.category === "jacken");
  const hatKleid = items.some((i) => i.category === "kleider");
  const slots: Slots = hatJacke ? MIT_JACKE : hatKleid ? { ...OHNE_JACKE, ...KLEID_SCHUHE } : OHNE_JACKE;
  const genutzt = new Set<CategoryKey>();
  const hose = slots.unterteile;
  return items.map((item, n) => {
    if (item.sub === "Gürtel" && hose) {
      // quer über den Hosenbund
      return { item, box: { x: hose.x + hose.w * 0.04, y: hose.y - hose.h * 0.03, w: hose.w * 0.92, h: hose.h * 0.13, z: hose.z + 1, r: hose.r - 2 } };
    }
    const box = !genutzt.has(item.category) ? slots[item.category] : undefined;
    genutzt.add(item.category);
    // Zweites Teil derselben Kategorie: leicht versetzt
    return { item, box: box ?? { x: 10 + n * 6, y: 10 + n * 5, w: 34, h: 30, z: 5, r: 0 } };
  });
}

export function Collage({ items, animateKey, compact }: { items: Item[]; animateKey?: string; compact?: boolean }) {
  const teile = layout(items);
  return (
    <div className={`collage ${compact ? "is-compact" : ""}`}>
      <AnimatePresence mode="popLayout" initial={false}>
        {teile.map(({ item, box }, i) => (
          <m.div
            key={`${item.id}-${animateKey ?? ""}`}
            className="collage-piece"
            style={{ left: `${box.x}%`, top: `${box.y}%`, width: `${box.w}%`, height: `${box.h}%`, zIndex: box.z }}
            initial={{ opacity: 0, scale: 0.86, y: 18, rotate: box.r - 4 }}
            animate={{ opacity: 1, scale: 1, y: 0, rotate: box.r }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            transition={{ type: "spring", stiffness: 240, damping: 24, delay: i * 0.05 }}
          >
            <GarmentImage item={item} />
          </m.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
