/**
 * Atelier fallback dossier synthesizer.
 *
 * When the GraphQL resolver `reconstructionDossier(id)` is unreachable
 * (development without the Axum sidecar running, schema errors before the
 * backend implements the new fields), this module produces a deterministic
 * `ReconstructionDossierQuery['reconstructionDossier']`-shaped payload
 * from the in-repo `FLINT_LOST_RECONSTRUCTIONS` fixture.
 *
 * Honesty contract (per project CLAUDE.md "No Fake UI" and atelier spec
 * line 76 "If the parcel is evidence-poor, fewer cards appear and the
 * user sees that scarcity directly"):
 *
 *   - Source cards are derived ONLY from the fixture's real `source_ids`.
 *     No fake sources are added to fill a card grid.
 *   - Per-part confidences come from the fixture (Mass/Facade/Roof/GF
 *     values authored to mirror the backend migration 0004).
 *   - Conflicts default to an empty array. The fixture does not encode
 *     structured source disagreement; surfacing fake conflicts would
 *     violate the no-fake-UI rule.
 *   - Block subgraph neighbors are the OTHER Carriage Town buildings in
 *     the fixture (geographic adjacency is a fact of the data).
 *   - Node tree is generated from the existing `createReconstructionNodeTree`
 *     adapter.
 *
 * This module is dev-only (controlled by callers' `fallback: true` option);
 * production paths never invoke it.
 */

import {
  FLINT_LOST_RECONSTRUCTIONS,
  type HistoricalReconstruction,
} from "@/lib/atlas/historical-reconstruction";
import { createReconstructionNodeTree } from "@/lib/atlas/reconstruction-node-tree";
import type {
  EvidenceType,
  ReconstructionDossierQuery,
  RoofForm,
  SourceType,
  TrustTier,
} from "@/lib/api/graphql/generated/graphql";

type SyntheticDossier =
  ReconstructionDossierQuery["reconstructionDossier"];

type SyntheticEvidenceItem = SyntheticDossier["evidence"]["items"][number];
type SyntheticSource = SyntheticEvidenceItem["source"];
type SyntheticReconstruction = SyntheticDossier["reconstruction"];

/**
 * Source-id namespace -> (EvidenceType, display name builder). The
 * fixture uses URN-style ids like `loc:sanborn:flint:1899:s18`,
 * `habs:mi-318`, `genesee:stockton-genealogy`, `sloan:storefront-1925`.
 * Each prefix maps to a real-world source class.
 */
const SOURCE_ID_REGISTRY: Array<{
  prefix: string;
  evidenceType: EvidenceType;
  sourceType: SourceType;
  trustTier: TrustTier;
  buildName(parts: string[]): string;
  buildSummary(parts: string[]): string;
  buildDateLabel(parts: string[]): string | null;
  homepageUrl: string | null;
}> = [
  {
    prefix: "loc:sanborn",
    evidenceType: "SANBORN" as EvidenceType,
    sourceType: "HISTORICAL_ARCHIVE" as SourceType,
    trustTier: "HIGH" as TrustTier,
    buildName: (parts) =>
      `Library of Congress Sanborn ${parts[2] ?? "city"} ${parts[3] ?? "n.d."} sheet ${(parts[4] ?? "").replace(/^s/, "")}`,
    buildSummary: (parts) =>
      `Sanborn fire-insurance map sheet ${(parts[4] ?? "").replace(/^s/, "")}, surveyed ${parts[3] ?? "n.d."}. Documents building footprint, story count, and material classification.`,
    buildDateLabel: (parts) => parts[3] ?? null,
    homepageUrl: "https://www.loc.gov/collections/sanborn-maps/",
  },
  {
    prefix: "habs",
    evidenceType: "HABS_RECORD" as EvidenceType,
    sourceType: "HISTORICAL_ARCHIVE" as SourceType,
    trustTier: "HIGH" as TrustTier,
    buildName: (parts) => `HABS ${(parts[1] ?? "").toUpperCase()}`,
    buildSummary: () =>
      "Historic American Buildings Survey field record. Includes measured drawings, photographs, and historical documentation.",
    buildDateLabel: () => null,
    homepageUrl: "https://www.loc.gov/collections/historic-american-buildings-landscapes-and-engineering-record/",
  },
  {
    prefix: "sloan",
    evidenceType: "PHOTOGRAPH" as EvidenceType,
    sourceType: "PHOTO_ARCHIVE" as SourceType,
    trustTier: "MEDIUM" as TrustTier,
    buildName: (parts) => `Sloan Photograph Collection ${parts[1] ?? ""}`,
    buildSummary: (parts) => {
      const yearMatch = (parts[1] ?? "").match(/\d{4}/);
      return `Period photograph from the Sloan collection${
        yearMatch ? `, ${yearMatch[0]}` : ""
      }. Documents facade, ground-floor storefront, and immediate streetscape.`;
    },
    buildDateLabel: (parts) => {
      const yearMatch = (parts[1] ?? "").match(/\d{4}/);
      return yearMatch ? yearMatch[0] : null;
    },
    homepageUrl: null,
  },
  {
    prefix: "genesee",
    evidenceType: "CITY_DIRECTORY" as EvidenceType,
    sourceType: "PUBLIC_RECORD" as SourceType,
    trustTier: "MEDIUM" as TrustTier,
    buildName: (parts) => `Genesee County Records · ${(parts[1] ?? "").replace(/-/g, " ")}`,
    buildSummary: () =>
      "Genealogy and property record from Genesee County public archives. Includes household roster and parcel transfer history.",
    buildDateLabel: () => null,
    homepageUrl: null,
  },
];

const UNKNOWN_REGISTRY_ENTRY = {
  evidenceType: "OTHER" as EvidenceType,
  sourceType: "PUBLIC_RECORD" as SourceType,
  trustTier: "LOW" as TrustTier,
};

function classifySourceId(sourceId: string) {
  const parts = sourceId.split(":");
  const prefix = parts.slice(0, 2).join(":");
  const direct = SOURCE_ID_REGISTRY.find((entry) => prefix.startsWith(entry.prefix));
  if (direct) {
    return {
      ...direct,
      name: direct.buildName(parts),
      summary: direct.buildSummary(parts),
      dateLabel: direct.buildDateLabel(parts),
    };
  }
  return {
    ...UNKNOWN_REGISTRY_ENTRY,
    name: sourceId,
    summary: `Source ${sourceId}. Type classification not yet available.`,
    dateLabel: null,
    homepageUrl: null,
  };
}

function reconstructionRoofFormToGraphql(
  roofForm: HistoricalReconstruction["roof_form"],
): RoofForm | null {
  if (!roofForm) return null;
  switch (roofForm) {
    case "flat":
      return "FLAT";
    case "gable":
      return "GABLE";
    case "hipped":
      return "HIPPED";
  }
}

function reconstructionToGraphql(
  reconstruction: HistoricalReconstruction,
): SyntheticReconstruction {
  return {
    id: reconstruction.id,
    civicObjectId: reconstruction.civic_object_id,
    name: reconstruction.name,
    description: reconstruction.description,
    position: reconstruction.position,
    footprint: {
      widthMeters: reconstruction.footprint.width_m,
      depthMeters: reconstruction.footprint.depth_m,
    },
    heightMeters: reconstruction.height_m,
    bearingDegrees: reconstruction.bearing_deg,
    confidence: reconstruction.confidence,
    facadeConfidence: reconstruction.facade_confidence ?? null,
    roofConfidence: reconstruction.roof_confidence ?? null,
    groundFloorConfidence: reconstruction.ground_floor_confidence ?? null,
    roofForm: reconstructionRoofFormToGraphql(reconstruction.roof_form),
    timeStart: reconstruction.time_start,
    timeEnd: reconstruction.time_end,
    geometryUrl: reconstruction.geometry_url,
    geometryFormat: null,
    foundryAssetUrl: reconstruction.foundry_asset_url,
    sources: reconstruction.source_ids.map((sourceId) => {
      const classification = classifySourceId(sourceId);
      return {
        id: sourceId,
        name: classification.name,
        homepageUrl: classification.homepageUrl,
        sourceType: classification.sourceType,
        trustTier: classification.trustTier,
        lastChecked: null,
        knownLimits: [],
      } satisfies SyntheticSource;
    }),
  };
}

function buildEvidenceItems(
  reconstruction: HistoricalReconstruction,
): SyntheticEvidenceItem[] {
  return reconstruction.source_ids.map((sourceId, index) => {
    const classification = classifySourceId(sourceId);
    const targetNodeId =
      classification.evidenceType === "SANBORN" || classification.evidenceType === "HABS_RECORD"
        ? `reconstruction-node:${reconstruction.id}:mass`
        : classification.evidenceType === "PHOTOGRAPH"
          ? `reconstruction-node:${reconstruction.id}:facade`
          : classification.evidenceType === "CITY_DIRECTORY"
            ? `reconstruction-node:${reconstruction.id}:ground_floor`
            : null;
    return {
      id: `evidence:${reconstruction.id}:${index}`,
      reconstructionId: reconstruction.id,
      evidenceType: classification.evidenceType,
      targetNodeId,
      confidence: Math.max(0, Math.min(1, reconstruction.confidence)),
      thumbnailUrl: null,
      summary: classification.summary,
      sourceDateLabel: classification.dateLabel,
      source: {
        id: sourceId,
        name: classification.name,
        homepageUrl: classification.homepageUrl,
        sourceType: classification.sourceType,
        trustTier: classification.trustTier,
        lastChecked: null,
        knownLimits: [],
      },
    };
  });
}

function buildBlockSubgraph(
  focus: HistoricalReconstruction,
): SyntheticDossier["blockSubgraph"] {
  const others = FLINT_LOST_RECONSTRUCTIONS.filter(
    (item) => item.id !== focus.id,
  );

  return {
    reconstructionId: focus.id,
    neighbors: others.map((neighbor) => {
      const dx = neighbor.position[0] - focus.position[0];
      const dy = neighbor.position[1] - focus.position[1];
      const distance = Math.sqrt(dx * dx + dy * dy);
      const strength = Math.max(0.1, Math.min(0.95, 1 - distance * 100));
      const relation: string = distance < 0.0006 ? "adjacent_to" : "same_block_as";
      return {
        relation,
        strength,
        reconstruction: {
          id: neighbor.id,
          civicObjectId: neighbor.civic_object_id,
          name: neighbor.name,
          position: neighbor.position,
          confidence: neighbor.confidence,
          timeStart: neighbor.time_start,
          timeEnd: neighbor.time_end,
        },
      };
    }),
  };
}

function summarizeForDossier(reconstruction: HistoricalReconstruction): string {
  const sourceCount = reconstruction.source_ids.length;
  const sourceWord = sourceCount === 1 ? "source" : "sources";
  const eraText = reconstruction.time_start
    ? `built ${reconstruction.time_start}`
    : "construction date unrecorded";
  const endText = reconstruction.time_end
    ? `, demolished ${reconstruction.time_end}`
    : reconstruction.time_start
      ? ", still standing"
      : "";
  return `${reconstruction.name}, ${eraText}${endText}. Backed by ${sourceCount} ${sourceWord}.`;
}

/**
 * Build a synthetic `ReconstructionDossierQuery['reconstructionDossier']`
 * from the in-repo fixture. Used by `useReconstructionDossier` when the
 * GraphQL resolver is unreachable in development.
 *
 * Returns null when `reconstructionId` is not in the fixture; callers
 * should treat that as "no data" rather than constructing a fake.
 */
export function synthesizeDossierFromFixture(
  reconstructionId: string,
): SyntheticDossier | null {
  const reconstruction = FLINT_LOST_RECONSTRUCTIONS.find(
    (item) => item.id === reconstructionId,
  );
  if (!reconstruction) return null;

  const nodeTree = createReconstructionNodeTree([reconstruction]);

  return {
    reconstruction: reconstructionToGraphql(reconstruction),
    evidence: {
      reconstructionId: reconstruction.id,
      totalCount: reconstruction.source_ids.length,
      items: buildEvidenceItems(reconstruction),
    },
    conflicts: [],
    blockSubgraph: buildBlockSubgraph(reconstruction),
    nodeTree: nodeTree as unknown as Record<string, unknown>,
    summary: summarizeForDossier(reconstruction),
    debug: { source: "fallback-synthesizer" },
  };
}
