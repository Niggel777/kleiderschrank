// Teil anlegen oder bearbeiten: Foto → Freistellen → Farben erkennen → Details.
import { AnimatePresence, m } from "framer-motion";
import { Link2, Camera, Check, ChevronDown, ImagePlus, Plus, RefreshCw, RotateCcw, RotateCw, SlidersHorizontal, Sparkles, Wand2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Overlay } from "../components/Overlay";
import { useToast } from "../components/Toast";
import { Button, Chip, Field, Segmented, Swatch, Toggle } from "../components/ui";
import { PALETTE, PALETTE_BY_NAME } from "../lib/colors";
import { db, putImage, saveItem, bild } from "../lib/db";
import { isoDay } from "../lib/dates";
import { verarbeite, type Fortschritt, type VerarbeitetesFoto } from "../lib/freistellen";
import { STANDARD, bearbeite, type Bearbeitung } from "../lib/bearbeiten";
import { colorsOf, makeThumb } from "../lib/image";
import { CATEGORIES, CATEGORY, CONDITIONS, OCCASIONS, SEASONS, SIZES, displayName, emptyItem, type Item } from "../lib/model";
import { back, go } from "../lib/router";
import { forgetImage, useGarderobe, useImageUrl } from "../lib/store";
import { useSync } from "../lib/syncStatus";

type Schritt = "foto" | "arbeit" | "form";

export function TeilNeu({ q, editId }: { q: URLSearchParams; editId?: string }) {
  const { byId, items, bereit } = useGarderobe();
  const toast = useToast();
  const vorhanden = editId ? byId.get(editId) : undefined;
  const [schritt, setSchritt] = useState<Schritt>(editId ? "form" : "foto");
  const [item, setItem] = useState<Item>(() => vorhanden ?? emptyItem({ status: q.get("status") === "wish" ? "wish" : "owned", category: (q.get("kat") as Item["category"]) ?? "oberteile" }));
  const [freistellen, setFreistellen] = useState(true);
  const [fortschritt, setFortschritt] = useState<Fortschritt | null>(null);
  const [vorschau, setVorschau] = useState<string | null>(null);
  const [ergebnis, setErgebnis] = useState<VerarbeitetesFoto | null>(null);
  // unbearbeitete Ausgangsbilder + Bearbeitung (drehen, verbessern)
  const [basis, setBasis] = useState<VerarbeitetesFoto | null>(null);
  const [bearb, setBearb] = useState<Bearbeitung>(STANDARD);
  const [regler, setRegler] = useState(false);
  const [farbenManuell, setFarbenManuell] = useState(false);
  const [rechnet, setRechnet] = useState(false);

  // Bearbeitung anwenden (kurz verzögert, damit Regler flüssig bleiben)
  useEffect(() => {
    if (!basis) return;
    let aktiv = true;
    setRechnet(true);
    const t = setTimeout(async () => {
      const orig = await bearbeite(basis.original, bearb);
      const cut = basis.freigestellt ? await bearbeite(basis.freigestellt, bearb) : null;
      const anzeige = cut ?? orig;
      const [thumb, farben] = await Promise.all([makeThumb(anzeige.blob), colorsOf(anzeige.blob)]);
      if (!aktiv) return;
      setErgebnis({ ...basis, original: orig.blob, freigestellt: cut?.blob ?? null, thumb, farben, aspect: anzeige.width / anzeige.height });
      setItem((i) => ({ ...i, aspect: anzeige.width / anzeige.height, ...(farbenManuell ? {} : { colors: farben }) }));
      setRechnet(false);
    }, 140);
    return () => {
      aktiv = false;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basis, bearb]);

  async function bildBearbeiten() {
    // Beim Bearbeiten eines gespeicherten Teils die Bilder aus der Datenbank laden
    const [o, c] = await Promise.all([item.imageOriginal ? bild(item.imageOriginal) : undefined, item.imageCutout ? bild(item.imageCutout) : undefined]);
    const original = o?.blob ?? c?.blob;
    if (!original) return;
    setFarbenManuell(true);
    setBearb({ ...STANDARD, auto: false });
    setBasis({ original, freigestellt: c?.blob ?? null, thumb: original, farben: item.colors, aspect: item.aspect, fehler: null });
  }
  const [zeigeOriginal, setZeigeOriginal] = useState(false);
  const [speichert, setSpeichert] = useState(false);
  const [farbwahl, setFarbwahl] = useState(false);
  const kamera = useRef<HTMLInputElement>(null);
  const galerie = useRef<HTMLInputElement>(null);

  // Beim Bearbeiten: Daten nachladen, sobald die Datenbank bereit ist
  useEffect(() => {
    if (editId && vorhanden && item.id !== vorhanden.id) setItem(vorhanden);
  }, [editId, vorhanden, item.id]);

  // Vorschau-URLs aufräumen
  useEffect(() => () => { if (vorschau) URL.revokeObjectURL(vorschau); }, [vorschau]);

  // Einfügen aus der Zwischenablage (z. B. Screenshot aus einem Shop)
  useEffect(() => {
    if (schritt !== "foto") return;
    const onPaste = (e: ClipboardEvent) => {
      const f = [...(e.clipboardData?.files ?? [])].find((x) => x.type.startsWith("image/"));
      if (f) starte(f);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  });

  const cutUrl = useMemo(() => (ergebnis?.freigestellt ? URL.createObjectURL(ergebnis.freigestellt) : null), [ergebnis]);
  const marken = useMemo(() => [...new Set(items.map((i) => i.brand).filter(Boolean))].sort(), [items]);

  async function starte(datei: File | Blob) {
    setVorschau(URL.createObjectURL(datei));
    setErgebnis(null);
    setBasis(null);
    // Sofort ins Formular – Freistellen läuft im Hintergrund weiter
    setSchritt("form");
    setFortschritt({ phase: "vorbereiten", anteil: 0 });
    const r = await verarbeite(datei, freistellen, setFortschritt);
    setFarbenManuell(false);
    setBearb(STANDARD);
    setBasis(r);
    setErgebnis(r);
    setItem((i) => ({ ...i, colors: r.farben, aspect: r.aspect }));
    setFortschritt(null);
    if (r.fehler) toast(r.fehler);
  }
  const arbeitet = fortschritt !== null && fortschritt.phase !== "fertig" && !ergebnis;

  async function speichern(weiter = false) {
    setSpeichert(true);
    let neu = { ...item };
    if (ergebnis) {
      const alte = [item.imageOriginal, item.imageCutout, item.imageThumb];
      neu = {
        ...neu,
        imageOriginal: await putImage(ergebnis.original, "original"),
        imageCutout: ergebnis.freigestellt ? await putImage(ergebnis.freigestellt, "cutout") : null,
        imageThumb: await putImage(ergebnis.thumb, "thumb"),
        aspect: ergebnis.aspect,
      };
      // Beim Ersetzen alte Bilder entfernen
      const weg = alte.filter(Boolean) as string[];
      if (weg.length) {
        await db.images.bulkDelete(weg);
        weg.forEach(forgetImage);
      }
    }
    if (neu.status === "owned" && !neu.purchaseDate && !editId) neu.purchaseDate = isoDay();
    await saveItem(neu);
    setSpeichert(false);
    if (weiter) {
      toast(`${displayName(neu)} gespeichert`);
      setItem(emptyItem({ status: item.status, category: item.category }));
      setErgebnis(null);
      setVorschau(null);
      setSchritt("foto");
      return;
    }
    toast(editId ? "Änderungen gespeichert" : `${displayName(neu)} ist im Schrank`);
    if (editId) back();
    else go(`teil/${neu.id}`, true);
  }

  const kategorie = CATEGORY[item.category];
  // nur das gängigste Größensystem der Kategorie anbieten – andere per Eingabe
  const groessen = SIZES[kategorie.sizes[0]];
  const set = (p: Partial<Item>) => setItem((i) => ({ ...i, ...p }));
  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  if (editId && !vorhanden) return <Overlay title="Bearbeiten"><div className="wrap detail-missing">{bereit ? "Teil nicht gefunden." : ""}</div></Overlay>;

  return (
    <Overlay title={editId ? "Bearbeiten" : item.status === "wish" ? "Neuer Wunsch" : "Neues Teil"} className="add-overlay">
      <input ref={kamera} type="file" accept="image/*" capture="environment" hidden onChange={(e) => e.target.files?.[0] && starte(e.target.files[0])} />
      <input ref={galerie} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && starte(e.target.files[0])} />

      <>
        {schritt === "foto" && (
          <m.div key="foto" className="wrap add-start" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
            <div className="add-intro">
              <h1 className="display add-title">
                {item.status === "wish" ? (
                  <>
                    Was hast du <em>im Auge?</em>
                  </>
                ) : (
                  <>
                    Leg es hin, <em>knips es.</em>
                  </>
                )}
              </h1>
              <p className="muted">
                {item.status === "wish"
                  ? "Fotografiere das Teil im Laden oder füge einen Screenshot aus dem Onlineshop ein (Strg + V). Danach siehst du, womit du es kombinieren kannst."
                  : "Am besten flach auf einem ruhigen Untergrund oder auf dem Bügel vor einer Wand. Der Hintergrund wird direkt auf deinem Gerät entfernt – kein Upload."}
              </p>
            </div>
            <LinkImport
              onBild={(blob, info) => {
                setItem((i) => ({ ...i, name: info.titel ?? i.name, brand: info.marke ?? i.brand, shopUrl: info.url, status: "wish" }));
                starte(blob);
              }}
            />
            <DropZone onFile={starte}>
              <div className="drop-inner">
                <m.div className="drop-icon" animate={{ y: [0, -5, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>
                  <Camera size={28} strokeWidth={1.5} />
                </m.div>
                <div className="drop-actions">
                  <Button variant="primary" size="l" icon={<Camera size={18} />} onClick={() => kamera.current?.click()}>
                    Foto aufnehmen
                  </Button>
                  <Button size="l" icon={<ImagePlus size={18} />} onClick={() => galerie.current?.click()}>
                    Aus Galerie
                  </Button>
                </div>
                <span className="drop-hint">oder Bild hierher ziehen · einfügen mit Strg + V</span>
              </div>
            </DropZone>
            <div className="add-options">
              <Toggle on={freistellen} onChange={setFreistellen} label={<span className="toggle-label"><Wand2 size={16} /> Hintergrund automatisch entfernen</span>} />
              <Segmented
                id="neu-status"
                value={item.status === "wish" ? "wish" : "owned"}
                onChange={(v) => set({ status: v })}
                options={[
                  { value: "owned", label: "Mein Schrank" },
                  { value: "wish", label: "Wunschliste" },
                ]}
              />
            </div>
          </m.div>
        )}

        {schritt === "arbeit" && vorschau && (
          <m.div key="arbeit" className="wrap add-work" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="work-stage">
              <m.img src={cutUrl ?? vorschau} alt="" className={`work-img ${ergebnis?.freigestellt ? "is-cut" : ""}`} layout />
              {!ergebnis && (
                <div className="scan">
                  <m.span className="scan-line" animate={{ top: ["2%", "98%", "2%"] }} transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }} />
                </div>
              )}
            </div>
            <div className="work-steps">
              {[
                { k: "vorbereiten", t: "Foto vorbereiten" },
                ...(freistellen ? [{ k: "modell", t: "Freistell-Modell laden", h: "nur beim ersten Mal, danach offline" }, { k: "freistellen", t: "Hintergrund entfernen" }] : []),
                { k: "fertig", t: "Farben erkennen" },
              ].map((s) => {
                const order = ["vorbereiten", "modell", "freistellen", "fertig"];
                const aktuell = order.indexOf(fortschritt?.phase ?? "vorbereiten");
                const hier = order.indexOf(s.k);
                const status = ergebnis || aktuell > hier ? "done" : aktuell === hier ? "now" : "todo";
                return (
                  <div key={s.k} className={`work-step is-${status}`}>
                    <span className="work-dot">{status === "done" ? <Check size={12} strokeWidth={3} /> : null}</span>
                    <div>
                      <span>{s.t}</span>
                      {"h" in s && status === "now" && <small>{s.h}</small>}
                      {status === "now" && fortschritt && fortschritt.anteil > 0 && fortschritt.anteil < 1 && (
                        <div className="work-bar"><m.span animate={{ width: `${Math.round(fortschritt.anteil * 100)}%` }} /></div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </m.div>
        )}

        {schritt === "form" && (
          <m.div key="form" className="wrap add-form" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}>
            <div className="add-preview">
              <div className="tile add-tile">
                <Vorschau item={item} ergebnis={ergebnis} original={zeigeOriginal} roh={arbeitet ? vorschau : null} />
                {arbeitet && (
                  <div className="scan">
                    <m.span className="scan-line" animate={{ top: ["2%", "98%", "2%"] }} transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }} />
                    <span className="scan-label">
                      {fortschritt?.phase === "modell" ? `Modell laden … ${Math.round((fortschritt.anteil ?? 0) * 100)} %` : fortschritt?.phase === "freistellen" ? "Hintergrund wird entfernt …" : "Foto wird vorbereitet …"}
                    </span>
                  </div>
                )}
              </div>
              <div className="row-gap add-preview-bar">
                {(ergebnis?.freigestellt || item.imageCutout) && (ergebnis?.original || item.imageOriginal) && (
                  <Segmented id="vorschau" value={zeigeOriginal ? "o" : "c"} onChange={(v) => setZeigeOriginal(v === "o")} options={[{ value: "c", label: "Freigestellt" }, { value: "o", label: "Original" }]} />
                )}
                <Button size="s" variant="ghost" icon={<RefreshCw size={14} />} onClick={() => galerie.current?.click()}>
                  Foto ersetzen
                </Button>
              </div>
              {basis ? (
                <div className="edit-bar">
                  <button className="icon-btn" aria-label="Nach links drehen" onClick={() => setBearb({ ...bearb, drehung: (bearb.drehung + 270) % 360 })}><RotateCcw size={18} /></button>
                  <button className="icon-btn" aria-label="Nach rechts drehen" onClick={() => setBearb({ ...bearb, drehung: (bearb.drehung + 90) % 360 })}><RotateCw size={18} /></button>
                  <button className={`edit-chip ${bearb.auto ? "is-on" : ""}`} onClick={() => setBearb({ ...bearb, auto: !bearb.auto })}>
                    <Sparkles size={14} /> Verbessern
                  </button>
                  <button className={`icon-btn ${regler ? "is-on" : ""}`} aria-label="Helligkeit und Wärme" onClick={() => setRegler(!regler)}><SlidersHorizontal size={18} /></button>
                  {rechnet && <span className="spinner small" />}
                </div>
              ) : (
                (item.imageOriginal || item.imageCutout) && (
                  <div className="edit-bar">
                    <Button size="s" icon={<Wand2 size={14} />} onClick={bildBearbeiten}>Bild drehen & bearbeiten</Button>
                  </div>
                )
              )}
              <AnimatePresence>
                {basis && regler && (
                  <m.div className="edit-sliders" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                    <label className="fit-slider"><span>Helligkeit</span><input type="range" min={-1} max={1} step={0.05} value={bearb.helligkeit} onChange={(e) => setBearb({ ...bearb, helligkeit: +e.target.value })} /></label>
                    <label className="fit-slider"><span>Wärme</span><input type="range" min={-1} max={1} step={0.05} value={bearb.waerme} onChange={(e) => setBearb({ ...bearb, waerme: +e.target.value })} /></label>
                  </m.div>
                )}
              </AnimatePresence>
            </div>

            <div className="add-fields">
              <Segmented
                id="form-status"
                value={item.status === "wish" ? "wish" : "owned"}
                onChange={(v) => set({ status: v })}
                options={[
                  { value: "owned", label: "Mein Schrank" },
                  { value: "wish", label: "Wunschliste" },
                ]}
              />

              <section className="form-block">
                <h3 className="eyebrow">Kategorie</h3>
                <div className="chip-wrap">
                  {CATEGORIES.map((c) => (
                    <Chip key={c.key} on={item.category === c.key} onClick={() => set({ category: c.key, sub: "", size: c.key === item.category ? item.size : "" })}>
                      {c.label}
                    </Chip>
                  ))}
                </div>
                <div className="chip-wrap sub-chips">
                  {kategorie.sub.map((s) => (
                    <Chip key={s} on={item.sub === s} onClick={() => set({ sub: item.sub === s ? "" : s })}>
                      {s}
                    </Chip>
                  ))}
                </div>
              </section>

              <section className="form-block">
                <h3 className="eyebrow">Farben {ergebnis?.farben.length ? <span className="auto-tag">automatisch erkannt</span> : null}</h3>
                <div className="chip-wrap">
                  <AnimatePresence initial={false}>
                    {item.colors.map((c, n) => (
                      <m.button
                        key={c.name}
                        layout
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className={`color-chip ${n === 0 ? "is-main" : ""}`}
                        onClick={() => { setFarbenManuell(true); set({ colors: item.colors.filter((x) => x.name !== c.name) }); }}
                        title="Entfernen"
                      >
                        <Swatch name={c.name} size={16} ring /> {c.name}
                        {n === 0 && <small>Hauptfarbe</small>}
                        <X size={12} />
                      </m.button>
                    ))}
                  </AnimatePresence>
                  <button className="color-chip add" onClick={() => setFarbwahl(!farbwahl)}>
                    <Plus size={14} /> Farbe
                  </button>
                </div>
                <AnimatePresence>
                  {farbwahl && (
                    <m.div className="color-picker" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                      <div className="swatch-grid">
                        {PALETTE.map((p) => {
                          const on = item.colors.some((c) => c.name === p.name);
                          return (
                            <button
                              key={p.name}
                              className={`swatch-btn ${on ? "is-on" : ""}`}
                              onClick={() =>
                                (setFarbenManuell(true), set({
                                  colors: on ? item.colors.filter((c) => c.name !== p.name) : [...item.colors, { name: p.name, hex: PALETTE_BY_NAME[p.name].hex, share: 0.2 }].slice(0, 4),
                                }))
                              }
                            >
                              <span className="swatch-big" style={{ background: p.hex }}>{on && <Check size={14} strokeWidth={2.5} />}</span>
                              <span>{p.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </m.div>
                  )}
                </AnimatePresence>
              </section>

              <section className="form-block">
                <h3 className="eyebrow">Größe</h3>
                <div className="chip-wrap">
                  {groessen.map((g) => (
                    <Chip key={g} on={item.size === g} onClick={() => set({ size: item.size === g ? "" : g })}>
                      {g}
                    </Chip>
                  ))}
                  <input className="input size-input" placeholder="andere" value={groessen.includes(item.size) ? "" : item.size} onChange={(e) => set({ size: e.target.value })} />
                </div>
              </section>

              <details className="more-details">
                <summary>
                  Mehr Details <span className="muted">Name, Marke, Saison, Anlass … (optional)</span>
                  <ChevronDown size={16} />
                </summary>
                <div className="more-details-body">
              <div className="two-col">
                <Field label="Name">
                  <input value={item.name} placeholder={displayName({ ...item, name: "" })} onChange={(e) => set({ name: e.target.value })} />
                </Field>
                <Field label="Marke">
                  <input value={item.brand} list="marken" placeholder="z. B. COS" onChange={(e) => set({ brand: e.target.value })} />
                  <datalist id="marken">{marken.map((m) => <option key={m} value={m} />)}</datalist>
                </Field>
              </div>

                <Toggle on={item.pattern} onChange={(v) => set({ pattern: v })} label="Gemustert (Streifen, Karo, Print …)" />
              <div className="two-col">
                {item.status === "wish" ? (
                  <Field label="Link zum Shop">
                    <input type="url" placeholder="https://" value={item.shopUrl} onChange={(e) => set({ shopUrl: e.target.value })} />
                  </Field>
                ) : (
                  <Field label="Gekauft am">
                    <input type="date" value={item.purchaseDate ?? ""} max={isoDay()} onChange={(e) => set({ purchaseDate: e.target.value || null })} />
                  </Field>
                )}
              </div>

              <section className="form-block">
                <h3 className="eyebrow">Saison <span className="auto-tag">leer = ganzjährig</span></h3>
                <div className="chip-wrap">
                  {SEASONS.map((s) => (
                    <Chip key={s} on={item.seasons.includes(s)} onClick={() => set({ seasons: toggle(item.seasons, s) })}>
                      {s}
                    </Chip>
                  ))}
                </div>
              </section>
              <section className="form-block">
                <h3 className="eyebrow">Anlass</h3>
                <div className="chip-wrap">
                  {OCCASIONS.map((s) => (
                    <Chip key={s} on={item.occasions.includes(s)} onClick={() => set({ occasions: toggle(item.occasions, s) })}>
                      {s}
                    </Chip>
                  ))}
                </div>
              </section>

              <div className="two-col">
                <Field label="Material">
                  <input value={item.material} placeholder="z. B. Baumwolle" onChange={(e) => set({ material: e.target.value })} />
                </Field>
                <Field label="Zustand">
                  <select value={item.condition} onChange={(e) => set({ condition: e.target.value as Item["condition"] })}>
                    {CONDITIONS.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Notizen">
                <textarea value={item.notes} placeholder="Passform, Pflegehinweise, Geschenk von …" onChange={(e) => set({ notes: e.target.value })} />
              </Field>
                </div>
              </details>

              <div className="add-save">
                {!editId && (
                  <Button size="l" onClick={() => speichern(true)} disabled={speichert || arbeitet}>
                    Speichern & nächstes
                  </Button>
                )}
                <Button variant="primary" size="l" icon={<Check size={18} />} onClick={() => speichern()} disabled={speichert || arbeitet}>
                  {arbeitet ? "Wird freigestellt …" : speichert ? "Speichert …" : editId ? "Änderungen speichern" : item.status === "wish" ? "Auf die Wunschliste" : "In den Schrank"}
                </Button>
              </div>
            </div>
          </m.div>
        )}
      </>
    </Overlay>
  );
}

function Vorschau({ item, ergebnis, original, roh }: { item: Item; ergebnis: VerarbeitetesFoto | null; original: boolean; roh?: string | null }) {
  const [url, setUrl] = useState<string | null>(null);
  const gespeichert = useImageUrl(original ? item.imageOriginal : item.imageCutout ?? item.imageOriginal);
  useEffect(() => {
    if (!ergebnis) return;
    const b = original ? ergebnis.original : ergebnis.freigestellt ?? ergebnis.original;
    const u = URL.createObjectURL(b);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [ergebnis, original]);
  const src = roh ?? (ergebnis ? url : gespeichert);
  const cut = !roh && !original && (ergebnis ? Boolean(ergebnis.freigestellt) : Boolean(item.imageCutout));
  return (
    <div className={`garment ${cut ? "is-cut" : "is-photo"}`}>
      {src && <m.img key={src} src={src} alt="" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }} />}
    </div>
  );
}

function DropZone({ onFile, children }: { onFile: (f: File) => void; children: React.ReactNode }) {
  const [over, setOver] = useState(false);
  return (
    <div
      className={`drop ${over ? "is-over" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const f = [...e.dataTransfer.files].find((x) => x.type.startsWith("image/"));
        if (f) onFile(f);
      }}
    >
      {children}
    </div>
  );
}

/** Wunschteil per Shop-Link holen (über die Supabase-Funktion "import"; nur mit Konto). */
function LinkImport({ onBild }: { onBild: (b: Blob, info: { titel: string | null; marke: string | null; url: string }) => void }) {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [laedt, setLaedt] = useState(false);
  const angemeldet = useSync().angemeldet;

  async function holen(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setLaedt(true);
    setStatus(null);
    try {
      const { supabase, URL_, KEY } = await import("../lib/sync");
      const { data } = await supabase.auth.getSession();
      const r = await fetch(`${URL_}/functions/v1/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: KEY, Authorization: `Bearer ${data.session?.access_token ?? KEY}` },
        body: JSON.stringify({ url: url.trim() }),
      });
      const j = (await r.json()) as { fehler?: string; titel?: string; marke?: string; bild?: string };
      if (!r.ok || !j.bild) {
        setStatus(
          r.status === 403 || /\(403\)|nicht geliefert/.test(j.fehler ?? "")
            ? "Dieser Shop blockiert den Import. Mach einen Screenshot vom Produktbild und füge ihn hier mit Strg + V ein (am Handy: Galerie)."
            : j.fehler ?? "Import fehlgeschlagen",
        );
        return;
      }
      const blob = await (await fetch(j.bild)).blob();
      onBild(blob, { titel: j.titel ?? null, marke: j.marke ?? null, url: url.trim() });
    } catch {
      setStatus("Keine Verbindung – bitte später erneut versuchen.");
    } finally {
      setLaedt(false);
    }
  }

  return (
    <form className="link-import" onSubmit={holen}>
      <div className="search">
        <Link2 size={16} />
        <input type="url" inputMode="url" placeholder={angemeldet ? "Shop-Link einfügen – Bild & Name werden geholt" : "Shop-Link importieren (mit Konto unter „Mehr“)"} value={url} onChange={(e) => setUrl(e.target.value)} disabled={!angemeldet || laedt} />
        <button type="submit" className="btn btn-primary btn-s" disabled={!angemeldet || laedt || !url.trim()}>
          {laedt ? <span className="spinner small" /> : <span>Holen</span>}
        </button>
      </div>
      {status && <p className="link-import-status">{status}</p>}
    </form>
  );
}
