// Konto & Abgleich: Anmelden mit E-Mail und Passwort, Status, Platz sparen.
import { m } from "framer-motion";
import { HardDriveDownload, LogOut, RefreshCw } from "lucide-react";
import { useState } from "react";
import { abgleichen, abmelden, anmelden, platzSparen } from "../lib/sync";
import { useSync } from "../lib/syncStatus";
import { useToast } from "./Toast";
import { Button, Field, Segmented } from "./ui";

function vorWann(t: number | null): string {
  if (!t) return "noch nie";
  const s = Math.round((Date.now() - t) / 1000);
  if (s < 60) return "gerade eben";
  if (s < 3600) return `vor ${Math.round(s / 60)} Min.`;
  return new Intl.DateTimeFormat("de-DE", { dateStyle: "short", timeStyle: "short" }).format(t);
}

export function KontoBereich() {
  const sync = useSync();
  const toast = useToast();
  const [modus, setModus] = useState<"anmelden" | "neu">("anmelden");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [arbeit, setArbeit] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);

  if (sync.angemeldet) {
    return (
      <div className="konto">
        <div className="konto-status">
          <span className={`sync-dot ${sync.fehler ? "is-err" : sync.laeuft ? "is-busy" : "is-ok"}`} />
          <div>
            <strong>{sync.email}</strong>
            <span className="muted">
              {sync.fehler ? `Fehler: ${sync.fehler}` : sync.laeuft ? "Gleicht ab …" : `Abgeglichen ${vorWann(sync.zuletzt)}`}
              {sync.offen > 0 && !sync.laeuft ? ` · ${sync.offen} ausstehend` : ""}
            </span>
          </div>
        </div>
        <div className="row-gap">
          <Button icon={<RefreshCw size={16} />} disabled={sync.laeuft} onClick={() => abgleichen()}>
            Jetzt abgleichen
          </Button>
          <Button
            icon={<HardDriveDownload size={16} />}
            disabled={sync.laeuft || sync.offen > 0}
            onClick={async () => {
              const n = await platzSparen();
              toast(n ? `${n} große Bilder lokal entfernt – sie werden bei Bedarf aus der Cloud geladen` : "Nichts zu entfernen");
            }}
          >
            Platz sparen
          </Button>
          <Button variant="ghost" icon={<LogOut size={16} />} onClick={() => abmelden()}>
            Abmelden
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      className="konto"
      onSubmit={async (e) => {
        e.preventDefault();
        setArbeit(true);
        setFehler(null);
        try {
          await anmelden(email.trim(), pw, modus === "neu");
          toast("Angemeldet – dein Schrank wird abgeglichen");
        } catch (err) {
          setFehler(err instanceof Error ? err.message : "Anmeldung fehlgeschlagen");
        } finally {
          setArbeit(false);
        }
      }}
    >
      <Segmented id="konto-modus" value={modus} onChange={setModus} options={[{ value: "anmelden", label: "Anmelden" }, { value: "neu", label: "Konto erstellen" }]} />
      <div className="two-col">
        <Field label="E-Mail">
          <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Passwort" hint={modus === "neu" ? "mindestens 8 Zeichen" : undefined}>
          <input type="password" autoComplete={modus === "neu" ? "new-password" : "current-password"} required minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} />
        </Field>
      </div>
      {fehler && (
        <m.p className="konto-fehler" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>
          {fehler}
        </m.p>
      )}
      <div>
        <Button variant="primary" type="submit" disabled={arbeit}>
          {arbeit ? "Einen Moment …" : modus === "neu" ? "Konto erstellen & abgleichen" : "Anmelden & abgleichen"}
        </Button>
      </div>
    </form>
  );
}

