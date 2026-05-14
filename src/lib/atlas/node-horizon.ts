import type {
  AtlasCapability,
  AtlasFederationStatus,
  NodeCatalogEntry,
} from "@/lib/atlas/contracts";
import { getStaticAtlasPackage } from "@/lib/atlas/static-package";

export type NodeHorizonEntry = {
  atlasId: string;
  name: string;
  relation: NodeCatalogEntry["relation"];
  relationLabel: string;
  scopeLabel: string;
  statusLabel: string;
  description: string;
  freshnessLabel: string;
  directionLabel: string;
  sourceCountLabel: string;
  contributionStatus: string;
  maintainerLabel: string;
  capabilityLabels: string[];
  manifestAvailable: boolean;
  compareAvailable: boolean;
};

const CAPABILITY_LABELS: Record<AtlasCapability, string> = {
  static_only: "Static package",
  accepts_contributions: "Contributions",
  has_review_queue: "Review queue",
  has_provenance_graph: "Evidence graph",
  has_scene_manifests: "Scene manifests",
  has_lost_buildings: "Lost Flint",
  has_safety_lab: "Safety lab",
  has_interventions: "Interventions",
  has_public_api: "Public API",
  has_ml_predictions: "ML advisory",
};

const FEDERATION_STATUS_LABELS: Record<AtlasFederationStatus, string> = {
  seed: "seed node",
  active: "active",
  stale: "stale",
  candidate: "candidate",
  archived: "archived",
};

const RELATION_LABELS: Record<NodeCatalogEntry["relation"], string> = {
  self: "current node",
  parent: "parent horizon",
  child: "child candidate",
  neighbor: "neighbor node",
};

const SCOPE_LABELS: Record<NodeCatalogEntry["scope_type"], string> = {
  neighborhood: "neighborhood",
  city: "city",
  county: "county",
  region: "region",
  state: "state",
  corridor: "corridor",
  watershed: "watershed",
  custom: "custom",
};

function dateLabel(value: string | null): string | null {
  if (!value) return null;
  return value.slice(0, 10);
}

function sourceCountLabel(value: number | undefined): string {
  if (typeof value !== "number") return "source package planned";
  return value === 1 ? "1 source" : `${value} sources`;
}

export function getNodeHorizonEntries(): NodeHorizonEntry[] {
  const { nodeCatalog } = getStaticAtlasPackage();

  return nodeCatalog.nodes
    .filter((node) => node.relation !== "self")
    .map((node) => {
      const updatedAt = dateLabel(node.last_updated_at);
      const capabilityLabels = node.capabilities
        .slice(0, 3)
        .map((capability) => CAPABILITY_LABELS[capability] ?? capability);

      return {
        atlasId: node.atlas_id,
        name: node.name,
        relation: node.relation,
        relationLabel: RELATION_LABELS[node.relation],
        scopeLabel: SCOPE_LABELS[node.scope_type],
        statusLabel: FEDERATION_STATUS_LABELS[node.federation_status],
        description:
          node.description ??
          "Candidate atlas node awaiting a promoted public manifest.",
        freshnessLabel:
          node.freshness_label ??
          (updatedAt ? `updated ${updatedAt}` : "manifest planned"),
        directionLabel: [node.distance_label, node.direction_label]
          .filter(Boolean)
          .join(" ")
          .trim(),
        sourceCountLabel: sourceCountLabel(node.source_count),
        contributionStatus:
          node.contribution_status ?? "contribution policy planned",
        maintainerLabel: node.maintainer_label ?? "maintainer planned",
        capabilityLabels,
        manifestAvailable: node.manifest_url !== null,
        compareAvailable: node.compare_available === true,
      };
    });
}
