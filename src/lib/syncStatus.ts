// Kleiner, sofort geladener Status des Cloud-Abgleichs. Die eigentliche Abgleich-Logik
// (mit der großen Supabase-Bibliothek) liegt in sync.ts und wird erst nach dem Start nachgeladen.
import { useEffect, useState } from "react";

export interface SyncStatus {
  angemeldet: boolean;
  email: string | null;
  laeuft: boolean;
  offen: number;
  zuletzt: number | null;
  fehler: string | null;
}

function zuletztGespeichert(): number | null {
  try {
    const r = localStorage.getItem("garderobe.sync.zuletzt");
    return r ? Number(JSON.parse(r)) : null;
  } catch {
    return null;
  }
}

let status: SyncStatus = { angemeldet: false, email: null, laeuft: false, offen: 0, zuletzt: zuletztGespeichert(), fehler: null };
const hoerer = new Set<() => void>();

export function syncStatus(): SyncStatus {
  return status;
}

export function setzeSyncStatus(p: Partial<SyncStatus>): void {
  status = { ...status, ...p };
  hoerer.forEach((f) => f());
}

export function useSync(): SyncStatus {
  const [s, setS] = useState(status);
  useEffect(() => {
    const f = () => setS(status);
    hoerer.add(f);
    f();
    return () => {
      hoerer.delete(f);
    };
  }, []);
  return s;
}
