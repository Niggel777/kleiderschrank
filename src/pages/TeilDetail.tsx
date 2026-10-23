// Detailseite eines Teils: großes Bild, Kennzahlen, Tragehistorie, Kombinationen, Verkauf.
import { AnimatePresence, motion } from "framer-motion";
import { CalendarPlus, WashingMachine, Check, Heart, Pencil, PersonStanding, ShoppingBag, Sparkles, Tag, Trash2, Wand2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { GarmentImage, ProductCard } from "../components/Garment";
import { Overlay } from "../components/Overlay";
import { Sheet } from "../components/Sheet";
import { useToast } from "../components/Toast";
import { VerkaufSheet } from "../components/VerkaufSheet";
import { WearStrip } from "../components/WearStrip";
import { Button, Segmented, Swatch } from "../components/ui";
import { db, deleteItem, logWear, putImage, saveItem, unlogWear } from "../lib/db";
import { formatDay, formatDayShort, isoDay, relativeDay } from "../lib/dates";
import { hintergrundEntfernen } from "../lib/freistellen";
import { colorsOf, makeThumb, trimTransparent } from "../lib/image";
import { CATEGORY, STATUS_LABEL, displayName, type Item } from "../lib/model";
import { passendZu } from "../lib/outfits";
import { back, go } from "../lib/router";
import { idleDays, kombiPartner, statOf } from "../lib/stats";
import { forgetImage, useGarderobe, useImageUrl } from "../lib/store";

export function TeilDetail({ id }: { id: string }) {
  const { byId, bereit } = useGarderobe();
  const item = byId.get(id);
  if (!item) {
    return (
      <Overlay>
        <div className="wrap detail-missing">{bereit ? "Dieses Teil gibt es nicht mehr." : ""}</div>
      </Overlay>
    );
  }
  return <Detail item={item} />;
}

function Detail({ item }: { item: Item }) {
  const { items, idx } = useGarderobe();
  const toast = useToast();
  const stat = statOf(idx, item.id);
  const idle = idleDays(item, stat);
  const { wears } = useGarderobe();
  const kombis = useMemo(() => kombiPartner(wears).get(item.id)?.size ?? 0, [wears, item.id]);
  const [ansicht, setAnsicht] = useState<"cut" | "orig">("cut");
  const [verkauf, setVerkauf] = useState(false);
  const [loeschen, setLoeschen] = useState(false);
  const [datumOffen, setDatumOffen] = useState(false);
  const [freistellen, setFreistellen] = useState<number | null>(null);
  const heute = stat.last === isoDay();
  const passend = useMemo(() => passendZu(item, items, 8), [item, items]);
  const zeigeOriginal = ansicht === "orig" && item.imageOriginal && item.imageCutout;

  async function getragen(tag = isoDay()) {
    await logWear(tag, [item.id]);
    toast(tag === isoDay() ? "Heute getragen – eingetragen" : `Für ${formatDayShort(tag)} eingetragen`, {
      label: "Rückgängig",
      run: () => unlogWear(tag, item.id),
    });
  }

  async function nachtraeglichFreistellen() {
    if (!item.imageOriginal) return;
    const orig = await db.images.get(item.imageOriginal);
    if (!orig) return;
    setFreistellen(0);
    try {
      const roh = await hintergrundEntfernen(orig.blob, (f) => setFreistellen(f.phase === "modell" ? f.anteil * 0.6 : 0.6 + f.anteil * 0.4));
      const cut = await trimTransparent(roh);
      const thumb = await makeThumb(cut.blob);
      const farben = await colorsOf(cut.blob);
      const alteThumb = item.imageThumb;
      await saveItem({
        ...item,
        imageCutout: await putImage(cut.blob, "cutout"),
        imageThumb: await putImage(thumb, "thumb"),
        aspect: cut.width / cut.height,
        colors: farben.length ? farben : item.colors,
      });
      if (alteThumb) {
        await db.images.delete(alteThumb);
        forgetImage(alteThumb);
      }
      toast("Hintergrund entfernt");
    } catch {
      toast("Freistellen hat nicht geklappt");
    } finally {
      setFreistellen(null);
    }
  }

  return (
    <Overlay
      actions={
        <>
          <button className={`icon-btn ${item.favorite ? "is-fav" : ""}`} aria-label="Favorit" onClick={() => db.items.update(item.id, { favorite: !item.favorite })}>
            <motion.span key={String(item.favorite)} initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 15 }} style={{ display: "grid" }}>
              <Heart size={19} fill={item.favorite ? "currentColor" : "none"} />
            </motion.span>
          </button>
          <a className="icon-btn" href={`#/bearbeiten/${item.id}`} aria-label="Bearbeiten">
            <Pencil size={18} />
          </a>
          <button className="icon-btn" aria-label="Löschen" onClick={() => setLoeschen(true)}>
            <Trash2 size={18} />
          </button>
        </>
      }
    >
      <div className="detail wrap">
        <div className="detail-media">
          <motion.div layoutId={`media-${item.id}`} className="tile detail-tile" transition={{ type: "spring", stiffness: 260, damping: 32 }}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={zeigeOriginal ? "o" : "c"} className="detail-img" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                {zeigeOriginal ? <OriginalBild id={item.imageOriginal!} /> : <GarmentImage item={item} large />}
              </motion.div>
            </AnimatePresence>
            {freistellen !== null && (
              <div className="scan">
                <motion.span className="scan-line" animate={{ top: ["0%", "100%", "0%"] }} transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }} />
                <span className="scan-label">Freistellen … {Math.round(freistellen * 100)} %</span>
              </div>
            )}
          </motion.div>
          <div className="detail-media-bar">
            {item.imageOriginal && item.imageCutout ? (
              <Segmented id="bild" value={ansicht} onChange={setAnsicht} options={[{ value: "cut", label: "Freigestellt" }, { value: "orig", label: "Original" }]} />
            ) : item.imageOriginal && !item.imageCutout ? (
              <Button size="s" icon={<Wand2 size={14} />} onClick={nachtraeglichFreistellen} disabled={freistellen !== null}>
                Hintergrund entfernen
              </Button>
            ) : (
              <span />
            )}
          </div>
        </div>

        <motion.div className="detail-info" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}>
          <div className="eyebrow">
            {item.brand || "Ohne Marke"} · {item.sub || CATEGORY[item.category].singular}
          </div>
          <h1 className="display detail-title">{displayName(item)}</h1>
          <div className="detail-meta">
            {item.size && <span>{item.size === "One Size" ? "One Size" : `Größe ${item.size}`}</span>}
            {item.purchaseDate && <span>gekauft {formatDay(item.purchaseDate)}</span>}
            {item.status !== "owned" && <span className={`status status-${item.status}`}>{STATUS_LABEL[item.status]}</span>}
          </div>
          {item.colors.length > 0 && (
            <div className="detail-colors">
              {item.colors.map((c) => (
                <a key={c.name} className="color-tag" href={`#/schrank?farbe=${encodeURIComponent(c.name)}`}>
                  <Swatch name={c.name} size={14} ring /> {c.name}
                </a>
              ))}
            </div>
          )}

          {item.status === "wish" ? (
            <WunschBox item={item} passend={passend.length} />
          ) : (
            <>
              <div className="kpis">
                <div className="kpi">
                  <span className="kpi-v tabular">{stat.count}×</span>
                  <span className="kpi-l">getragen</span>
                </div>
                <div className="kpi">
                  <span className="kpi-v">{stat.last ? relativeDay(stat.last).replace("vor ", "") : "–"}</span>
                  <span className="kpi-l">{stat.last ? (stat.last === isoDay() ? "zuletzt" : "zuletzt, vor") : "noch nie getragen"}</span>
                </div>
                <div className="kpi">
                  <span className="kpi-v tabular">{kombis}</span>
                  <span className="kpi-l">{kombis === 1 ? "Kombipartner" : "Kombipartner"}</span>
                </div>
              </div>

              {item.status !== "sold" && (
                <div className="detail-actions">
                  <Button variant="primary" size="l" icon={<Check size={18} />} onClick={() => getragen()} disabled={heute}>
                    {heute ? "Heute getragen" : "Heute getragen"}
                  </Button>
                  <Button size="l" icon={<CalendarPlus size={18} />} onClick={() => setDatumOffen(true)} aria-label="An anderem Tag getragen" />
                  <Button size="l" icon={<Sparkles size={18} />} onClick={() => go(`outfits?lock=${item.id}`)}>
                    Outfits damit
                  </Button>
                  <Button size="l" icon={<PersonStanding size={18} />} onClick={() => go(`umkleide?ids=${item.id}`)}>
                    Anprobieren
                  </Button>
                  <Button
                    size="l"
                    variant={item.inWaesche ? "primary" : "secondary"}
                    icon={<WashingMachine size={18} />}
                    onClick={async () => {
                      await db.items.update(item.id, { inWaesche: !item.inWaesche });
                      toast(item.inWaesche ? "Wieder im Schrank" : "In der Wäsche – wird nicht vorgeschlagen");
                    }}
                  >
                    {item.inWaesche ? "Aus der Wäsche" : "In die Wäsche"}
                  </Button>
                </div>
              )}

              {item.status === "owned" && idle >= 60 && (
                <motion.div className="nudge" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.25 }}>
                  <div>
                    <strong>{stat.count ? `Seit ${Math.floor(idle / 30)} Monaten nicht getragen.` : `Seit ${Math.floor(idle / 30)} Monaten im Schrank – noch nie getragen.`}</strong>
                    <span>Gib ihm eine Chance in einem neuen Outfit – oder mach jemand anderem eine Freude.</span>
                  </div>
                  <div className="row-gap">
                    <Button size="s" icon={<Sparkles size={14} />} onClick={() => go(`outfits?lock=${item.id}`)}>
                      Outfit finden
                    </Button>
                    <Button size="s" icon={<Tag size={14} />} onClick={() => setVerkauf(true)}>
                      Verkaufen
                    </Button>
                  </div>
                </motion.div>
              )}

              {item.status === "selling" && (
                <div className="nudge nudge-rust">
                  <div>
                    <strong>Steht zum Verkauf.</strong>
                    <span>Schon verkauft? Dann markier es als verkauft.</span>
                  </div>
                  <Button size="s" icon={<Tag size={14} />} onClick={() => setVerkauf(true)}>
                    Verkauf verwalten
                  </Button>
                </div>
              )}
              {item.status === "sold" && (
                <div className="nudge">
                  <div>
                    <strong>Verkauft{item.soldAt ? ` am ${formatDay(item.soldAt)}` : ""}.</strong>
                    <span>Bleibt in deiner Statistik erhalten.</span>
                  </div>
                  <Button size="s" variant="ghost" onClick={() => saveItem({ ...item, status: "owned", soldAt: null, soldPrice: null })}>
                    Zurück in den Schrank
                  </Button>
                </div>
              )}
            </>
          )}

          {passend.length > 0 && item.status !== "sold" && (
            <section className="detail-section">
              <div className="section-head">
                <h2 className="section-title">Passt gut zu</h2>
                <a className="link" href={`#/outfits?lock=${item.id}`}>
                  Outfits ansehen
                </a>
              </div>
              <div className="rail scroll-x">
                {passend.map((p, n) => (
                  <div className="rail-item" key={p.id}>
                    <ProductCard item={p} stat={statOf(idx, p.id)} index={n} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {item.status !== "wish" && (
            <section className="detail-section">
              <div className="section-head">
                <h2 className="section-title">Tragehistorie</h2>
                <span className="muted tabular">{stat.count} Tage</span>
              </div>
              <WearStrip dates={stat.dates} />
              {stat.dates.length > 0 && (
                <div className="wear-list">
                  {stat.dates.slice(0, 8).map((d) => (
                    <span key={d} className="wear-date">
                      {formatDayShort(d)}
                      <button aria-label={`${formatDayShort(d)} entfernen`} onClick={() => unlogWear(d, item.id)}>
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                  {stat.dates.length > 8 && <span className="muted">+ {stat.dates.length - 8} weitere</span>}
                </div>
              )}
            </section>
          )}

          <section className="detail-section">
            <h2 className="section-title">Details</h2>
            <dl className="facts">
              <Fakt k="Kategorie" v={`${CATEGORY[item.category].label}${item.sub ? ` · ${item.sub}` : ""}`} />
              <Fakt k="Material" v={item.material} />
              <Fakt k="Saison" v={item.seasons.length ? item.seasons.join(", ") : "Ganzjährig"} />
              <Fakt k="Anlass" v={item.occasions.join(", ")} />
              <Fakt k="Muster" v={item.pattern ? "Gemustert" : "Uni"} />
              <Fakt k="Zustand" v={item.condition} />
              <Fakt k="Im Schrank seit" v={formatDay(isoDay(new Date(item.createdAt)))} />
              <Fakt k="Notizen" v={item.notes} />
              {item.shopUrl && (
                <div className="fact">
                  <dt>Shop</dt>
                  <dd>
                    <a className="link" href={item.shopUrl} target="_blank" rel="noreferrer">
                      Zum Produkt
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          </section>

          {item.status === "owned" && (
            <section className="detail-section sell-teaser">
              <div>
                <h2 className="section-title">Verkaufen</h2>
                <p className="muted">Foto auf hellem Grund und fertiger Anzeigentext für Vinted.</p>
              </div>
              <Button icon={<Tag size={16} />} onClick={() => setVerkauf(true)}>
                Verkauf vorbereiten
              </Button>
            </section>
          )}
        </motion.div>
      </div>

      <VerkaufSheet item={item} open={verkauf} onClose={() => setVerkauf(false)} />
      <DatumSheet open={datumOffen} onClose={() => setDatumOffen(false)} onPick={(d) => { setDatumOffen(false); getragen(d); }} />
      <Sheet
        open={loeschen}
        onClose={() => setLoeschen(false)}
        title="Teil löschen?"
        footer={
          <div className="row-gap spread">
            <Button variant="ghost" onClick={() => setLoeschen(false)}>
              Abbrechen
            </Button>
            <Button
              variant="danger"
              icon={<Trash2 size={16} />}
              onClick={async () => {
                setLoeschen(false);
                back();
                await deleteItem(item);
                [item.imageCutout, item.imageOriginal, item.imageThumb].forEach(forgetImage);
                toast(`${displayName(item)} gelöscht`);
              }}
            >
              Endgültig löschen
            </Button>
          </div>
        }
      >
        <p className="muted">
          „{displayName(item)}“ wird mit Fotos und Tragehistorie gelöscht. Verkauft? Dann markiere es lieber als verkauft – so bleibt deine Statistik vollständig.
        </p>
      </Sheet>
    </Overlay>
  );
}

function Fakt({ k, v }: { k: string; v: string }) {
  if (!v) return null;
  return (
    <div className="fact">
      <dt>{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}

function OriginalBild({ id }: { id: string }) {
  const url = useImageUrl(id);
  return url ? <img src={url} alt="Originalfoto" className="detail-original" /> : null;
}

function WunschBox({ item, passend }: { item: Item; passend: number }) {
  const toast = useToast();
  return (
    <div className="wish-box">
      <div className="wish-box-text">
        <strong>Auf deiner Wunschliste.</strong>
        <span>
          Passt farblich zu {passend} Teilen in deinem Schrank. Probier es in Outfits oder in der Umkleide, bevor du es kaufst.
        </span>
      </div>
      <div className="detail-actions">
        <Button variant="primary" size="l" icon={<Sparkles size={18} />} onClick={() => go(`outfits?lock=${item.id}&wunsch=1`)}>
          Outfits damit
        </Button>
        <Button size="l" icon={<PersonStanding size={18} />} onClick={() => go(`umkleide?ids=${item.id}`)}>
          Anprobieren
        </Button>
        <Button
          size="l"
          icon={<ShoppingBag size={18} />}
          onClick={async () => {
            await saveItem({ ...item, status: "owned", purchaseDate: isoDay(), createdAt: Date.now() });
            toast("Gekauft – willkommen im Schrank!");
          }}
        >
          Gekauft
        </Button>
        {item.shopUrl && (
          <a className="btn btn-ghost btn-l" href={item.shopUrl} target="_blank" rel="noreferrer">
            Zum Shop
          </a>
        )}
      </div>
    </div>
  );
}

function DatumSheet({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (d: string) => void }) {
  const [tag, setTag] = useState(isoDay());
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Wann getragen?"
      footer={
        <Button variant="primary" block onClick={() => onPick(tag)}>
          Eintragen
        </Button>
      }
    >
      <div className="date-quick">
        {[0, 1, 2, 3, 4, 5, 6].map((n) => {
          const d = new Date();
          d.setDate(d.getDate() - n);
          const s = isoDay(d);
          return (
            <button key={s} className={`date-pill ${tag === s ? "is-on" : ""}`} onClick={() => setTag(s)}>
              <span>{n === 0 ? "Heute" : n === 1 ? "Gestern" : new Intl.DateTimeFormat("de-DE", { weekday: "short" }).format(d)}</span>
              <strong>{d.getDate()}.</strong>
            </button>
          );
        })}
      </div>
      <label className="field">
        <span className="field-label">Oder Datum wählen</span>
        <input type="date" value={tag} max={isoDay()} onChange={(e) => e.target.value && setTag(e.target.value)} />
      </label>
    </Sheet>
  );
}
