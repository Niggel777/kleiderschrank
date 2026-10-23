// Offline: App-Dateien und das Freistell-Modell nach dem ersten Laden aus dem Cache bedienen.
const APP = "garderobe-app-v1";
const MODELL = "garderobe-modell-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) =>
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => ![APP, MODELL].includes(k)).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  ),
);

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Modelle & WASM (Freistellen, Körpererkennung): einmal laden, danach immer aus dem Cache
  const modell = url.hostname === "staticimgly.com" || url.hostname === "storage.googleapis.com" || (url.hostname === "cdn.jsdelivr.net" && url.pathname.includes("@mediapipe"));
  if (modell) {
    e.respondWith(
      caches.open(MODELL).then(async (c) => {
        const hit = await c.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) c.put(req, res.clone());
        return res;
      }),
    );
    return;
  }
  if (url.origin !== location.origin) return;

  // App: erst Netz (für Updates), bei Offline aus dem Cache
  e.respondWith(
    caches.open(APP).then(async (c) => {
      try {
        const res = await fetch(req);
        if (res.ok) c.put(req, res.clone());
        return res;
      } catch {
        return (await c.match(req)) || (await c.match("./")) || Response.error();
      }
    }),
  );
});
