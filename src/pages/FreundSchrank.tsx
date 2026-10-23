// Geteilter Schrank eines Freundes – nur ansehen, kein Konto nötig.
import { m } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { Lightbox } from "../components/Lightbox";
import { Overlay } from "../components/Overlay";
import { Chip, Empty, Swatch } from "../components/ui";
import { freundSchrank, type FreundTeil } from "../lib/freigabe";
import { CATEGORIES } from "../lib/model";
import { go } from "../lib/router";

export function FreundSchrank({ token }: { token: string }) {
  const [daten, setDaten] = useState<{ name: string | null; teile: FreundTeil[] } | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [kat, setKat] = useState<string>("alle");
  const [gross, setGross] = useState<FreundTeil | null>(null);

  useEffect(() => {
    freundSchrank(token).then(setDaten, (e) => setFehler(e instanceof Error ? e.message : "Link nicht gültig"));
  }, [token]);

  const sichtbar = useMemo(() => (daten?.teile ?? []).filter((t) => kat === "alle" || t.category === kat), [daten, kat]);
  const kats = CATEGORIES.filter((c) => daten?.teile.some((t) => t.category === c.key));

  return (
    <Overlay title={daten?.name ? `Schrank von ${daten.name}` : "Geteilter Schrank"} onClose={() => go("heute", true)}>
      <div className="wrap freund">
        {fehler ? (
          <Empty title="Link nicht gültig" text={fehler} />
        ) : !daten ? (
          <div className="seite-laedt"><span className="spinner" /></div>
        ) : (
          <>
            <p className="eyebrow freund-info">{daten.teile.length} Teile · nur ansehen</p>
            <div className="cat-row scroll-x freund-kats">
              <Chip on={kat === "alle"} onClick={() => setKat("alle")} layoutGroup="freund">Alle</Chip>
              {kats.map((c) => (
                <Chip key={c.key} on={kat === c.key} onClick={() => setKat(c.key)} layoutGroup="freund">{c.label}</Chip>
              ))}
            </div>
            <div className="grid">
              {sichtbar.map((t, n) => (
                <m.button
                  key={t.id}
                  className="card freund-card"
                  onClick={() => setGross(t)}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(n, 12) * 0.03, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="tile">
                    <div className={`garment ${t.freigestellt ? "is-cut" : "is-photo"}`}>
                      {t.thumb && <img src={t.thumb} alt={t.name || t.sub} loading="lazy" decoding="async" />}
                    </div>
                  </div>
                  <div className="card-info">
                    <span className="card-brand">{t.brand || t.sub}</span>
                    <div className="card-name">{t.name || [t.colors[0]?.name, t.sub].filter(Boolean).join(" ")}</div>
                    <div className="card-meta">
                      <span className="card-swatches">{t.colors.slice(0, 3).map((c) => <Swatch key={c.name} name={c.name} hex={c.hex} size={10} ring />)}</span>
                      {t.size && <span>Gr. {t.size}</span>}
                    </div>
                  </div>
                </m.button>
              ))}
            </div>
          </>
        )}
      </div>
      <Lightbox src={gross?.bild ?? gross?.thumb ?? null} cut={Boolean(gross?.freigestellt)} open={gross !== null} onClose={() => setGross(null)} />
    </Overlay>
  );
}
