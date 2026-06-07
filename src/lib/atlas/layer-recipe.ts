import { GeoJsonLayer } from "@deck.gl/layers";
import type { Layer as DeckLayer, PickingInfo } from "@deck.gl/core";
import type { Feature, FeatureCollection, Geometry } from "geojson";

import type { LayerRecipe, LayerRecord, LayerView } from "@/lib/atlas/contracts";
import { getAtlasMosaic } from "@/lib/atlas/mosaic";
import { getRendererBoundary } from "@/lib/atlas/renderer-registry";

type LayerFeatureProperties = LayerRecord["properties"] & {
  layerRecordId: string;
  confidence: number;
  reviewStatus: LayerRecord["reviewStatus"];
  visibility: LayerRecord["visibility"];
  observedAt: string | null;
  expiresAt: string | null;
};

export type RecipeDeckLayerOptions = {
  view: LayerView;
  recipe: LayerRecipe;
  visible?: boolean;
  pickable?: boolean;
  layerIdPrefix?: string;
  onClickRecord?: (record: LayerRecord, info: PickingInfo) => void;
};

export type LayerMosaicLoadResult = {
  tableName: string;
  recordCount: number;
};

export function layerRecordToFeature(
  record: LayerRecord,
): Feature<Geometry, LayerFeatureProperties> | null {
  if (!record.geometry) return null;
  return {
    type: "Feature",
    geometry: record.geometry,
    properties: {
      ...record.properties,
      layerRecordId: record.id,
      confidence: record.confidence,
      reviewStatus: record.reviewStatus,
      visibility: record.visibility,
      observedAt: record.observedAt,
      expiresAt: record.expiresAt,
    },
  };
}

export function layerViewToFeatureCollection(
  view: LayerView,
): FeatureCollection<Geometry, LayerFeatureProperties> {
  return {
    type: "FeatureCollection",
    features: view.records
      .map(layerRecordToFeature)
      .filter((feature): feature is Feature<Geometry, LayerFeatureProperties> =>
        feature !== null
      ),
  };
}

export function createDeckLayerFromRecipe({
  view,
  recipe,
  visible = true,
  pickable = true,
  layerIdPrefix = "layer-recipe",
  onClickRecord,
}: RecipeDeckLayerOptions): DeckLayer | null {
  const boundary = getRendererBoundary(recipe.displayEncoding.rendererBoundaryId);
  if (!boundary || boundary.runtime !== "deck.gl") return null;
  if (recipe.displayEncoding.deckGlLayerType !== "GeoJsonLayer") return null;

  const data = layerViewToFeatureCollection(view);
  const byId = new Map(view.records.map((record) => [record.id, record]));

  return new GeoJsonLayer<LayerFeatureProperties>({
    id: `${layerIdPrefix}-${recipe.id}`,
    data,
    visible,
    pickable,
    stroked: true,
    filled: true,
    pointType: "circle",
    getFillColor: ({ properties }) => colorForFeature(properties, recipe),
    getLineColor: ({ properties }) => colorForFeature(properties, recipe),
    getLineWidth: ({ properties }) => widthForFeature(properties, recipe),
    getPointRadius: ({ properties }) => pointRadiusForFeature(properties, recipe),
    lineWidthMinPixels: 1,
    pointRadiusUnits: "pixels",
    pointRadiusMinPixels: 3,
    pointRadiusMaxPixels: 14,
    onClick: (info) => {
      if (!onClickRecord) return false;
      const id = (info.object as Feature<Geometry, LayerFeatureProperties> | undefined)
        ?.properties?.layerRecordId;
      if (!id) return false;
      const record = byId.get(id);
      if (!record) return false;
      onClickRecord(record, info);
      return true;
    },
  });
}

export async function loadLayerViewIntoMosaic(
  view: LayerView,
  tableName = tableNameForLayer(view.layerId),
): Promise<LayerMosaicLoadResult> {
  const mosaic = await getAtlasMosaic();
  const table = quoteIdentifier(tableName);
  await mosaic.conn.query(`DROP TABLE IF EXISTS ${table}`);
  await mosaic.conn.query(`
    CREATE TABLE ${table} (
      id VARCHAR,
      geometry_json VARCHAR,
      properties_json VARCHAR,
      confidence DOUBLE,
      review_status VARCHAR,
      visibility VARCHAR,
      observed_at VARCHAR,
      expires_at VARCHAR
    )
  `);

  if (view.records.length === 0) {
    return { tableName, recordCount: 0 };
  }

  const values = view.records
    .map((record) =>
      [
        quoteSqlLiteral(record.id),
        quoteSqlLiteral(JSON.stringify(record.geometry)),
        quoteSqlLiteral(JSON.stringify(record.properties)),
        Number.isFinite(record.confidence) ? String(record.confidence) : "0",
        quoteSqlLiteral(record.reviewStatus),
        quoteSqlLiteral(record.visibility),
        quoteSqlLiteral(record.observedAt),
        quoteSqlLiteral(record.expiresAt),
      ].join(", ")
    )
    .map((row) => `(${row})`)
    .join(",\n");

  await mosaic.conn.query(`INSERT INTO ${table} VALUES ${values}`);
  return { tableName, recordCount: view.records.length };
}

export function tableNameForLayer(layerId: string): string {
  return `layer_${layerId.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "")}`;
}

function colorForFeature(
  properties: LayerFeatureProperties,
  recipe: LayerRecipe,
): [number, number, number, number] {
  const field = recipe.displayEncoding.colorField;
  const raw = field ? properties[field] : null;
  const confidence = recipe.displayEncoding.opacityByConfidence
    ? clamp01(properties.confidence)
    : 1;
  const alpha = Math.round(70 + confidence * 170);

  if (field === "category" && typeof raw === "string") {
    return categoryColor(raw, alpha);
  }

  const value = typeof raw === "number" ? raw : Number(raw);
  if (Number.isFinite(value)) {
    if (value >= 0.66) return [193, 74, 44, alpha];
    if (value >= 0.33) return [217, 162, 59, alpha];
    return [56, 132, 95, alpha];
  }

  return properties.confidence < 0.65
    ? [102, 112, 122, alpha]
    : [50, 110, 158, alpha];
}

function categoryColor(category: string, alpha: number): [number, number, number, number] {
  switch (category) {
    case "music":
      return [217, 162, 59, alpha];
    case "vendor":
      return [99, 56, 142, alpha];
    case "parking":
      return [193, 74, 44, alpha];
    case "restroom":
      return [56, 132, 95, alpha];
    case "food_court":
      return [50, 110, 158, alpha];
    default:
      return [120, 120, 130, alpha];
  }
}

function widthForFeature(
  properties: LayerFeatureProperties,
  recipe: LayerRecipe,
): number {
  const value = recipe.displayEncoding.scaleField
    ? Number(properties[recipe.displayEncoding.scaleField])
    : NaN;
  if (!Number.isFinite(value)) return 3;
  return Math.max(2, Math.min(10, 2 + Math.sqrt(value) / 18));
}

function pointRadiusForFeature(
  properties: LayerFeatureProperties,
  recipe: LayerRecipe,
): number {
  const value = recipe.displayEncoding.scaleField
    ? Number(properties[recipe.displayEncoding.scaleField])
    : NaN;
  if (!Number.isFinite(value)) return 6;
  return Math.max(4, Math.min(14, 4 + Math.sqrt(value) / 20));
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function quoteSqlLiteral(value: string | null): string {
  if (value === null) return "NULL";
  return `'${value.replaceAll("'", "''")}'`;
}
