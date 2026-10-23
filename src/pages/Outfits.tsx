// Outfits: Vorschläge aus dem eigenen Schrank, gespeicherte Outfits, selbst zusammenstellen.
import { AnimatePresence, m } from "framer-motion";
import { Check, CloudSun, Heart, Lock, LockOpen, PersonStanding, Plus, Share2, Shuffle, Sparkles, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Collage } from "../components/Collage";
import { Swipe } from "../components/Swipe";
import { Reise } from "../components/Reise";
import { teileOutfit } from "../lib/teilen";
import { GarmentImage } from "../components/Garment";
import { OrtSheet } from "../components/OrtSheet";
import { Overlay } from "../components/Overlay";
import { Sheet } from "../components/Sheet";
import { useToast } from "../components/Toast";
import { Button, Chip, Empty, Segmented } from "../components/ui";
import { db, deleteOutfit, logWear } from "../lib/db";
import { currentSeason, formatDayShort, isoDay, relativeDay } from "../lib/dates";
import { CATEGORIES, OCCASIONS, displayName, newId, type Item, type Occasion, type Outfit } from "../lib/model";
import { generateOutfits, harmony, ordne, type Suggestion } from "../lib/outfits";
import { back, go } from "../lib/router";
import { useGarderobe, useImageUrl } from "../lib/store";
import { wetterText, useWetter } from "../lib/wetter";

type Tab = "vorschlaege" | "swipe" | "gespeichert" | "reise";

export function Outfits({ q }: { q: URLSearchParams }) {
  const { outfits } = useGarderobe();
  const [tab, setTab] = useState<Tab>((["swipe", "gespeichert", "reise"].includes(q.get("tab") ?? "") ? q.get("tab") : "vorschlaege") as Tab);
  useEffect(() => {
    const t = q.get("tab");
    if (t && ["vorschlaege", "swipe", "gespeichert", "reise"].includes(t)) setTab(t as Tab);
  }, [q]);
  return (
    <div className="wrap">
      <header className="shop-head">
        <div>
          <div className="eyebrow">{currentSeason()} · {outfits.length} gespeichert</div>
          <h1 className="display page-title">
            Out<em>fits</em>
          </h1>
        </div>
        <Segmented<Tab>
          id="outfit-tab"
          value={tab}
          onChange={setTab}
          options={[
            { value: "vorschlaege", label: "Vorschläge" },
            { value: "swipe", label: "Swipe" },
            { value: "gespeichert", label: "Gespeichert" },
            { value: "reise", label: "Reise" },
          ]}
        />
      </header>
      <m.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
          {tab === "vorschlaege" && <Vorschlaege lockParam={q.get("lock")} wunsch={q.get("wunsch") === "1"} />}
          {tab === "swipe" && <Swipe />}
          {tab === "gespeichert" && <Gespeichert />}
          {tab === "reise" && <Reise />}
      </m.div>
    </div>
  );
}

/* ───────── Vorschläge ───────── */

function Vorschlaege({ lockParam, wunsch }: { lockParam: string | null; wunsch: boolean }) {
  const { items, idx, byId, schrank } = useGarderobe();
  const toast = useToast();
  const { ort, wetter } = useWetter();
  const [anlass, setAnlass] = useState<Occasion | null>(null);
  const [schlaefer, setSchlaefer] = useState(false);
  const [mitWunsch, setMitWunsch] = useState(wunsch);
  const [locked, setLocked] = useState<string[]>(lockParam ? [lockParam] : []);
  const [runde, setRunde] = useState(0);
  const [aktiv, setAktiv] = useState(0);
  const [ortOffen, setOrtOffen] = useState(false);
  const [bauen, setBauen] = useState(false);

  useEffect(() => {
    if (lockParam) setLocked([lockParam]);
  }, [lockParam]);

  const temp = wetter ? Math.round((wetter.temp + wetter.max) / 2) : null;
  const vorschlaege = useMemo(
    () => generateOutfits(items, idx, { occasion: anlass, temp, lockedIds: locked, preferIdle: schlaefer, includeWish: mitWunsch }, 7),
    // runde erzwingt neue Zufallsvorschläge
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items.length, anlass, temp, locked.join(), schlaefer, mitWunsch, runde],
  );
  useEffect(() => setAktiv(0), [vorschlaege]);
  const s = vorschlaege[Math.min(aktiv, vorschlaege.length - 1)];

  if (schrank.length < 3) {
    return (
      <Empty
        title={<>Noch zu <em>wenig</em> im Schrank</>}
        text="Für Vorschläge braucht es mindestens ein Oberteil, eine Hose und Schuhe – oder ein Kleid."
        action={<Button variant="primary" icon={<Plus size={16} />} onClick={() => go("neu")}>Teil hinzufügen</Button>}
      />
    );
  }

  async function speichern(sug: Suggestion) {
    const o: Outfit = { id: newId(), name: autoName(sug.items, anlass), itemIds: sug.items.map((i) => i.id), createdAt: Date.now(), source: "generator", lookImage: null, layout: null, favorite: false };
    await db.outfits.add(o);
    toast("Outfit gespeichert", { label: "Ansehen", run: () => go(`outfit/${o.id}`) });
  }

  async function tragen(sug: Suggestion) {
    await logWear(isoDay(), sug.items.map((i) => i.id));
    toast("Viel Spaß – heute eingetragen");
  }

  return (
    <>
      <div className="context-bar">
        <button className="weather-chip" onClick={() => setOrtOffen(true)}>
          <CloudSun size={17} strokeWidth={1.6} />
          {wetter && ort ? (
            <span>
              <strong className="tabular">{wetter.temp}°</strong> {wetterText(wetter.code)} · {ort.name.split(",")[0]}
            </span>
          ) : (
            <span>Wetter einbeziehen</span>
          )}
        </button>
        <div className="context-chips scroll-x">
          <Chip on={anlass === null} onClick={() => setAnlass(null)} layoutGroup="anlass">Jeder Anlass</Chip>
          {OCCASIONS.map((o) => (
            <Chip key={o} on={anlass === o} onClick={() => setAnlass(o)} layoutGroup="anlass">
              {o}
            </Chip>
          ))}
        </div>
      </div>
      <div className="context-toggles">
        <button className={`flag ${schlaefer ? "is-on" : ""}`} onClick={() => setSchlaefer(!schlaefer)}>
          <span className="flag-box">{schlaefer && <Check size={12} strokeWidth={3} />}</span> Schrankhüter einbauen
        </button>
        <button className={`flag ${mitWunsch ? "is-on" : ""}`} onClick={() => setMitWunsch(!mitWunsch)}>
          <span className="flag-box">{mitWunsch && <Check size={12} strokeWidth={3} />}</span> Wunschliste einbeziehen
        </button>
        <AnimatePresence>
          {locked.map((id) => {
            const it = byId.get(id);
            if (!it) return null;
            return (
              <m.button key={id} className="lock-pill" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} onClick={() => setLocked(locked.filter((x) => x !== id))}>
                <span className="lock-thumb"><GarmentImage item={it} /></span>
                Mit {displayName(it)} <X size={12} />
              </m.button>
            );
          })}
        </AnimatePresence>
      </div>

      {!s ? (
        <Empty title="Keine passende Kombination" text="Lockere die Auswahl – anderer Anlass, weniger festgehaltene Teile oder Wunschliste einbeziehen." />
      ) : (
        <>
          <section className="stage">
            <div className="stage-board">
              <Collage items={s.items} animateKey={s.key} />
              <div className="stage-score">
                <span className="score-ring" style={{ ["--p" as string]: `${Math.round(s.harmony.score * 100)}` }}>
                  <span className="tabular">{Math.round(s.harmony.score * 100)}</span>
                </span>
                <span>{s.harmony.label}</span>
              </div>
            </div>
            <div className="stage-side">
              <div className="eyebrow">Vorschlag {aktiv + 1} von {vorschlaege.length}</div>
              <h2 className="display stage-title">{autoName(s.items, anlass)}</h2>
              <ul className="piece-list">
                <AnimatePresence mode="popLayout" initial={false}>
                  {s.items.map((it, n) => {
                    const isLocked = locked.includes(it.id);
                    const st = idx.get(it.id);
                    return (
                      <m.li key={it.id} layout initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ delay: n * 0.04 }}>
                        <a href={`#/teil/${it.id}`} className="piece">
                          <span className="piece-thumb"><GarmentImage item={it} /></span>
                          <span className="piece-text">
                            <strong>{displayName(it)}</strong>
                            <span>{it.status === "wish" ? "Wunschliste" : st ? `zuletzt ${relativeDay(st.last)}` : "noch nie getragen"}</span>
                          </span>
                        </a>
                        <button
                          className={`icon-btn piece-lock ${isLocked ? "is-on" : ""}`}
                          aria-label={isLocked ? "Nicht mehr festhalten" : "Dieses Teil festhalten"}
                          title={isLocked ? "Festgehalten" : "Festhalten und Rest neu mischen"}
                          onClick={() => setLocked(isLocked ? locked.filter((x) => x !== it.id) : [...locked, it.id])}
                        >
                          {isLocked ? <Lock size={16} /> : <LockOpen size={16} />}
                        </button>
                      </m.li>
                    );
                  })}
                </AnimatePresence>
              </ul>
              <div className="stage-actions">
                <Button variant="primary" size="l" icon={<Shuffle size={18} />} onClick={() => (aktiv < vorschlaege.length - 1 ? setAktiv(aktiv + 1) : setRunde(runde + 1))}>
                  Nächster Vorschlag
                </Button>
                <div className="row-gap">
                  <Button icon={<Heart size={16} />} onClick={() => speichern(s)}>Speichern</Button>
                  <Button icon={<Check size={16} />} onClick={() => tragen(s)} disabled={s.items.some((i) => i.status === "wish")}>Heute tragen</Button>
                  <Button icon={<PersonStanding size={16} />} onClick={() => go(`umkleide?ids=${s.items.map((i) => i.id).join(",")}`)}>Anprobieren</Button>
                  <Button icon={<Share2 size={16} />} onClick={async () => toast((await teileOutfit(s.items, autoName(s.items, anlass), s.harmony.label)) === "geteilt" ? "Geteilt" : "Story-Bild gespeichert")}>Teilen</Button>
                </div>
              </div>
            </div>
          </section>

          <div className="section-head more-head">
            <h2 className="section-title">Weitere Ideen</h2>
            <div className="row-gap">
              <Button size="s" variant="ghost" icon={<Plus size={14} />} onClick={() => setBauen(true)}>Selbst zusammenstellen</Button>
              <Button size="s" icon={<Shuffle size={14} />} onClick={() => setRunde(runde + 1)}>Neu mischen</Button>
            </div>
          </div>
          <div className="idea-grid">
            {vorschlaege.map((v, n) => (
              <m.button
                key={v.key + runde}
                className={`idea ${n === aktiv ? "is-on" : ""}`}
                onClick={() => {
                  setAktiv(n);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: n * 0.05, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              >
                <Collage items={v.items} compact />
                <span className="idea-label">{v.harmony.label}</span>
              </m.button>
            ))}
          </div>
        </>
      )}
      <OrtSheet open={ortOffen} onClose={() => setOrtOffen(false)} />
      <BauSheet open={bauen} onClose={() => setBauen(false)} />
    </>
  );
}

function autoName(items: Item[], anlass: Occasion | null): string {
  const akzent = items.find((i) => i.colors[0] && !["Schwarz", "Weiß", "Grau", "Navy", "Beige", "Denim", "Anthrazit", "Hellgrau", "Creme"].includes(i.colors[0].name));
  const basis = anlass ?? (currentSeason() === "Winter" ? "Winter" : currentSeason());
  return akzent ? `${basis} in ${akzent.colors[0].name}` : `${basis}, ruhig`;
}

/* ───────── Selbst zusammenstellen ───────── */

function BauSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { schrank } = useGarderobe();
  const toast = useToast();
  const [wahl, setWahl] = useState<string[]>([]);
  const [name, setName] = useState("");
  const gewaehlt = ordne(schrank.filter((i) => wahl.includes(i.id)));
  const h = harmony(gewaehlt);
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Outfit zusammenstellen"
      wide
      footer={
        <div className="row-gap spread">
          <span className="muted">{wahl.length ? `${wahl.length} Teile · ${h.label}` : "Tippe Teile an"}</span>
          <Button
            variant="primary"
            disabled={wahl.length < 2}
            onClick={async () => {
              await db.outfits.add({ id: newId(), name: name.trim() || "Mein Outfit", itemIds: gewaehlt.map((i) => i.id), createdAt: Date.now(), source: "manual", lookImage: null, layout: null, favorite: false });
              toast("Outfit gespeichert");
              setWahl([]);
              setName("");
              onClose();
            }}
          >
            Speichern
          </Button>
        </div>
      }
    >
      <div className="build">
        <div className="build-preview">
          {gewaehlt.length ? <Collage items={gewaehlt} compact /> : <div className="build-empty">Deine Auswahl erscheint hier</div>}
          <input className="input" placeholder="Name, z. B. Hochzeit Anna" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="build-list">
          {CATEGORIES.map((c) => {
            const liste = schrank.filter((i) => i.category === c.key);
            if (!liste.length) return null;
            return (
              <section key={c.key}>
                <h3 className="eyebrow">{c.label}</h3>
                <div className="build-row scroll-x">
                  {liste.map((i) => {
                    const on = wahl.includes(i.id);
                    return (
                      <button key={i.id} className={`build-item ${on ? "is-on" : ""}`} onClick={() => setWahl(on ? wahl.filter((x) => x !== i.id) : [...wahl, i.id])} aria-pressed={on}>
                        <GarmentImage item={i} />
                        {on && <span className="build-check"><Check size={12} strokeWidth={3} /></span>}
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </Sheet>
  );
}

/* ───────── Gespeichert ───────── */

function Gespeichert() {
  const { outfits, byId, wears } = useGarderobe();
  const zuletzt = useMemo(() => {
    const m = new Map<string, string>();
    for (const w of wears) if (w.outfitId && (!m.get(w.outfitId) || w.date > m.get(w.outfitId)!)) m.set(w.outfitId, w.date);
    return m;
  }, [wears]);
  if (!outfits.length) {
    return <Empty title={<>Noch keine <em>Lieblings</em>looks</>} text="Speichere Vorschläge, stell selbst zusammen oder erstelle Looks in der Umkleide." />;
  }
  return (
    <div className="outfit-grid">
      {outfits.map((o, n) => {
        const teile = o.itemIds.map((id) => byId.get(id)).filter(Boolean) as Item[];
        return (
          <m.a
            key={o.id}
            href={`#/outfit/${o.id}`}
            className="outfit-card"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(n, 10) * 0.04, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <m.div layoutId={`outfit-${o.id}`} className="outfit-tile">
              {o.lookImage ? <LookBild id={o.lookImage} /> : <Collage items={ordne(teile)} compact />}
              {o.favorite && <span className="outfit-fav"><Heart size={14} fill="currentColor" /></span>}
            </m.div>
            <div className="outfit-info">
              <strong>{o.name}</strong>
              <span>{teile.length} Teile{zuletzt.get(o.id) ? ` · getragen ${formatDayShort(zuletzt.get(o.id)!)}` : ""}</span>
            </div>
          </m.a>
        );
      })}
    </div>
  );
}

function LookBild({ id }: { id: string }) {
  const url = useImageUrl(id);
  return url ? <img src={url} alt="Look aus der Umkleide" className="look-img" /> : null;
}

export function OutfitDetail({ id }: { id: string }) {
  const { outfits, byId, bereit } = useGarderobe();
  const toast = useToast();
  const o = outfits.find((x) => x.id === id);
  const [name, setName] = useState(o?.name ?? "");
  useEffect(() => setName(o?.name ?? ""), [o?.name]);
  if (!o) return <Overlay><div className="wrap detail-missing">{bereit ? "Outfit nicht gefunden." : ""}</div></Overlay>;
  const teile = ordne(o.itemIds.map((i) => byId.get(i)).filter(Boolean) as Item[]);
  const h = harmony(teile);

  return (
    <Overlay
      actions={
        <>
          <button className={`icon-btn ${o.favorite ? "is-fav" : ""}`} aria-label="Favorit" onClick={() => db.outfits.update(o.id, { favorite: !o.favorite })}>
            <Heart size={19} fill={o.favorite ? "currentColor" : "none"} />
          </button>
          <button
            className="icon-btn"
            aria-label="Outfit löschen"
            onClick={async () => {
              back();
              await deleteOutfit(o);
              toast("Outfit gelöscht", { label: "Rückgängig", run: () => db.outfits.add(o) });
            }}
          >
            <Trash2 size={18} />
          </button>
        </>
      }
    >
      <div className="detail wrap">
        <div className="detail-media">
          <m.div layoutId={`outfit-${o.id}`} className="outfit-hero">
            {o.lookImage ? <LookBild id={o.lookImage} /> : <Collage items={teile} />}
          </m.div>
        </div>
        <div className="detail-info">
          <div className="eyebrow">{o.source === "umkleide" ? "Look aus der Umkleide" : o.source === "generator" ? "Vorschlag" : "Selbst zusammengestellt"} · {h.label}</div>
          <input className="display detail-title title-input" value={name} onChange={(e) => setName(e.target.value)} onBlur={() => name.trim() && db.outfits.update(o.id, { name: name.trim() })} aria-label="Name des Outfits" />
          <div className="detail-actions">
            <Button
              variant="primary"
              size="l"
              icon={<Check size={18} />}
              disabled={teile.some((t) => t.status === "wish")}
              onClick={async () => {
                await logWear(isoDay(), teile.map((t) => t.id), o.id);
                toast("Heute getragen – eingetragen");
              }}
            >
              Heute tragen
            </Button>
            <Button size="l" icon={<PersonStanding size={18} />} onClick={() => go(`umkleide?outfit=${o.id}`)}>
              In der Umkleide
            </Button>
            <Button size="l" icon={<Sparkles size={18} />} onClick={() => go(`outfits?lock=${teile[0]?.id ?? ""}`)}>
              Variieren
            </Button>
            <Button size="l" icon={<Share2 size={18} />} onClick={async () => toast((await teileOutfit(teile, o.name, h.label)) === "geteilt" ? "Geteilt" : "Story-Bild gespeichert")}>
              Teilen
            </Button>
          </div>
          <section className="detail-section">
            <h2 className="section-title">Teile</h2>
            <ul className="piece-list">
              {teile.map((it) => (
                <li key={it.id}>
                  <a href={`#/teil/${it.id}`} className="piece">
                    <span className="piece-thumb"><GarmentImage item={it} /></span>
                    <span className="piece-text">
                      <strong>{displayName(it)}</strong>
                      <span>{[it.brand, it.size && `Gr. ${it.size}`].filter(Boolean).join(" · ")}</span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </Overlay>
  );
}
