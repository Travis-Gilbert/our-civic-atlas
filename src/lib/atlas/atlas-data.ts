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
import type { LayerRecord, LayerView } from "@/lib/atlas/contracts";

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
let layerTableLoadQueue: Promise<LayerTableLoadResult> = Promise.resolve({
  tableName: "",
  recordCount: 0,
  dataVersion: 0,
});
const layerTableVersions = new globalThis.Map<string, number>();

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

export type LayerTableLoadResult = {
  tableName: string;
  recordCount: number;
  dataVersion: number;
};

/**
 * Stable DuckDB table name for a LayerView. The table is keyed by layer id so
 * card specs can reference the same layer repeatedly without coordinating
 * ad-hoc names between components.
 */
export function tableNameForLayer(layerId: string): string {
  return `layer_${layerId.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "")}`;
}

/**
 * Drop + recreate the DuckDB table for one public LayerView. The columns are a
 * flat analytical envelope over the generic LayerRecord shape: raw JSON stays
 * available, while common civic dimensions are promoted to typed columns for
 * Mosaic/vgplot cards.
 */
export async function loadLayerViewIntoAtlasTables(
  mosaic: AtlasMosaic,
  view: LayerView,
  tableName = tableNameForLayer(view.layerId),
): Promise<LayerTableLoadResult> {
  layerTableLoadQueue = layerTableLoadQueue
    .catch(() => ({ tableName, recordCount: 0, dataVersion: 0 }))
    .then(() => loadLayerViewTableNow(mosaic, view, tableName));
  return layerTableLoadQueue;
}

async function loadLayerViewTableNow(
  mosaic: AtlasMosaic,
  view: LayerView,
  tableName: string,
): Promise<LayerTableLoadResult> {
  const { conn } = mosaic;
  const table = quoteIdentifier(tableName);

  await conn.query(`DROP TABLE IF EXISTS ${table}`);
  await conn.query(`
    CREATE TABLE ${table} (
      id VARCHAR PRIMARY KEY,
      layer_id VARCHAR,
      geometry_json VARCHAR,
      properties_json VARCHAR,
      confidence DOUBLE,
      review_status VARCHAR,
      visibility VARCHAR,
      observed_at VARCHAR,
      observed_ms BIGINT,
      expires_at VARCHAR,
      source_count INTEGER,
      place_id VARCHAR,
      category VARCHAR,
      event_type VARCHAR,
      severity VARCHAR,
      corridor VARCHAR,
      source_tier VARCHAR,
      freshness VARCHAR,
      status VARCHAR,
      funding_status VARCHAR,
      year_value INTEGER,
      decade VARCHAR,
      numeric_value DOUBLE
    )
  `);

  if (view.records.length > 0) {
    const values = view.records.map(layerRecordSqlRow(view)).join(",\n");
    await conn.query(`
      INSERT INTO ${table} (
        id,
        layer_id,
        geometry_json,
        properties_json,
        confidence,
        review_status,
        visibility,
        observed_at,
        observed_ms,
        expires_at,
        source_count,
        place_id,
        category,
        event_type,
        severity,
        corridor,
        source_tier,
        freshness,
        status,
        funding_status,
        year_value,
        decade,
        numeric_value
      ) VALUES ${values}
    `);
  }

  const dataVersion = (layerTableVersions.get(view.layerId) ?? 0) + 1;
  layerTableVersions.set(view.layerId, dataVersion);
  return { tableName, recordCount: view.records.length, dataVersion };
}

function layerRecordSqlRow(view: LayerView) {
  return (record: LayerRecord): string => {
    const observed = firstText(
      record.observedAt,
      propertyText(record, "observed_at"),
      propertyText(record, "observedAt"),
      propertyText(record, "time_start"),
      propertyText(record, "timeStart"),
      propertyText(record, "date"),
      propertyText(record, "year"),
    );
    const observedMs = observed ? Date.parse(observed) : NaN;
    const year = yearFromRecord(record, observed);
    const numericValue = firstNumber(
      propertyNumber(record, "value"),
      propertyNumber(record, "count"),
      propertyNumber(record, "score"),
      propertyNumber(record, "aadt"),
      propertyNumber(record, "volume"),
      propertyNumber(record, "funding"),
      record.confidence,
    );

    return `(${[
      quoteSqlText(record.id),
      quoteSqlText(view.layerId),
      quoteSqlText(JSON.stringify(record.geometry)),
      quoteSqlText(JSON.stringify(record.properties)),
      quoteSqlNumber(record.confidence),
      quoteSqlText(record.reviewStatus),
      quoteSqlText(record.visibility),
      quoteSqlText(observed),
      quoteSqlBigInt(Number.isNaN(observedMs) ? null : Math.trunc(observedMs)),
      quoteSqlText(record.expiresAt),
      quoteSqlInteger(record.provenanceSummary.sourceCount),
      quoteSqlText(firstText(propertyText(record, "place_id"), propertyText(record, "placeId"))),
      quoteSqlText(firstText(propertyText(record, "category"), propertyText(record, "kind"))),
      quoteSqlText(firstText(propertyText(record, "event_type"), propertyText(record, "eventType"))),
      quoteSqlText(propertyText(record, "severity")),
      quoteSqlText(
        firstText(
          propertyText(record, "corridor"),
          propertyText(record, "road_name"),
          propertyText(record, "name"),
        ),
      ),
      quoteSqlText(
        firstText(
          propertyText(record, "source_tier"),
          propertyText(record, "trust_tier"),
          propertyText(record, "tier"),
        ),
      ),
      quoteSqlText(
        firstText(
          propertyText(record, "freshness"),
          propertyText(record, "freshness_label"),
          propertyText(record, "updated_at"),
        ),
      ),
      quoteSqlText(firstText(propertyText(record, "status"), record.reviewStatus)),
      quoteSqlText(
        firstText(
          propertyText(record, "funding_status"),
          propertyText(record, "fundingStatus"),
        ),
      ),
      quoteSqlInteger(year),
      quoteSqlText(year === null ? null : `${Math.floor(year / 10) * 10}s`),
      quoteSqlNumber(numericValue),
    ].join(", ")})`;
  };
}

function propertyText(record: LayerRecord, key: string): string | null {
  const value = record.properties[key];
  if (value == null) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return null;
}

function propertyNumber(record: LayerRecord, key: string): number | null {
  const value = record.properties[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function firstText(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim() !== "") return value;
  }
  return null;
}

function firstNumber(...values: Array<number | null | undefined>): number | null {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return null;
}

function yearFromRecord(record: LayerRecord, observed: string | null): number | null {
  const explicitYear = propertyNumber(record, "year");
  if (explicitYear !== null) return Math.trunc(explicitYear);
  if (!observed) return null;
  const match = observed.match(/\b(\d{4})\b/);
  return match ? Number(match[1]) : null;
}

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function quoteSqlText(value: string | null | undefined): string {
  if (value == null) return "NULL";
  return `'${value.replaceAll("'", "''")}'`;
}

function quoteSqlNumber(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "NULL";
  return String(value);
}

function quoteSqlInteger(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "NULL";
  return String(Math.trunc(value));
}

function quoteSqlBigInt(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "NULL";
  return String(Math.trunc(value));
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
