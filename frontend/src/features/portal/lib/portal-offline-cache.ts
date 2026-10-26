import type { PortalCommandCenter } from '@trailcomand/shared';

/**
 * Offline cache for the traveller Command Center.
 *
 * Design constraints, in order of importance:
 *
 *  1. The portal token is a bearer credential. It must never be written to
 *     storage, embedded in a cache key, or logged. This module therefore takes a
 *     non-reversible *scope hash* derived from the token (see `portalScopeId`),
 *     which is enough to keep two travellers' caches apart on a shared device
 *     without storing anything that can be replayed against the API.
 *  2. Only the traveller-safe projection is stored — the server never sends
 *     costs, supplier data or internal notes, and the file omits nothing the UI
 *     needs to render offline.
 *  3. localStorage is NOT encrypted. Anyone with access to the device profile can
 *     read it. Mitigations: short TTL, a size cap, no private document *contents*
 *     (only metadata + a URL that still requires the live token), and a wipe on
 *     explicit exit. The trade-off is stated on the offline banner rather than
 *     pretended away.
 *  4. A failed or incomplete fetch must never overwrite a good snapshot.
 */

const CACHE_PREFIX = 'trailcomand.portal.v1';
/** Offline data older than this is treated as unusable and purged. */
export const PORTAL_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
/** How much JSON we are willing to hold for one trip. */
const MAX_CACHE_BYTES = 200_000;

interface StoredSnapshot {
  version: 1;
  savedAt: string;
  /** Server build time of the payload, for the "last synced" label. */
  syncedAt: string;
  data: PortalCommandCenter;
}

/**
 * Stable, non-reversible scope id for a token.
 *
 * Uses WebCrypto SHA-256 when available. If it is not (insecure context on some
 * mobile browsers), we fall back to a short locale-independent FNV-1a digest.
 * Neither is a substitute for authentication — the server always re-checks the
 * token — they only namespace this device's cache.
 */
export async function portalScopeId(token: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (subtle) {
    try {
      const digest = await subtle.digest('SHA-256', new TextEncoder().encode(token));
      return Array.from(new Uint8Array(digest))
        .slice(0, 12)
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('');
    } catch {
      // fall through to the non-crypto digest
    }
  }
  let hash = 0x811c9dc5;
  for (let index = 0; index < token.length; index += 1) {
    hash ^= token.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `fnv${hash.toString(16).padStart(8, '0')}`;
}

function cacheKey(scopeId: string): string {
  return `${CACHE_PREFIX}.${scopeId}`;
}

function storage(): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    // Private-mode Safari throws on setItem; probe once so callers can degrade.
    const probe = '__trailcomand_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return null;
  }
}

function isSnapshot(value: unknown): value is StoredSnapshot {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<StoredSnapshot>;
  return (
    candidate.version === 1 &&
    typeof candidate.savedAt === 'string' &&
    typeof candidate.syncedAt === 'string' &&
    Boolean(candidate.data) &&
    typeof candidate.data === 'object' &&
    Array.isArray(candidate.data?.itinerary) &&
    Array.isArray(candidate.data?.updates)
  );
}

/** Returns the snapshot if it is intact and not expired; purges it otherwise. */
export function readCachedPortal(scopeId: string, now = Date.now()): StoredSnapshot | null {
  const store = storage();
  if (!store) return null;
  const key = cacheKey(scopeId);
  try {
    const raw = store.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isSnapshot(parsed)) {
      store.removeItem(key);
      return null;
    }
    const savedAt = Date.parse(parsed.savedAt);
    if (!Number.isFinite(savedAt) || now - savedAt > PORTAL_CACHE_TTL_MS) {
      store.removeItem(key);
      return null;
    }
    return parsed;
  } catch {
    // Malformed JSON: drop it rather than render half a trip.
    try {
      store.removeItem(key);
    } catch {
      /* ignore */
    }
    return null;
  }
}

/**
 * Saves a successful payload. Refuses to write anything that is not a complete
 * Command Center payload, so a partial response cannot displace a good snapshot.
 */
export function writeCachedPortal(
  scopeId: string,
  data: PortalCommandCenter,
  now = new Date(),
): StoredSnapshot | null {
  const store = storage();
  if (!store) return null;
  if (!data || !Array.isArray(data.itinerary) || !Array.isArray(data.updates) || !data.trip) {
    return null;
  }
  const snapshot: StoredSnapshot = {
    version: 1,
    savedAt: now.toISOString(),
    syncedAt: data.syncedAt,
    data,
  };
  try {
    const serialized = JSON.stringify(snapshot);
    if (serialized.length > MAX_CACHE_BYTES) return null;
    store.setItem(cacheKey(scopeId), serialized);
    return snapshot;
  } catch {
    // Quota exceeded: the cache is best-effort, the online view still works.
    return null;
  }
}

export function clearCachedPortal(scopeId: string): void {
  storage()?.removeItem(cacheKey(scopeId));
}

/** Removes every portal snapshot on this device (used when a traveller signs out). */
export function clearAllCachedPortals(): void {
  const store = storage();
  if (!store) return;
  const keys: string[] = [];
  for (let index = 0; index < store.length; index += 1) {
    const key = store.key(index);
    if (key?.startsWith(`${CACHE_PREFIX}.`)) keys.push(key);
  }
  for (const key of keys) store.removeItem(key);
}

/** True when the cached snapshot is old enough that the traveller should be warned. */
export function isSnapshotStale(savedAt: string, now = Date.now(), staleAfterMs = 6 * 60 * 60 * 1000) {
  const saved = Date.parse(savedAt);
  return !Number.isFinite(saved) || now - saved > staleAfterMs;
}
