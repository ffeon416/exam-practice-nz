// Minimal service worker for StudyAce. Its only jobs are (1) satisfy the
// installability criteria so Android offers "Install app", and (2) provide an
// offline fallback. It is deliberately NETWORK-FIRST and only touches page
// navigations — it never caches JS/CSS chunks or API responses, so it can
// never serve a stale app. If the network is up, you always get fresh content.

// AUTO-STAMPED per deploy by scripts/stamp-sw.mjs (replaces "dev" with the
// Vercel commit SHA at build time). This changes the SW bytes on EVERY deploy,
// so the browser always installs a fresh worker → controllerchange → the app
// reloads itself into the new build. Do NOT hand-edit the value; it must stay
// exactly `const BUILD_VERSION = "..."` for the stamp regex to match. Kept out
// of the log-free path deliberately so it can't be tree-shaken (public/ files
// are served verbatim, but this makes the intent explicit).
const BUILD_VERSION = "dev";
self.__STUDYACE_BUILD__ = BUILD_VERSION;

// Bump this string on any deploy that must reach installed PWAs. Changing the
// SW bytes makes the browser install a new worker; install() calls
// skipWaiting() and activate() calls clients.claim(), which fires
// `controllerchange` in the page — ServiceWorkerRegister then reloads the app
// once into the fresh build. This is how a standalone iOS/Android home-screen
// app (which otherwise resumes stale JS forever) picks up new deploys.
//   v1 -> v2 (2026-07-19): purge stale "/" shell after the GA removal.
//   v2 -> v3 (2026-07-20): ship the /subjects picker perf fixes + the new
//                          self-updating registrar to installed apps.
const CACHE = "studyace-shell-v3";

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
        // Keep a fresh copy of the landing page for offline use — only when
        // this navigation actually IS the landing page. Caching every page
        // under "/" made the offline fallback "whatever you last visited".
        if (new URL(request.url).pathname === "/") {
          const copy = response.clone();
          caches.open(CACHE).then((c) => c.put("/", copy)).catch(() => {});
        }
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match("/"))),
  );
});
