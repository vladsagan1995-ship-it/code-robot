// sw.js — Service Worker: cache-first strategy for offline PWA

const CACHE = "codebot-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./manifest.json",
  "./icon.svg",
  "./js/levels.js",
  "./js/parser.js",
  "./js/executor.js",
  "./js/animator.js",
  "./js/game.js",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request)
        .then((resp) => {
          if (!resp || resp.status !== 200 || resp.type === "opaque") return resp;
          const clone = resp.clone();
          caches.open(CACHE).then((cache) => cache.put(e.request, clone));
          return resp;
        })
        .catch(() => caches.match("./index.html"));
    })
  );
});
