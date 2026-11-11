const CACHE_NAME = "savash-shell-v2";
const APP_SHELL = [
  "./",
  "./index.html",
  "./config.js",
  "./multiplayer.js",
  "./game.js",
  "./manifest.webmanifest",
  "./file_00000000d45c81f48ba3ab6d5282ec87.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .catch(error => {
        console.warn("SAVASH app shell cache was incomplete:", error);
      })
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).catch(() => {
        if (event.request.mode === "navigate") return caches.match("./index.html");
        throw new Error("SAVASH resource is not available offline.");
      });
    })
  );
});
