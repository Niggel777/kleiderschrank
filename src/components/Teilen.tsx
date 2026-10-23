// Schrank mit Freunden teilen: Link erstellen, kopieren/teilen, widerrufen (nur mit Konto).
import { Copy, Link2, Share2, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { freigabeErstellen, freigabeLink, freigabeLoeschen, freigabenLaden, type Freigabe } from "../lib/freigabe";
import { useSync } from "../lib/syncStatus";
import { useToast } from "./Toast";
import { Button } from "./ui";

export function TeilenBereich() {
  const sync = useSync();
  const toast = useToast();
  const [liste, setListe] = useState<Freigabe[] | null>(null);

  useEffect(() => {
    if (sync.angemeldet) freigabenLaden().then(setListe, () => setListe([]));
  }, [sync.angemeldet]);

  if (!sync.angemeldet) return <p className="muted">Melde dich oben unter „Konto & Abgleich“ an, um deinen Schrank zu teilen.</p>;

  async function teilen(f: Freigabe) {
    const link = freigabeLink(f.token);
    try {
      if (navigator.share) await navigator.share({ title: "Mein Kleiderschrank", text: "Schau dir meinen Schrank an:", url: link });
      else {
        await navigator.clipboard.writeText(link);
        toast("Link kopiert");
      }
    } catch {
      /* abgebrochen */
    }
  }

  return (
    <div className="stack">
      <div className="row-gap">
        <Button
          variant="primary"
          icon={<Link2 size={16} />}
          onClick={async () => {
            const name = (sync.email ?? "").split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) || "mir";
            const f = await freigabeErstellen(name);
            setListe((l) => [f, ...(l ?? [])]);
            teilen(f);
          }}
        >
          Link erstellen
        </Button>
      </div>
      {liste?.map((f) => (
        <div key={f.token} className="freigabe">
          <span className="freigabe-link">{freigabeLink(f.token).replace(/^https?:\/\//, "")}</span>
          <button className="icon-btn" aria-label="Kopieren" onClick={() => navigator.clipboard.writeText(freigabeLink(f.token)).then(() => toast("Link kopiert"))}><Copy size={16} /></button>
          <button className="icon-btn" aria-label="Teilen" onClick={() => teilen(f)}><Share2 size={16} /></button>
          <button
            className="icon-btn"
            aria-label="Link sperren"
            onClick={async () => {
              await freigabeLoeschen(f.token);
              setListe((l) => (l ?? []).filter((x) => x.token !== f.token));
              toast("Link gesperrt – er funktioniert nicht mehr");
            }}
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
