/**
 * flint-address-overrides.ts
 *
 * Step 3 of the address rework: a local store of manual address corrections.
 *
 * The City of Flint parcel join (Step 2) covers ~98% of Carriage Town
 * buildings, but a few are unmatched or wrong (a building straddling two
 * parcels, a vacant-lot footprint, a parcel the assessor has mis-numbered).
 * Planners know the real addresses for the handful of buildings they care
 * about (their own, their neighbors', festival hosts), so this lets them
 * type a correction that wins over every other source.
 *
 * Storage: localStorage, keyed by OSM building id. Backend persistence is a
 * follow-up (the GraphQL boundary owns durable writes); until then a
 * planner's corrections live in their browser. The store is intentionally
 * tiny and synchronous so the address resolver can consult it on every pick
 * without a render dependency.
 *
 * SSR-safe: every localStorage access is window-guarded, so importing this
 * from a client component that may be server-rendered is harmless.
 */

const STORAGE_KEY = "ofa.flint-address-overrides.v1";

type OverrideMap = Record<string, string>;

let cache: OverrideMap | null = null;
const listeners = new Set<() => void>();

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function load(): OverrideMap {
  if (cache) return cache;
  if (!isBrowser()) {
    cache = {};
    return cache;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : {};
    cache =
      parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as OverrideMap)
        : {};
  } catch {
    cache = {};
  }
  return cache;
}

function persist(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache ?? {}));
  } catch {
    // Quota or privacy-mode failures are non-fatal: the in-memory cache
    // still reflects the edit for this session.
  }
}

function notify(): void {
  for (const listener of listeners) {
    try {
      listener();
    } catch {
      // a misbehaving listener must not break the others
    }
  }
}

function onStorageEvent(event: StorageEvent): void {
  if (event.key === STORAGE_KEY) {
    cache = null; // re-hydrate on next read (another tab changed it)
    notify();
  }
}

function key(osmId: string | number | null | undefined): string | null {
  if (osmId === null || osmId === undefined) return null;
  return String(osmId);
}

/** The manual override for a building, or null if none. */
export function getAddressOverride(
  osmId: string | number | null | undefined,
): string | null {
  const k = key(osmId);
  if (!k) return null;
  const value = load()[k];
  return value && value.trim().length > 0 ? value : null;
}

/** Set (or, with empty text, remove) a building's manual address override. */
export function setAddressOverride(
  osmId: string | number | null | undefined,
  address: string,
): void {
  const k = key(osmId);
  if (!k) return;
  const map = load();
  const trimmed = (address ?? "").trim();
  if (!trimmed) {
    delete map[k];
  } else {
    map[k] = trimmed;
  }
  persist();
  notify();
}

/** Remove a building's manual override (revert to the city/OSM source). */
export function clearAddressOverride(
  osmId: string | number | null | undefined,
): void {
  const k = key(osmId);
  if (!k) return;
  const map = load();
  if (k in map) {
    delete map[k];
    persist();
    notify();
  }
}

/** Snapshot of all overrides (defensive copy). */
export function getAllAddressOverrides(): OverrideMap {
  return { ...load() };
}

/**
 * Subscribe to override changes (in-tab edits and cross-tab storage events).
 * Returns an unsubscribe function. Used by the editor UIs to re-render.
 */
export function subscribeAddressOverrides(listener: () => void): () => void {
  listeners.add(listener);
  if (isBrowser() && listeners.size === 1) {
    window.addEventListener("storage", onStorageEvent);
  }
  return () => {
    listeners.delete(listener);
    if (isBrowser() && listeners.size === 0) {
      window.removeEventListener("storage", onStorageEvent);
    }
  };
}
