/*
 * TrailComand traveller portal — service worker.
 *
 * Scope: this file is only registered from the public portal route, so it never
 * intervenes in the office app.
 *
 * What it caches:
 *  - the application shell (HTML, JS, CSS, fonts) with a stale-while-revalidate
 *    strategy, so a cold start with no signal can still boot the SPA;
 *  - nothing else.
 *
 * What it deliberately never caches:
 *  - any /api request. Authenticated and bearer-token responses are private to
 *    one traveller and must not sit in a shared HTTP cache. The traveller-safe
 *    offline snapshot is handled in app code with a scoped key instead.
 *
 * The API is network-only: if it fails, the request fails, and the app decides
 * whether to show its own saved data and label it as offline.
 */

const VERSION = "trailcomand-portal-v1";
const SHELL_CACHE = `${VERSION}-shell`;

self.addEventListener("install", (event) => {
  // Cache the shell document AND the hashed entry bundle it references. Asset
  // filenames are content-hashed, so they are discovered by parsing index.html
  // here; anything else is cached on first use by the fetch handler below.
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(SHELL_CACHE);
        await cache.addAll(["/", "/index.html", "/portal-icon.svg", "/manifest.webmanifest"]);
        const shell = await cache.match("/index.html");
        if (!shell) return;
        const html = await shell.text();
        const urls = new Set();
        for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
          const value = match[1];
          if (!value.startsWith("/") || value.startsWith("//")) continue;
          if (!/\/(?:assets\/|\.?[^/]*\.(?:js|css)$)/.test(value)) continue;
          urls.add(value);
        }
        // A missing asset here must not abort the whole install.
        await Promise.all([...urls].map((url) => cache.add(url).catch(() => undefined)));
      } catch {
        // Install stays best-effort; the fetch handler still populates the cache.
      }
    })(),
  );
});

function isPortalCache(key) {
  // Anything this app ever created: current name, or a pre-rebrand name.
  return key.startsWith("trailcomand-portal-") || key.startsWith("tripchange-portal-");
}

// Take over as soon as the app asks, so the first visit can already render offline.
// Only a `skip-waiting` string is honoured; nothing is executed from the payload.
self.addEventListener("message", (event) => {
  if (event.data === "skip-waiting") void self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      // Only touch our own caches: a stale portal shell must never evict the
      // office app's offline data on a shared browser profile. The legacy
      // "tripchange-portal-" prefix is matched too, so an install from before the
      // rebrand is cleaned up rather than left behind.
      await Promise.all(
        keys
          .filter((key) => isPortalCache(key) && !key.startsWith(VERSION))
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

function isApi(url) {
  return url.pathname.startsWith("/api/");
}

function isShellAsset(url) {
  return (
    url.origin === self.location.origin &&
    (url.pathname.startsWith("/assets/") ||
      url.pathname === "/" ||
      url.pathname === "/index.html" ||
      url.pathname === "/manifest.webmanifest" ||
      /\.(?:js|css|woff2?|png|svg|ico|webp)$/.test(url.pathname))
  );
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Private API traffic: never cached, never served from cache.
  if (isApi(url)) return;

  if (request.mode === "navigate") {
    // Navigation: try the network (fresh deploy), fall back to the cached shell.
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(SHELL_CACHE);
        const shell =
          (await cache.match("/index.html")) ?? (await cache.match("/"));
        return (
          shell ??
          new Response("Offline", {
            status: 503,
            headers: { "Content-Type": "text/plain" },
          })
        );
      }),
    );
    return;
  }

  if (!isShellAsset(url) || url.origin !== self.location.origin) return;

  // Static assets: the hashed bundle URL is stable across deploys, so the cached
  // copy is authoritative once stored. Cache-first, then refresh quietly online so
  // a new deploy is picked up on the next visit.
  event.respondWith(
    caches.open(SHELL_CACHE).then(async (cache) => {
      // Some dev/preview servers send `Vary: Origin` on hashed assets. The cache
      // must key on the URL alone: the same bundle is served to every origin.
      const cached = await cache.match(request, { ignoreVary: true });
      if (cached) {
        fetch(request)
          .then((response) => {
            if (response.ok) void cache.put(request, response.clone());
          })
          .catch(() => undefined);
        return cached;
      }
      try {
        const response = await fetch(request);
        if (response.ok && response.type === "basic") {
          void cache.put(request, response.clone());
        }
        return response;
      } catch {
        return Response.error();
      }
    }),
  );
});
