/*
 * PorchFest planner service worker (scope: /porchfest).
 *
 * Makes the planner installable and openable offline. Strategy:
 *   - precache the shell (the /porchfest document, manifest, icon)
 *   - navigations: network-first, fall back to the cached shell offline
 *     (the fixture is bundled into the page chunks, so the planner still
 *     renders its honest "backend pending" fixture view with no network)
 *   - static assets (Next chunks, fixtures, icons, fonts): cache-first,
 *     populated on first fetch
 */

const CACHE = "porchfest-v1";
const SHELL = ["/porchfest", "/manifest.webmanifest", "/porchfest-icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .catch(() => {}),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function cachePut(request, response) {
  const copy = response.clone();
  caches
    .open(CACHE)
    .then((cache) => cache.put(request, copy))
    .catch(() => {});
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navigations: network-first so live data wins online; cached shell offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          cachePut(request, response);
          return response;
        })
        .catch(() =>
          caches
            .match(request)
            .then((cached) => cached || caches.match("/porchfest")),
        ),
    );
    return;
  }

  // Static assets: cache-first, populate on first fetch.
  const isStatic =
    url.pathname.startsWith("/_next/") ||
    url.pathname.includes("/fixtures/") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".woff2") ||
    url.pathname.endsWith(".woff") ||
    url.pathname.endsWith(".png");

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (response.ok && isStatic) cachePut(request, response);
          return response;
        })
        .catch(() => cached);
    }),
  );
});
