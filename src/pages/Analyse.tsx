// Analyse: Kennzahlen, Schrankhüter, Lieblinge, Farben, Kategorien, Verkauf.
import { motion } from "framer-motion";
import { Sparkles, Tag } from "lucide-react";
import { useMemo, useState } from "react";
import { GarmentImage, ProductCard } from "../components/Garment";
import { Button, Empty } from "../components/ui";
import { PALETTE_BY_NAME } from "../lib/colors";
import { addDays, isoDay } from "../lib/dates";
import { CATEGORIES, displayName } from "../lib/model";
import { go } from "../lib/router";
import { idleDays, kombiPartner, statOf } from "../lib/stats";
import { useGarderobe } from "../lib/store";
import { CountUp } from "../components/Motion";

const rein = { initial: { opacity: 0, y: 16 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: "-40px" }, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } } as const;

export function Analyse() {
  const { schrank, items, idx, wears, outfits } = useGarderobe();
  const [hover, setHover] = useState<string | null>(null);
  const heute = isoDay();

  const k = useMemo(() => {
    const seit30 = addDays(heute, -30);
    const tage30 = new Set(wears.filter((w) => w.date >= seit30).map((w) => w.date)).size;
    const seit90 = addDays(heute, -90);
    const getragen90 = new Set(wears.filter((w) => w.date >= seit90).flatMap((w) => w.itemIds));
    const quote = schrank.length ? schrank.filter((i) => getragen90.has(i.id)).length / schrank.length : 0;
    const schlaefer = schrank
      .filter((i) => i.status === "owned" && idleDays(i, statOf(idx, i.id)) >= 60)
      .sort((a, b) => idleDays(b, statOf(idx, b.id)) - idleDays(a, statOf(idx, a.id)));
    const lieblinge = [...schrank].sort((a, b) => statOf(idx, b.id).count - statOf(idx, a.id).count).filter((i) => statOf(idx, i.id).count > 0).slice(0, 6);
    const farben = new Map<string, number>();
    for (const i of schrank) if (i.colors[0]) farben.set(i.colors[0].name, (farben.get(i.colors[0].name) ?? 0) + 1);
    const kats = CATEGORIES.map((c) => ({ c, n: schrank.filter((i) => i.category === c.key).length })).filter((x) => x.n);
    const verkauft = items.filter((i) => i.status === "sold");
    const imVerkauf = items.filter((i) => i.status === "selling");
    const partner = kombiPartner(wears);
    const vielseitig = schrank
      .map((i) => ({ i, n: partner.get(i.id)?.size ?? 0 }))
      .filter((x) => x.n > 0)
      .sort((a, b) => b.n - a.n)
      .slice(0, 4);
    return { tage30, quote, schlaefer, lieblinge, farben: [...farben.entries()].sort((a, b) => b[1] - a[1]), kats, verkauft, imVerkauf, vielseitig };
  }, [schrank, items, idx, wears, heute]);

  if (!schrank.length) return <div className="wrap"><Empty title={<>Noch nichts zu <em>analysieren</em></>} text="Sobald Teile im Schrank sind und du einträgst, was du trägst, erscheinen hier deine Muster." /></div>;

  const maxLieb = Math.max(1, ...k.lieblinge.map((i) => statOf(idx, i.id).count));
  const maxKat = Math.max(1, ...k.kats.map((x) => x.n));

  return (
    <div className="wrap analyse">
      <header className="shop-head">
        <div>
          <div className="eyebrow">Dein Schrank in Zahlen</div>
          <h1 className="display page-title">Ana<em>lyse</em></h1>
        </div>
      </header>

      <motion.section className="hero-kpis" {...rein}>
        <Kpi wert={<CountUp wert={schrank.length} />} label="Teile im Schrank" />
        <Kpi wert={<CountUp wert={k.tage30} />} label="Tage in 30 Tagen erfasst" />
        <Kpi wert={<CountUp wert={Math.round(k.quote * 100)} suffix=" %" />} label="in 90 Tagen getragen" hint={`${Math.round((1 - k.quote) * schrank.length)} Teile hängen nur`} />
        <Kpi wert={<CountUp wert={outfits.length} />} label="Outfits gespeichert" />
      </motion.section>

      {k.schlaefer.length > 0 && (
        <motion.section className="detail-section" {...rein}>
          <div className="section-head">
            <div>
              <h2 className="section-title">Schrankhüter</h2>
              <p className="muted section-sub">{k.schlaefer.length} Teile seit über zwei Monaten nicht getragen</p>
            </div>
            <a className="link" href="#/schrank?schlaefer=1">Alle ansehen</a>
          </div>
          <div className="rail scroll-x">
            {k.schlaefer.slice(0, 10).map((i, n) => (
              <div key={i.id} className="rail-item sleeper">
                <ProductCard item={i} stat={statOf(idx, i.id)} index={n} />
                <div className="sleeper-actions">
                  <button onClick={() => go(`outfits?lock=${i.id}`)} aria-label="Outfit damit"><Sparkles size={14} /> Outfit</button>
                  <button onClick={() => go(`teil/${i.id}`)} aria-label="Verkaufen"><Tag size={14} /> Verkaufen</button>
                </div>
              </div>
            ))}
          </div>
        </motion.section>
      )}

      <div className="analyse-grid">
        {k.lieblinge.length > 0 && (
          <motion.section className="panel" {...rein}>
            <h2 className="section-title">Lieblinge</h2>
            <p className="muted section-sub">Am häufigsten getragen</p>
            <ol className="bars">
              {k.lieblinge.map((i, n) => {
                const c = statOf(idx, i.id).count;
                return (
                  <li key={i.id}>
                    <a href={`#/teil/${i.id}`} className="bar-row">
                      <span className="piece-thumb small"><GarmentImage item={i} /></span>
                      <span className="bar-main">
                        <span className="bar-label"><span>{displayName(i)}</span><span className="tabular">{c}×</span></span>
                        <span className="bar-track"><motion.span className="bar-fill" initial={{ width: 0 }} whileInView={{ width: `${(c / maxLieb) * 100}%` }} viewport={{ once: true }} transition={{ duration: 0.8, delay: n * 0.06, ease: [0.22, 1, 0.36, 1] }} /></span>
                      </span>
                    </a>
                  </li>
                );
              })}
            </ol>
          </motion.section>
        )}

        <motion.section className="panel" {...rein}>
          <h2 className="section-title">Farbpalette</h2>
          <p className="muted section-sub">Hauptfarben deiner Teile · {hover ?? "fahr über einen Abschnitt"}</p>
          <div className="color-bar" role="img" aria-label={k.farben.map(([f, n]) => `${f} ${n}`).join(", ")}>
            {k.farben.map(([f, n], i) => (
              <motion.a
                key={f}
                href={`#/schrank?farbe=${encodeURIComponent(f)}`}
                className="color-seg"
                style={{ background: PALETTE_BY_NAME[f]?.hex, flexGrow: n }}
                initial={{ scaleY: 0 }}
                whileInView={{ scaleY: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04, duration: 0.5 }}
                onMouseEnter={() => setHover(`${f}: ${n} ${n === 1 ? "Teil" : "Teile"} (${Math.round((n / schrank.length) * 100)} %)`)}
                onMouseLeave={() => setHover(null)}
                title={`${f}: ${n}`}
              />
            ))}
          </div>
          <ul className="color-legend">
            {k.farben.map(([f, n]) => (
              <li key={f}>
                <a href={`#/schrank?farbe=${encodeURIComponent(f)}`}>
                  <span className="swatch has-ring" style={{ width: 10, height: 10, background: PALETTE_BY_NAME[f]?.hex }} /> {f} <span className="muted tabular">{n}</span>
                </a>
              </li>
            ))}
          </ul>
        </motion.section>

        <motion.section className="panel" {...rein}>
          <h2 className="section-title">Kategorien</h2>
          <p className="muted section-sub">Teile pro Kategorie</p>
          <ol className="bars">
            {k.kats.map(({ c, n }, i) => (
              <li key={c.key}>
                <a href={`#/schrank?kat=${c.key}`} className="bar-row">
                  <span className="bar-main">
                    <span className="bar-label"><span>{c.label}</span><span className="tabular">{n}</span></span>
                    <span className="bar-track"><motion.span className="bar-fill" initial={{ width: 0 }} whileInView={{ width: `${(n / maxKat) * 100}%` }} viewport={{ once: true }} transition={{ duration: 0.8, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }} /></span>
                  </span>
                </a>
              </li>
            ))}
          </ol>
        </motion.section>

        <motion.section className="panel" {...rein}>
          <h2 className="section-title">Vielseitig</h2>
          <p className="muted section-sub">Mit den meisten verschiedenen Teilen kombiniert</p>
          {k.vielseitig.length ? (
            <ul className="piece-list">
              {k.vielseitig.map(({ i, n }) => (
                <li key={i.id}>
                  <a href={`#/teil/${i.id}`} className="piece">
                    <span className="piece-thumb"><GarmentImage item={i} /></span>
                    <span className="piece-text"><strong>{displayName(i)}</strong><span>{statOf(idx, i.id).count}× getragen</span></span>
                    <span className="cpw tabular">{n} Partner</span>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Trag ein, was du anhast – dann siehst du hier deine Allrounder.</p>
          )}
        </motion.section>

        <motion.section className="panel panel-sell" {...rein}>
          <h2 className="section-title">Verkauf</h2>
          <div className="sell-stats">
            <div><span className="stat-big tabular">{k.imVerkauf.length}</span><span>im Verkauf</span></div>
            <div><span className="stat-big tabular">{k.verkauft.length}</span><span>verkauft</span></div>
          </div>
          <Button icon={<Tag size={16} />} onClick={() => go("schrank?bereich=verkauf")}>Verkaufsliste öffnen</Button>
        </motion.section>
      </div>
    </div>
  );
}

function Kpi({ wert, label, hint }: { wert: React.ReactNode; label: string; hint?: string }) {
  return (
    <div className="hero-kpi">
      <span className="hero-kpi-v tabular">{wert}</span>
      <span className="hero-kpi-l">{label}</span>
      {hint && <span className="hero-kpi-h">{hint}</span>}
    </div>
  );
}
