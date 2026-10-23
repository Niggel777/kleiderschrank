// Der Schrank als Shop: Kategorien, Suche, Filter, Sortierung.
import { AnimatePresence, m } from "framer-motion";
import { ArrowDownUp, Camera, Check, Search, SlidersHorizontal, Sparkles, X } from "lucide-react";
import { useMemo, useState } from "react";
import { GarmentImage, ProductCard } from "../components/Garment";
import { Sheet } from "../components/Sheet";
import { Button, Chip, Empty, Segmented, Swatch, Toggle } from "../components/ui";
import { PALETTE } from "../lib/colors";
import { useLocal } from "../lib/hooks";
import { CATEGORIES, CATEGORY, OCCASIONS, SEASONS, sizeRank, type CategoryKey, type Item, type Occasion, type Season } from "../lib/model";
import { go } from "../lib/router";
import { SORT_LABEL, idleDays, sortItems, statOf, type SortKey } from "../lib/stats";
import { useGarderobe } from "../lib/store";
import { useToast } from "../components/Toast";

type Bereich = "schrank" | "wunsch" | "verkauf";

interface Filter {
  farben: string[];
  groessen: string[];
  saisons: Season[];
  anlaesse: Occasion[];
  marken: string[];
  favoriten: boolean;
  schlaefer: boolean;
  waesche: boolean;
}

const LEER: Filter = { farben: [], groessen: [], saisons: [], anlaesse: [], marken: [], favoriten: false, schlaefer: false, waesche: false };

function toggle<T>(list: T[], v: T): T[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

function suchtext(i: Item): string {
  return [i.name, i.brand, i.sub, CATEGORY[i.category].label, i.material, i.notes, i.size, ...i.colors.map((c) => c.name), ...i.occasions, ...i.seasons]
    .join(" ")
    .toLowerCase();
}

export function Schrank({ q }: { q: URLSearchParams }) {
  const { items, idx, bereit } = useGarderobe();
  const toast = useToast();
  const [bereich, setBereich] = useState<Bereich>((q.get("bereich") as Bereich) ?? "schrank");
  const [kat, setKat] = useState<CategoryKey | "alle">((q.get("kat") as CategoryKey) ?? "alle");
  const [suche, setSuche] = useState("");
  const [filter, setFilter] = useState<Filter>(() => ({
    ...LEER,
    farben: q.get("farbe") ? [q.get("farbe")!] : [],
    schlaefer: q.get("schlaefer") === "1",
    waesche: q.get("waesche") === "1",
  }));
  const [sort, setSort] = useLocal<SortKey>("garderobe.sort", "neu");
  const [filterOffen, setFilterOffen] = useState(false);
  const [sortOffen, setSortOffen] = useState(false);
  const [demoLaedt, setDemoLaedt] = useState<string | null>(null);

  const imBereich = useMemo(
    () =>
      items.filter((i) =>
        bereich === "schrank" ? i.status === "owned" || i.status === "selling" : bereich === "wunsch" ? i.status === "wish" : i.status === "selling" || i.status === "sold",
      ),
    [items, bereich],
  );

  const vorKategorie = useMemo(() => {
    const s = suche.trim().toLowerCase();
    return imBereich.filter((i) => {
      if (s && !s.split(/\s+/).every((w) => suchtext(i).includes(w))) return false;
      if (filter.farben.length && !i.colors.some((c) => filter.farben.includes(c.name))) return false;
      if (filter.groessen.length && !filter.groessen.includes(i.size)) return false;
      if (filter.saisons.length && i.seasons.length && !i.seasons.some((x) => filter.saisons.includes(x))) return false;
      if (filter.anlaesse.length && !i.occasions.some((x) => filter.anlaesse.includes(x))) return false;
      if (filter.marken.length && !filter.marken.includes(i.brand)) return false;
      if (filter.favoriten && !i.favorite) return false;
      if (filter.schlaefer && idleDays(i, statOf(idx, i.id)) < 60) return false;
      if (filter.waesche && !i.inWaesche) return false;
      return true;
    });
  }, [imBereich, suche, filter, idx]);

  const sichtbar = useMemo(
    () => sortItems(kat === "alle" ? vorKategorie : vorKategorie.filter((i) => i.category === kat), sort, idx),
    [vorKategorie, kat, sort, idx],
  );

  const zaehler = useMemo(() => {
    const m = new Map<string, number>();
    for (const i of vorKategorie) m.set(i.category, (m.get(i.category) ?? 0) + 1);
    return m;
  }, [vorKategorie]);

  const aktiveFilter =
    filter.farben.length + filter.groessen.length + filter.saisons.length + filter.anlaesse.length + filter.marken.length + (filter.favoriten ? 1 : 0) + (filter.schlaefer ? 1 : 0) + (filter.waesche ? 1 : 0);


  if (bereit && items.length === 0) {
    return (
      <div className="wrap">
        <div className="hero-empty">
          <m.div className="hero-empty-art" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}>
            <HangerArt />
          </m.div>
          <Empty
            title={
              <>
                Dein Schrank, <em>digital.</em>
              </>
            }
            text="Fotografiere ein Kleidungsstück – der Hintergrund wird automatisch entfernt, Farben werden erkannt. Danach kombinierst du Outfits, probierst sie an und siehst, was du lange nicht getragen hast."
            action={
              <div className="row-gap">
                <Button variant="primary" size="l" icon={<Camera size={18} />} onClick={() => go("neu")}>
                  Erstes Teil fotografieren
                </Button>
                <Button
                  size="l"
                  icon={<Sparkles size={18} />}
                  disabled={demoLaedt !== null}
                  onClick={async () => {
                    setDemoLaedt("");
                    const { ladeDemo } = await import("../demo/seed");
                    await ladeDemo((n, von) => setDemoLaedt(`${n}/${von}`));
                    setDemoLaedt(null);
                    toast("Beispiel-Schrank geladen – du kannst ihn unter Einstellungen wieder entfernen");
                  }}
                >
                  {demoLaedt !== null ? `Wird eingeräumt … ${demoLaedt}` : "Beispiel-Schrank ansehen"}
                </Button>
              </div>
            }
          />
        </div>
      </div>
    );
  }

  const markenAlle = [...new Set(imBereich.map((i) => i.brand).filter(Boolean))].sort((a, b) => a.localeCompare(b, "de"));
  const groessenAlle = [...new Set(imBereich.map((i) => i.size).filter(Boolean))].sort((a, b) => sizeRank(a) - sizeRank(b));
  const farbenAlle = PALETTE.filter((p) => imBereich.some((i) => i.colors.some((c) => c.name === p.name)));

  return (
    <div className="wrap">
      <header className="shop-head">
        <div>
          <div className="eyebrow tabular">
            {imBereich.length} {imBereich.length === 1 ? "Teil" : "Teile"}
          </div>
          <h1 className="display page-title">
            {bereich === "schrank" ? (
              <>
                Dein <em>Schrank</em>
              </>
            ) : bereich === "wunsch" ? (
              <>
                Wunsch<em>liste</em>
              </>
            ) : (
              <>
                Ver<em>kauf</em>
              </>
            )}
          </h1>
        </div>
        <Segmented<Bereich>
          id="bereich"
          value={bereich}
          onChange={(b) => {
            setBereich(b);
            setKat("alle");
          }}
          options={[
            { value: "schrank", label: "Schrank" },
            { value: "wunsch", label: "Wunschliste" },
            { value: "verkauf", label: "Verkauf" },
          ]}
        />
      </header>

      <div className="shop-bar">
        <div className="search">
          <Search size={17} strokeWidth={1.7} />
          <input
            type="search"
            placeholder="Suchen – Marke, Farbe, Material …"
            value={suche}
            onChange={(e) => setSuche(e.target.value)}
            aria-label="Schrank durchsuchen"
          />
          {suche && (
            <button className="search-clear" onClick={() => setSuche("")} aria-label="Suche leeren">
              <X size={15} />
            </button>
          )}
        </div>
        <Button icon={<SlidersHorizontal size={16} />} onClick={() => setFilterOffen(true)} className={aktiveFilter ? "has-count" : ""}>
          Filter{aktiveFilter > 0 && <span className="btn-count">{aktiveFilter}</span>}
        </Button>
        <Button icon={<ArrowDownUp size={16} />} onClick={() => setSortOffen(true)}>
          <span className="only-desktop-inline">{SORT_LABEL[sort]}</span>
          <span className="only-mobile-inline">Sortieren</span>
        </Button>
      </div>

      <div className="stories" role="tablist" aria-label="Kategorien">
        <button className={`story ${kat === "alle" ? "is-on" : ""}`} onClick={() => setKat("alle")}>
          <span className="story-ring"><span className="story-inner"><span className="story-alle">{vorKategorie.length}</span></span></span>
          <span>Alle</span>
        </button>
        {CATEGORIES.filter((c) => (zaehler.get(c.key) ?? 0) > 0).map((c) => {
          const titel = vorKategorie.find((i) => i.category === c.key);
          return (
            <m.button key={c.key} className={`story ${kat === c.key ? "is-on" : ""}`} onClick={() => setKat(c.key)} whileTap={{ scale: 0.94 }}>
              <span className="story-ring"><span className="story-inner">{titel && <GarmentImage item={titel} />}</span></span>
              <span>{c.label.split(" ")[0]}</span>
            </m.button>
          );
        })}
      </div>
      <div className="cat-row scroll-x">
        <Chip on={kat === "alle"} onClick={() => setKat("alle")} count={vorKategorie.length} layoutGroup="kat">
          Alle
        </Chip>
        {CATEGORIES.filter((c) => kat === c.key || (zaehler.get(c.key) ?? 0) > 0).map((c) => (
          <Chip key={c.key} on={kat === c.key} onClick={() => setKat(c.key)} count={zaehler.get(c.key) ?? 0} layoutGroup="kat">
            {c.label}
          </Chip>
        ))}
      </div>

      <AnimatePresence initial={false}>
        {aktiveFilter > 0 && (
          <m.div className="active-filters" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
            <div className="active-filters-inner">
              {filter.farben.map((f) => (
                <button key={f} className="pill" onClick={() => setFilter({ ...filter, farben: toggle(filter.farben, f) })}>
                  <Swatch name={f} size={10} ring /> {f} <X size={12} />
                </button>
              ))}
              {filter.groessen.map((f) => (
                <button key={f} className="pill" onClick={() => setFilter({ ...filter, groessen: toggle(filter.groessen, f) })}>
                  Gr. {f} <X size={12} />
                </button>
              ))}
              {[...filter.saisons, ...filter.anlaesse, ...filter.marken].map((f) => (
                <button
                  key={f}
                  className="pill"
                  onClick={() =>
                    setFilter({
                      ...filter,
                      saisons: filter.saisons.filter((x) => x !== f),
                      anlaesse: filter.anlaesse.filter((x) => x !== f),
                      marken: filter.marken.filter((x) => x !== f),
                    })
                  }
                >
                  {f} <X size={12} />
                </button>
              ))}
              {filter.favoriten && (
                <button className="pill" onClick={() => setFilter({ ...filter, favoriten: false })}>
                  Favoriten <X size={12} />
                </button>
              )}
              {filter.waesche && (
                <button className="pill" onClick={() => setFilter({ ...filter, waesche: false })}>
                  In der Wäsche <X size={12} />
                </button>
              )}
              {filter.schlaefer && (
                <button className="pill" onClick={() => setFilter({ ...filter, schlaefer: false })}>
                  Lange nicht getragen <X size={12} />
                </button>
              )}
              <button className="pill-reset" onClick={() => setFilter(LEER)}>
                Alle zurücksetzen
              </button>
            </div>
          </m.div>
        )}
      </AnimatePresence>

      {sichtbar.length === 0 ? (
        <Empty
          title={bereich === "wunsch" ? "Noch keine Wünsche" : bereich === "verkauf" ? "Nichts im Verkauf" : "Nichts gefunden"}
          text={
            bereich === "wunsch"
              ? "Fotografiere Teile im Laden oder speichere Screenshots aus Shops – dann siehst du, womit du sie kombinieren kannst, bevor du kaufst."
              : bereich === "verkauf"
                ? "Markiere Teile, die du lange nicht getragen hast, zum Verkauf – die App bereitet Fotos und Anzeigentext für Vinted vor."
                : "Probier andere Filter oder eine andere Kategorie."
          }
          action={
            bereich === "wunsch" ? (
              <Button variant="primary" icon={<Camera size={16} />} onClick={() => go("neu?status=wish")}>
                Wunschteil hinzufügen
              </Button>
            ) : bereich === "verkauf" ? (
              <Button onClick={() => { setBereich("schrank"); setFilter({ ...LEER, schlaefer: true }); }}>Schrankhüter ansehen</Button>
            ) : aktiveFilter || suche ? (
              <Button onClick={() => { setFilter(LEER); setSuche(""); setKat("alle"); }}>Filter zurücksetzen</Button>
            ) : undefined
          }
        />
      ) : (
        <m.div className="grid" layout>
          <AnimatePresence mode="popLayout">
            {sichtbar.map((item, n) => (
              <ProductCard key={item.id} item={item} stat={statOf(idx, item.id)} index={n} />
            ))}
          </AnimatePresence>
        </m.div>
      )}

      <Sheet
        open={filterOffen}
        onClose={() => setFilterOffen(false)}
        title="Filter"
        footer={
          <div className="row-gap spread">
            <Button variant="ghost" onClick={() => setFilter(LEER)}>
              Zurücksetzen
            </Button>
            <Button variant="primary" onClick={() => setFilterOffen(false)}>
              {sichtbar.length} {sichtbar.length === 1 ? "Teil" : "Teile"} anzeigen
            </Button>
          </div>
        }
      >
        <section className="filter-section">
          <h3 className="eyebrow">Farbe</h3>
          <div className="swatch-grid">
            {(farbenAlle.length ? farbenAlle : PALETTE).map((p) => {
              const on = filter.farben.includes(p.name);
              return (
                <button key={p.name} className={`swatch-btn ${on ? "is-on" : ""}`} onClick={() => setFilter({ ...filter, farben: toggle(filter.farben, p.name) })} aria-pressed={on}>
                  <span className="swatch-big" style={{ background: p.hex }}>
                    {on && <Check size={14} strokeWidth={2.5} />}
                  </span>
                  <span>{p.name}</span>
                </button>
              );
            })}
          </div>
        </section>
        {groessenAlle.length > 0 && (
          <section className="filter-section">
            <h3 className="eyebrow">Größe</h3>
            <div className="chip-wrap">
              {groessenAlle.map((g) => (
                <Chip key={g} on={filter.groessen.includes(g)} onClick={() => setFilter({ ...filter, groessen: toggle(filter.groessen, g) })}>
                  {g}
                </Chip>
              ))}
            </div>
          </section>
        )}
        <section className="filter-section">
          <h3 className="eyebrow">Saison</h3>
          <div className="chip-wrap">
            {SEASONS.map((s) => (
              <Chip key={s} on={filter.saisons.includes(s)} onClick={() => setFilter({ ...filter, saisons: toggle(filter.saisons, s) })}>
                {s}
              </Chip>
            ))}
          </div>
        </section>
        <section className="filter-section">
          <h3 className="eyebrow">Anlass</h3>
          <div className="chip-wrap">
            {OCCASIONS.map((s) => (
              <Chip key={s} on={filter.anlaesse.includes(s)} onClick={() => setFilter({ ...filter, anlaesse: toggle(filter.anlaesse, s) })}>
                {s}
              </Chip>
            ))}
          </div>
        </section>
        {markenAlle.length > 0 && (
          <section className="filter-section">
            <h3 className="eyebrow">Marke</h3>
            <div className="chip-wrap">
              {markenAlle.map((m) => (
                <Chip key={m} on={filter.marken.includes(m)} onClick={() => setFilter({ ...filter, marken: toggle(filter.marken, m) })}>
                  {m}
                </Chip>
              ))}
            </div>
          </section>
        )}
        <section className="filter-section">
          <Toggle on={filter.favoriten} onChange={(v) => setFilter({ ...filter, favoriten: v })} label="Nur Favoriten" />
          <Toggle on={filter.schlaefer} onChange={(v) => setFilter({ ...filter, schlaefer: v })} label="Seit über 2 Monaten nicht getragen" />
          <Toggle on={filter.waesche} onChange={(v) => setFilter({ ...filter, waesche: v })} label="Nur Teile in der Wäsche" />
        </section>
      </Sheet>

      <Sheet open={sortOffen} onClose={() => setSortOffen(false)} title="Sortieren">
        <div className="option-list">
          {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => (
            <button
              key={k}
              className={`option ${sort === k ? "is-on" : ""}`}
              onClick={() => {
                setSort(k);
                setSortOffen(false);
              }}
            >
              <span>{SORT_LABEL[k]}</span>
              {sort === k && <Check size={16} />}
            </button>
          ))}
        </div>
      </Sheet>
    </div>
  );
}

export function HangerArt() {
  return (
    <svg viewBox="0 0 320 220" className="hanger-art" aria-hidden>
      <m.path
        d="M160 40c0-12 10-20 21-18 10 2 16 12 13 22-2 7-9 11-16 13l-18 5v8L28 150c-9 5-6 18 4 18h256c10 0 13-13 4-18L160 70"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 2.2, ease: [0.65, 0, 0.35, 1] }}
      />
    </svg>
  );
}
