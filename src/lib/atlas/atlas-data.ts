/**
 * Atlas data loader: ingests SpatialEvent + Place collections into
 * DuckDB so vgplot specs can query them via SQL.
 *
 * Two tables:
 *   atlas_events(event_id, event_type, title, place_id, time_start,
 *                time_end, lat, lng)
 *   atlas_places(place_id, name, place_type, ward, lat, lng)
 *
 * The shapes are deliberately flat — Mosaic / vgplot work best with
 * tabular data, not nested GeoJSON. Geometry is collapsed to a
 * centroid (lat, lng) at load time; richer geometry lives on the
 * GeoJsonLayer / Leaflet branch of the map, not in this DuckDB table.
 *
 * Idempotent: ``ensureAtlasTables`` checks whether the tables already
 * exist on the connection and skips reload when they do. Callers
 * trying to reflect a corpus update should call ``reloadAtlasTables``.
 */

import type { AtlasMosaic } from "./mosaic";
import type {
  PlacesCollection,
  PlaceFeature,
  SpatialEvent,
} from "@/lib/api/openFlintAtlas";

/**
 * Extract a single ISO start date from the discriminated TimeShape union
 * carried on SpatialEvent.time. Returns null for shapes that have no
 * usable start (defensive — current OFA API always provides one).
 *
 * Exported so consumers outside the table loader (e.g. the brushed
 * event-filter in page.tsx) can apply the same temporal unwrap without
 * duplicating the switch statement.
 */
export function eventStartIso(event: SpatialEvent): string | null {
  const time = event.time;
  if (!time) return null;
  switch (time.shape) {
    case "instant":
      return time.date;
    case "interval":
      return time.start;
    case "first_seen_last_seen":
      return time.first_seen;
    case "period":
      // "1980s" -> "1980", "2024-01" / "2025" pass through. Date
      // accepts all three forms.
      return time.period.replace(/s$/, "");
    case "observed_at":
      return time.observed_at;
    default:
      return null;
  }
}

/** End ISO from the discriminated TimeShape. Null for shapes that
    carry no explicit end (instant, observed_at). For decade-style
    periods ("1980s") we return the bucket end ("1989-12-31") so the
    histogram brush extents respect the inclusive range. */
export function eventEndIso(event: SpatialEvent): string | null {
  const time = event.time;
  if (!time) return null;
  switch (time.shape) {
    case "interval":
      return time.end;
    case "first_seen_last_seen":
      return time.last_seen;
    case "period": {
      const p = time.period;
      const decade = p.match(/^(\d{4})s$/);
      if (decade) return `${Number(decade[1]) + 9}-12-31`;
      const year = p.match(/^(\d{4})$/);
      if (year) return `${year[1]}-12-31`;
      const month = p.match(/^(\d{4})-(\d{2})$/);
      if (month) {
        // Last day of the month: ask Date to roll to "the 0th" of
        // the next month, which JS interprets as the last day of
        // the prior month.
        const next = new Date(Date.UTC(Number(month[1]), Number(month[2]), 0));
        return next.toISOString().slice(0, 10);
      }
      return null;
    }
    default:
      return null;
  }
}

function placeCentroid(feature: PlaceFeature): [number, number] | null {
  const g = feature.geometry;
  if (!g) return null;
  if (g.type === "Point") {
    const [lng, lat] = g.coordinates as [number, number];
    return [lat, lng];
  }
  if (g.type === "Polygon") {
    const ring = g.coordinates[0];
    if (!ring?.length) return null;
    let sumLng = 0;
    let sumLat = 0;
    for (const [lng, lat] of ring) {
      sumLng += lng;
      sumLat += lat;
    }
    return [sumLat / ring.length, sumLng / ring.length];
  }
  return null;
}

function quoteSqlString(value: string | null | undefined): string {
  if (!value) return "NULL";
  return `'${value.replace(/'/g, "''")}'`;
}

function normalizeSqlTimestamp(value: string | null | undefined): string | null {
  if (!value) return null;
  const v = value.trim();
  if (/^\d{4}$/.test(v)) return `${v}-01-01 00:00:00`;
  if (/^\d{4}-\d{2}$/.test(v)) return `${v}-01 00:00:00`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return `${v} 00:00:00`;
  return v.replace("T", " ").replace(/Z$/, "");
}

function quoteSqlTimestamp(value: string | null | undefined): string {
  const normalized = normalizeSqlTimestamp(value);
  if (!normalized) return "NULL";
  // DuckDB accepts ISO 8601 via CAST; safer than string interpolation
  return `CAST(${quoteSqlString(normalized)} AS TIMESTAMP)`;
}

function quoteSqlFloat(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "NULL";
  return String(value);
}

let atlasTableLoadQueue: Promise<void> = Promise.resolve();

/**
 * Drop + recreate the atlas_events and atlas_places tables on the
 * shared Mosaic connection and load the provided rows.
 *
 * Callers should invoke this once at page mount and again whenever
 * the underlying API responses change.
 */
export async function loadAtlasTables(
  mosaic: AtlasMosaic,
  places: PlacesCollection | null,
  events: SpatialEvent[],
): Promise<void> {
  atlasTableLoadQueue = atlasTableLoadQueue
    .catch(() => undefined)
    .then(() => loadAtlasTablesNow(mosaic, places, events));
  return atlasTableLoadQueue;
}

async function loadAtlasTablesNow(
  mosaic: AtlasMosaic,
  places: PlacesCollection | null,
  events: SpatialEvent[],
): Promise<void> {
  const { conn } = mosaic;

  await conn.query("DROP TABLE IF EXISTS atlas_events");
  await conn.query("DROP TABLE IF EXISTS atlas_places");
  await conn.query(`
    CREATE TABLE atlas_places (
      place_id    VARCHAR PRIMARY KEY,
      name        VARCHAR,
      place_type  VARCHAR,
      ward        VARCHAR,
      lat         DOUBLE,
      lng         DOUBLE
    )
  `);
  await conn.query(`
    CREATE TABLE atlas_events (
      event_id    VARCHAR PRIMARY KEY,
      event_type  VARCHAR,
      title       VARCHAR,
      place_id    VARCHAR,
      time_start  TIMESTAMP,
      time_end    TIMESTAMP,
      lat         DOUBLE,
      lng         DOUBLE
    )
  `);

  // Per-row INSERTs are fine at OFA scale (low hundreds to low
  // thousands). For larger corpora we'd switch to ``insertJSONFromPath``
  // via the DuckDB Arrow ingest, but that requires a registered file
  // handle which is overhead we don't need yet.

  const placeCentroids = new globalThis.Map<string, [number, number]>();

  if (places && places.features.length > 0) {
    const values = places.features
      .map((feature) => {
        const props = feature.properties || {};
        const centroid = placeCentroid(feature);
        if (centroid) placeCentroids.set(props.place_id ?? "", centroid);
        return `(${quoteSqlString(props.place_id ?? "")}, ${quoteSqlString(
          props.name ?? "",
        )}, ${quoteSqlString(props.place_type ?? "")}, ${quoteSqlString(
          props.ward_number != null ? String(props.ward_number) : "",
        )}, ${quoteSqlFloat(centroid?.[0])}, ${quoteSqlFloat(centroid?.[1])})`;
      })
      .join(",\n");
    if (values) {
      await conn.query(
        `INSERT INTO atlas_places (place_id, name, place_type, ward, lat, lng) VALUES ${values}`,
      );
    }
  }

  if (events.length > 0) {
    const values = events
      .map((event) => {
        const placeId = event.place?.place_id ?? "";
        const centroid = placeId ? placeCentroids.get(placeId) : null;
        return `(${quoteSqlString(event.event_id)}, ${quoteSqlString(
          event.event_type,
        )}, ${quoteSqlString(event.title)}, ${quoteSqlString(
          placeId,
        )}, ${quoteSqlTimestamp(eventStartIso(event))}, ${quoteSqlTimestamp(
          eventEndIso(event),
        )}, ${quoteSqlFloat(centroid?.[0])}, ${quoteSqlFloat(centroid?.[1])})`;
      })
      .join(",\n");
    if (values) {
      await conn.query(
        `INSERT INTO atlas_events (event_id, event_type, title, place_id, time_start, time_end, lat, lng) VALUES ${values}`,
      );
    }
  }
}
