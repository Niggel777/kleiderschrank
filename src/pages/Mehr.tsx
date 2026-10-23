// Einstellungen, Export (Obsidian, Backup), Beispiel-Schrank, Speicher, Datenschutz.
import { useLiveQuery } from "dexie-react-hooks";
import { motion } from "framer-motion";
import { Archive, Cloud, Shirt, CloudSun, Download, FileText, HardDrive, Moon, ShieldCheck, Sparkles, Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { OrtSheet } from "../components/OrtSheet";
import { KontoBereich } from "../components/Konto";
import { useToast } from "../components/Toast";
import { Button, Segmented } from "../components/ui";
import { db, setSetting, storageEstimate } from "../lib/db";
import { isoDay } from "../lib/dates";
import { backup, obsidianVault, restore } from "../lib/export";
import { download } from "../lib/image";
import { useGarderobe } from "../lib/store";
import { entferneDemo, ladeDemo } from "../demo/seed";
import type { Ort } from "../lib/wetter";

function mb(n: number) {
  return n > 1e9 ? `${(n / 1e9).toFixed(1)} GB` : `${Math.max(0.1, n / 1e6).toFixed(1)} MB`;
}

export function Mehr() {
  const { items, profil } = useGarderobe();
  const toast = useToast();
  const theme = (useLiveQuery(() => db.settings.get("theme"), [])?.value as string | undefined) ?? "system";
  const ort = useLiveQuery(() => db.settings.get("ort"), [])?.value as Ort | undefined;
  const [speicher, setSpeicher] = useState<{ used: number; quota: number } | null>(null);
  const [ortOffen, setOrtOffen] = useState(false);
  const [arbeit, setArbeit] = useState<string | null>(null);
  const restoreInput = useRef<HTMLInputElement>(null);
  const demoAnzahl = items.filter((i) => i.demo).length;

  useEffect(() => {
    storageEstimate().then(setSpeicher);
    navigator.storage?.persist?.().catch(() => {});
  }, [items.length]);

  async function mit<T>(text: string, f: () => Promise<T>): Promise<T | undefined> {
    setArbeit(text);
    try {
      return await f();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Das hat nicht geklappt");
    } finally {
      setArbeit(null);
    }
  }

  return (
    <div className="wrap mehr">
      <header className="shop-head">
        <div>
          <div className="eyebrow">Einstellungen & Daten</div>
          <h1 className="display page-title">
            Mehr<em>.</em>
          </h1>
        </div>
      </header>

      <div className="settings">
        <Gruppe icon={<Cloud size={18} />} titel="Konto & Abgleich" text="Mit Konto liegt dein Schrank sicher in der Cloud und gleicht sich zwischen Handy und Laptop ab. Ohne Konto bleibt alles nur auf diesem Gerät.">
          <KontoBereich />
        </Gruppe>

        <Gruppe icon={<Shirt size={18} />} titel="Schrank für" text="Bestimmt Kategorien, Unterarten und Größen beim Anlegen und Filtern.">
          <Segmented
            id="profil"
            value={profil}
            onChange={(v) => setSetting("profil", v)}
            options={[
              { value: "herren", label: "Herren" },
              { value: "damen", label: "Damen" },
              { value: "alle", label: "Alle" },
            ]}
          />
        </Gruppe>

        <Gruppe icon={<Moon size={18} />} titel="Darstellung">
          <Segmented
            id="theme"
            value={theme}
            onChange={(v) => setSetting("theme", v)}
            options={[
              { value: "system", label: "System" },
              { value: "light", label: "Hell" },
              { value: "dark", label: "Dunkel" },
            ]}
          />
        </Gruppe>

        <Gruppe icon={<CloudSun size={18} />} titel="Wetter für Outfits" text={ort ? `Ort: ${ort.name}` : "Kein Ort eingestellt – Vorschläge richten sich nach der Jahreszeit."}>
          <div className="row-gap">
            <Button onClick={() => setOrtOffen(true)}>{ort ? "Ort ändern" : "Ort festlegen"}</Button>
            {ort && <Button variant="ghost" onClick={() => db.settings.delete("ort")}>Entfernen</Button>}
          </div>
        </Gruppe>

        <Gruppe icon={<FileText size={18} />} titel="Export für Obsidian" text="Eine Notiz pro Teil mit Bild und Eigenschaften, Outfits mit Links, ein Tagebuch pro Tag und ein Dashboard mit Dataview-Tabellen. ZIP entpacken und als Ordner in deinen Vault legen.">
          <Button
            icon={<Download size={16} />}
            disabled={!items.length || arbeit !== null}
            onClick={() => mit("Vault wird gepackt …", async () => download(await obsidianVault(), `Garderobe-Obsidian-${isoDay()}.zip`))}
          >
            Obsidian-Vault herunterladen
          </Button>
        </Gruppe>

        <Gruppe icon={<Archive size={18} />} titel="Sicherung" text="Alles bleibt auf diesem Gerät. Sichere regelmäßig – oder um den Schrank auf ein anderes Gerät zu übertragen.">
          <div className="row-gap">
            <Button icon={<Download size={16} />} disabled={!items.length || arbeit !== null} onClick={() => mit("Sicherung wird erstellt …", async () => download(await backup(), `Garderobe-Sicherung-${isoDay()}.zip`))}>
              Sicherung speichern
            </Button>
            <Button icon={<Upload size={16} />} disabled={arbeit !== null} onClick={() => restoreInput.current?.click()}>
              Wiederherstellen
            </Button>
            <input
              ref={restoreInput}
              type="file"
              accept=".zip,application/zip"
              hidden
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (!f) return;
                const ersetzen = items.length > 0 && confirm("Vorhandenen Schrank ersetzen? (Abbrechen = zusammenführen)");
                const n = await mit("Wird wiederhergestellt …", () => restore(f, ersetzen));
                if (n !== undefined) toast(`${n} Teile wiederhergestellt`);
              }}
            />
          </div>
        </Gruppe>

        <Gruppe icon={<Sparkles size={18} />} titel="Beispiel-Schrank" text={demoAnzahl ? `${demoAnzahl} Beispielteile mit Tragehistorie sind geladen.` : "Lädt generierte Beispielteile mit Tragehistorie, um alles auszuprobieren."}>
          {demoAnzahl ? (
            <Button
              icon={<Trash2 size={16} />}
              disabled={arbeit !== null}
              onClick={async () => {
                const n = await mit("Wird ausgeräumt …", entferneDemo);
                if (n !== undefined) toast(`${n} Beispielteile entfernt`);
              }}
            >
              Beispielteile entfernen
            </Button>
          ) : (
            <Button icon={<Sparkles size={16} />} disabled={arbeit !== null} onClick={() => mit("Wird eingeräumt …", () => ladeDemo())}>
              Beispiel-Schrank laden
            </Button>
          )}
        </Gruppe>

        <Gruppe icon={<HardDrive size={18} />} titel="Speicher" text={speicher ? `${mb(speicher.used)} belegt von ${mb(speicher.quota)} verfügbar` : "Speicherbelegung nicht verfügbar"}>
          {speicher && (
            <div className="storage-bar">
              <motion.span initial={{ width: 0 }} animate={{ width: `${Math.max(1.5, (speicher.used / Math.max(1, speicher.quota)) * 100)}%` }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} />
            </div>
          )}
        </Gruppe>

        <Gruppe icon={<ShieldCheck size={18} />} titel="Datenschutz" text="Ohne Konto liegen Fotos, Teile und Tragehistorie nur im Speicher dieses Browsers; mit Konto zusätzlich in deinem privaten Supabase-Speicher (Frankfurt), den nur du lesen kannst. Freistellen und Körpererkennung laufen auf deinem Gerät; nur die Modelle werden einmalig von IMG.LY bzw. Google (MediaPipe) geladen. Fürs Wetter wird nur der Ort an Open-Meteo geschickt. Kein Konto, kein Tracking." />
      </div>

      {arbeit && (
        <motion.div className="busy" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <span className="spinner" /> {arbeit}
        </motion.div>
      )}
      <p className="colophon muted">Garderobe · gebaut mit Claude · Freistellen: @imgly/background-removal (AGPL)</p>
      <OrtSheet open={ortOffen} onClose={() => setOrtOffen(false)} />
    </div>
  );
}

function Gruppe({ icon, titel, text, children }: { icon: React.ReactNode; titel: string; text?: string; children?: React.ReactNode }) {
  return (
    <motion.section className="setting" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}>
      <span className="setting-icon">{icon}</span>
      <div className="setting-main">
        <h2>{titel}</h2>
        {text && <p>{text}</p>}
        {children && <div className="setting-ctrl">{children}</div>}
      </div>
    </motion.section>
  );
}
