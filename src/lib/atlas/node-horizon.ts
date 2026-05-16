import type {
  AtlasCapability,
  AtlasFederationStatus,
  NodeCatalogEntry,
} from "@/lib/atlas/contracts";
import { getStaticAtlasPackage } from "@/lib/atlas/static-package";

export type AtlasNodeSummary = {
  atlasId: string;
  name: string;
  detailHref: string;
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
  compareHref: string | null;
};

export type NodeHorizonEntry = AtlasNodeSummary & {
  distanceLabel: string | null;
  bearingLabel: string | null;
  directionDegrees: number | null;
  normalizedDistance: number;
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

function nodeHref(atlasId: string): string {
  return `/open-flint-atlas/node/${encodeURIComponent(atlasId)}`;
}

function sceneCompareHref(atlasId: string): string {
  return `/open-flint-atlas?compare=${encodeURIComponent(atlasId)}#node-horizon`;
}

function parseDirectionDegrees(
  directionLabel: string | null,
  relation: NodeCatalogEntry["relation"],
): number | null {
  const value = directionLabel?.trim().toLowerCase() ?? "";
  if (value.length === 0) {
    return relation === "parent" ? 0 : null;
  }

  const compassMap: Array<[string, number]> = [
    ["northwest", 315],
    ["northeast", 45],
    ["southwest", 225],
    ["southeast", 135],
    ["north", 0],
    ["east", 90],
    ["south", 180],
    ["west", 270],
  ];

  for (const [token, degrees] of compassMap) {
    if (value.includes(token)) {
      return degrees;
    }
  }

  if (value.includes("parent")) {
    return 0;
  }

  return relation === "child" ? 270 : null;
}

function parseDistanceMiles(distanceLabel: string | null): number | null {
  if (!distanceLabel) return null;
  const match = distanceLabel.match(/(\d+(?:\.\d+)?)\s*mi\b/i);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeDistance(
  distanceLabel: string | null,
  relation: NodeCatalogEntry["relation"],
): number {
  const miles = parseDistanceMiles(distanceLabel);
  if (miles !== null) {
    const scaled = 0.46 + (Math.log1p(miles) / Math.log1p(80)) * 0.42;
    return Math.max(0.44, Math.min(0.9, scaled));
  }

  const lower = distanceLabel?.toLowerCase() ?? "";
  if (lower.includes("inside flint")) return 0.4;
  if (lower.includes("statewide")) return 0.9;
  if (relation === "child") return 0.46;
  if (relation === "parent") return 0.82;
  return 0.62;
}

function buildNodeHorizonEntry(node: NodeCatalogEntry): NodeHorizonEntry | null {
  const atlasId = node.atlas_id.trim();
  if (atlasId.length === 0) return null;

  const updatedAt = dateLabel(node.last_updated_at);
  const distanceLabel = node.distance_label ?? null;
  const bearingLabel = node.direction_label ?? null;
  const capabilityLabels = node.capabilities
    .slice(0, 3)
    .map((capability) => CAPABILITY_LABELS[capability] ?? capability);
  const compareAvailable = node.compare_available === true;

  return {
    atlasId,
    name: node.name,
    detailHref: nodeHref(atlasId),
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
    directionLabel: [distanceLabel, bearingLabel]
      .filter(Boolean)
      .join(" ")
      .trim(),
    distanceLabel,
    bearingLabel,
    directionDegrees: parseDirectionDegrees(bearingLabel, node.relation),
    normalizedDistance: normalizeDistance(distanceLabel, node.relation),
    sourceCountLabel: sourceCountLabel(node.source_count),
    contributionStatus:
      node.contribution_status ?? "contribution policy planned",
    maintainerLabel: node.maintainer_label ?? "maintainer planned",
    capabilityLabels,
    manifestAvailable: node.manifest_url !== null,
    compareAvailable,
    compareHref: compareAvailable ? sceneCompareHref(atlasId) : null,
  };
}

export function getCurrentAtlasNodeSummary(): AtlasNodeSummary | null {
  const { nodeCatalog } = getStaticAtlasPackage();
  const currentNode =
    nodeCatalog.nodes.find((node) => node.relation === "self") ??
    nodeCatalog.nodes[0];
  const entry = currentNode ? buildNodeHorizonEntry(currentNode) : null;
  if (!entry) return null;
  return {
    atlasId: entry.atlasId,
    name: entry.name,
    detailHref: entry.detailHref,
    relation: entry.relation,
    relationLabel: entry.relationLabel,
    scopeLabel: entry.scopeLabel,
    statusLabel: entry.statusLabel,
    description: entry.description,
    freshnessLabel: entry.freshnessLabel,
    directionLabel: entry.directionLabel,
    sourceCountLabel: entry.sourceCountLabel,
    contributionStatus: entry.contributionStatus,
    maintainerLabel: entry.maintainerLabel,
    capabilityLabels: entry.capabilityLabels,
    manifestAvailable: entry.manifestAvailable,
    compareAvailable: entry.compareAvailable,
    compareHref: entry.compareHref,
  };
}

export function getAtlasNodeSummary(atlasId: string): AtlasNodeSummary | null {
  const { nodeCatalog } = getStaticAtlasPackage();
  const match = nodeCatalog.nodes.find((node) => node.atlas_id === atlasId);
  const entry = match ? buildNodeHorizonEntry(match) : null;
  if (!entry) return null;
  return {
    atlasId: entry.atlasId,
    name: entry.name,
    detailHref: entry.detailHref,
    relation: entry.relation,
    relationLabel: entry.relationLabel,
    scopeLabel: entry.scopeLabel,
    statusLabel: entry.statusLabel,
    description: entry.description,
    freshnessLabel: entry.freshnessLabel,
    directionLabel: entry.directionLabel,
    sourceCountLabel: entry.sourceCountLabel,
    contributionStatus: entry.contributionStatus,
    maintainerLabel: entry.maintainerLabel,
    capabilityLabels: entry.capabilityLabels,
    manifestAvailable: entry.manifestAvailable,
    compareAvailable: entry.compareAvailable,
    compareHref: entry.compareHref,
  };
}

export function getNodeHorizonEntries(): NodeHorizonEntry[] {
  const { nodeCatalog } = getStaticAtlasPackage();

  return nodeCatalog.nodes.flatMap((node) => {
    if (node.relation === "self") return [];
    const entry = buildNodeHorizonEntry(node);
    return entry ? [entry] : [];
  });
}
