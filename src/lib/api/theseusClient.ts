/**
 * Theseus client for the public atlas.
 *
 * The atlas serves /api/v2/theseus/open-flint-atlas/* as its own routes.
 * Historically those handlers returned local JSON fixtures (a stub that
 * pretended to be Theseus). This client proxies the live endpoints to the
 * real Theseus deployment on Railway when reachable.
 *
 * Configuration:
 *   THESEUS_API_BASE  Base URL of the live Theseus deployment.
 *                     Default: https://index-api-production-a5f7.up.railway.app
 *
 * Design notes:
 *   - The atlas keeps its own STATIC PACKAGE locally (atlas-node manifest,
 *     scene manifests, civic-object contracts, read-model catalog, etc.) —
 *     those are the atlas's published intent, not live data Theseus owns.
 *   - LIVE endpoints (places, sources, signals, search, provenance, events,
 *     manifest) are forwarded to Theseus, with the local fixture used as a
 *     fallback when Theseus is unreachable. This keeps dev usable when
 *     Railway is down and provides a known-good response shape.
 *   - Public read paths only. Writes still return 501 from the atlas route
 *     until contribution intake is real.
 */

const DEFAULT_THESEUS_BASE =
  "https://index-api-production-a5f7.up.railway.app";

const PATH_PREFIX = "api/v2/theseus/open-flint-atlas";

/**
 * Thrown when Theseus is unreachable or responds with a non-2xx status.
 * Callers should typically catch and fall back to a local fixture.
 */
export class TheseusUnavailable extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "TheseusUnavailable";
  }
}

function getBaseUrl(): string {
  return process.env.THESEUS_API_BASE ?? DEFAULT_THESEUS_BASE;
}

/**
 * Fetch a JSON payload from Theseus. The path is appended to the atlas
 * gateway prefix; pass relative paths only (e.g. "places", "search?q=foo").
 */
export async function fetchTheseus<T = unknown>(
  pathWithQuery: string,
  init?: RequestInit,
): Promise<T> {
  const base = getBaseUrl().replace(/\/+$/, "");
  const url = `${base}/${PATH_PREFIX}/${pathWithQuery}`;
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      cache: init?.cache ?? "no-store",
      headers: {
        Accept: "application/json",
        ...init?.headers,
      },
    });
  } catch (cause) {
    throw new TheseusUnavailable(
      `Theseus network error for ${pathWithQuery}: ${
        cause instanceof Error ? cause.message : String(cause)
      }`,
    );
  }

  if (!res.ok) {
    throw new TheseusUnavailable(
      `Theseus returned ${res.status} for ${pathWithQuery}`,
      res.status,
    );
  }

  return (await res.json()) as T;
}

/**
 * Try Theseus first; on any TheseusUnavailable error, return the local
 * fallback value. The fallback is computed lazily so the local code only
 * runs when needed.
 */
export async function fetchTheseusOrFallback<T>(
  pathWithQuery: string,
  fallback: () => T | Promise<T>,
  init?: RequestInit,
): Promise<{ data: T; source: "theseus" | "fixture" }> {
  try {
    const data = await fetchTheseus<T>(pathWithQuery, init);
    return { data, source: "theseus" };
  } catch (err) {
    if (err instanceof TheseusUnavailable) {
      console.warn(
        `[atlas] Theseus unreachable for ${pathWithQuery} (${err.status ?? "network"}). Using local fixture.`,
      );
      return { data: await fallback(), source: "fixture" };
    }
    throw err;
  }
}
