// Minimal service worker for StudyAce. Its only jobs are (1) satisfy the
// installability criteria so Android offers "Install app", and (2) provide an
// offline fallback. It is deliberately NETWORK-FIRST and only touches page
// navigations — it never caches JS/CSS chunks or API responses, so it can
// never serve a stale app. If the network is up, you always get fresh content.

// Bumped v1 -> v2 (2026-07-19): forces the SW to re-activate and purge the old
// cached "/" shell so returning visitors pick up the Google-Analytics-removal
// build (GA was adding ~2s per click). Bump this string on any deploy that must
// invalidate the offline shell.
const CACHE = "studyace-shell-v2";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.add("/")).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  // Only handle top-level page navigations. Everything else (assets, API,
  // auth) goes straight to the network, untouched.
  if (request.method !== "GET" || request.mode !== "navigate") return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Keep a fresh copy of the landing page for offline use.
        const copy = response.clone();
        caches.open(CACHE).then((c) => c.put("/", copy)).catch(() => {});
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match("/"))),
  );
});
