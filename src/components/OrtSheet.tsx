// Ort für das Wetter festlegen (Suche oder aktueller Standort).
import { LocateFixed, MapPin, Search } from "lucide-react";
import { useState } from "react";
import { setSetting } from "../lib/db";
import { sucheOrt, type Ort } from "../lib/wetter";
import { Sheet } from "./Sheet";
import { Button } from "./ui";

export function OrtSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [text, setText] = useState("");
  const [treffer, setTreffer] = useState<Ort[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  async function suche(e?: React.FormEvent) {
    e?.preventDefault();
    if (!text.trim()) return;
    setStatus("Suche …");
    try {
      const t = await sucheOrt(text.trim());
      setTreffer(t);
      setStatus(t.length ? null : "Kein Ort gefunden");
    } catch {
      setStatus("Keine Verbindung");
    }
  }

  async function waehle(o: Ort) {
    await setSetting("ort", o);
    onClose();
  }

  function standort() {
    if (!navigator.geolocation) return setStatus("Standort wird nicht unterstützt");
    setStatus("Standort wird ermittelt …");
    navigator.geolocation.getCurrentPosition(
      (p) => waehle({ name: "Mein Standort", lat: +p.coords.latitude.toFixed(2), lon: +p.coords.longitude.toFixed(2) }),
      () => setStatus("Standort nicht freigegeben"),
      { timeout: 10000, maximumAge: 3_600_000 },
    );
  }

  return (
    <Sheet open={open} onClose={onClose} title="Wetter für Outfits">
      <p className="muted sheet-lead">Mit deinem Ort passen die Vorschläge zur Temperatur. Abgefragt wird nur das Wetter bei Open-Meteo, sonst nichts.</p>
      <form className="search ort-search" onSubmit={suche}>
        <Search size={17} />
        <input autoFocus placeholder="Stadt, z. B. Neu-Ulm" value={text} onChange={(e) => setText(e.target.value)} />
        <Button size="s" variant="primary" type="submit">
          Suchen
        </Button>
      </form>
      <div className="option-list">
        {treffer.map((o) => (
          <button key={`${o.lat},${o.lon}`} className="option" onClick={() => waehle(o)}>
            <span className="row-gap">
              <MapPin size={15} /> {o.name}
            </span>
          </button>
        ))}
      </div>
      {status && <p className="muted">{status}</p>}
      <Button variant="ghost" icon={<LocateFixed size={16} />} onClick={standort}>
        Aktuellen Standort verwenden
      </Button>
    </Sheet>
  );
}
