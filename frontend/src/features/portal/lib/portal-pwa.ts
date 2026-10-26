/**
 * Registers the traveller portal service worker.
 *
 * Scope is narrowed to `/portal/` so the office and guide apps are never
 * intercepted by a cache shaped for a public, read-mostly page. Registration is
 * best-effort: in an unsupported or insecure context the portal still works, it
 * just boots online only.
 */

const SW_URL = "/portal-sw.js";
const SW_SCOPE = "/portal/";

let registered = false;

export function registerPortalServiceWorker(): void {
  if (registered) return;
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  registered = true;

  // Wait for load so registration never competes with the first render.
  const start = () => {
    void navigator.serviceWorker
      .register(SW_URL, { scope: SW_SCOPE })
      .then(async (registration) => {
        // A brand-new worker waits until every tab closes unless we ask it to take
        // over. Without this, the first visit cannot render offline until the
        // second one, which is exactly the visit where a trekker has no signal.
        await registration.update().catch(() => undefined);
        if (registration.waiting) registration.waiting.postMessage('skip-waiting');
        if (!navigator.serviceWorker.controller && registration.active) {
          // Already activated: the page will be claimed on the next navigation.
          return;
        }
      })
      .catch(() => {
        // Registration failures are not user-facing: offline is a bonus, not a promise.
        registered = false;
      });
  };

  if (document.readyState === "complete") start();
  else window.addEventListener("load", start, { once: true });
}
