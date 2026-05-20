// Subset of the full Anthropic Pascal-tree spec; see docs/plans/lane-4-strategic-seams/ for deferred branches (Opening generation, multi-side facades, multi-level levels, Ornament subtree, OpeningOverride round-trip).
import type {
  HistoricalReconstruction,
  RoofForm,
} from "@/lib/atlas/historical-reconstruction";

export type ReconstructionNodeId = string;

export type ReconstructionNodeType =
  | "site"
  | "building"
  | "level"
  | "mass"
  | "facade"
  | "opening_grid"
  | "ground_floor"
  | "roof"
  | "texture_face";

export type ReconstructionPartKind =
  | "mass"
  | "facade"
  | "opening_grid"
  | "ground_floor"
  | "roof"
  | "texture_face";

export type TextureSource =
  | "photo_conditioned"
  | "lora_only"
  | "moderator_painted"
  | "untextured";

export type TextureProvenance = {
  texture_source: TextureSource;
  lora_archetype: string | null;
  lora_weight: number | null;
  controlnet_conditioning_source: string | null;
  texture_confidence: number | null;
};

export type ReconstructionNodeMetadata = {
  reconstructionId: string;
  civicObjectId: string | null;
  label: string;
  sourceIds: readonly string[];
  confidence: number | null;
  editable: boolean;
};

type ReconstructionNodeBase<TType extends ReconstructionNodeType, TData> = {
  id: ReconstructionNodeId;
  type: TType;
  parentId: ReconstructionNodeId | null;
  children: ReconstructionNodeId[];
  visible: boolean;
  metadata: ReconstructionNodeMetadata;
  data: TData;
};

export type SiteNode = ReconstructionNodeBase<
  "site",
  {
    site_id: string;
    label: string;
    position: [number, number] | null;
  }
>;

export type BuildingNode = ReconstructionNodeBase<
  "building",
  {
    civic_object_id: string;
    name: string;
    description: string;
    position: [number, number];
    bearing_deg: number;
    time_start: string | null;
    time_end: string | null;
  }
>;

export type LevelNode = ReconstructionNodeBase<
  "level",
  {
    level_index: number;
    elevation_m: number;
    height_m: number;
  }
>;

export type MassNode = ReconstructionNodeBase<
  "mass",
  {
    footprint: { width_m: number; depth_m: number };
    height_m: number;
    confidence: number;
  }
>;

export type FacadeNode = ReconstructionNodeBase<
  "facade",
  {
    face: "primary";
    confidence: number;
  }
>;

export type OpeningGridNode = ReconstructionNodeBase<
  "opening_grid",
  {
    face: "primary";
    bay_count: number | null;
    confidence: number | null;
  }
>;

export type GroundFloorNode = ReconstructionNodeBase<
  "ground_floor",
  {
    face: "primary";
    confidence: number;
  }
>;

export type RoofNode = ReconstructionNodeBase<
  "roof",
  {
    form: RoofForm;
    confidence: number;
  }
>;

export type TextureFaceNode = ReconstructionNodeBase<
  "texture_face",
  {
    target_part_id: ReconstructionNodeId;
    face: "facade_primary" | "ground_floor_primary" | "roof";
    texture_provenance: TextureProvenance;
  }
>;

export type ReconstructionSceneNode =
  | SiteNode
  | BuildingNode
  | LevelNode
  | MassNode
  | FacadeNode
  | OpeningGridNode
  | GroundFloorNode
  | RoofNode
  | TextureFaceNode;

export type ReconstructionNodeTree = {
  version: 1;
  source: "historical-reconstruction";
  rootNodeIds: ReconstructionNodeId[];
  nodes: Record<ReconstructionNodeId, ReconstructionSceneNode>;
};

export type ReconstructionNodePatch =
  | { op: "add"; node: ReconstructionSceneNode }
  | { op: "remove"; nodeId: ReconstructionNodeId }
  | {
      op: "update";
      nodeId: ReconstructionNodeId;
      before: ReconstructionSceneNode;
      after: ReconstructionSceneNode;
    };

export type ReconstructionNodeTreeOptions = {
  siteId?: string;
  siteLabel?: string;
};

const DEFAULT_SITE_ID = "site:lost-flint";
const DEFAULT_SITE_LABEL = "Lost Flint reconstructions";
const DEFAULT_ROOF_FORM: RoofForm = "flat";

const UNTEXTURED_PROVENANCE: TextureProvenance = {
  texture_source: "untextured",
  lora_archetype: null,
  lora_weight: null,
  controlnet_conditioning_source: null,
  texture_confidence: null,
};

export function createReconstructionNodeTree(
  reconstructions: readonly HistoricalReconstruction[],
  options: ReconstructionNodeTreeOptions = {},
): ReconstructionNodeTree {
  const siteId = options.siteId ?? DEFAULT_SITE_ID;
  const siteNodeId = siteNodeIdFor(siteId);
  const nodes: Record<ReconstructionNodeId, ReconstructionSceneNode> = {};

  const siteNode: SiteNode = {
    id: siteNodeId,
    type: "site",
    parentId: null,
    children: reconstructions.map((item) => buildingNodeIdFor(item.id)),
    visible: true,
    metadata: {
      reconstructionId: siteId,
      civicObjectId: null,
      label: options.siteLabel ?? DEFAULT_SITE_LABEL,
      sourceIds: [],
      confidence: null,
      editable: false,
    },
    data: {
      site_id: siteId,
      label: options.siteLabel ?? DEFAULT_SITE_LABEL,
      position: averagePosition(reconstructions),
    },
  };

  nodes[siteNode.id] = siteNode;

  for (const reconstruction of reconstructions) {
    for (const node of createBuildingSubtree(reconstruction, siteNode.id)) {
      nodes[node.id] = node;
    }
  }

  return {
    version: 1,
    source: "historical-reconstruction",
    rootNodeIds: [siteNode.id],
    nodes,
  };
}

export function applyNodeTreeToHistoricalReconstruction(
  reconstruction: HistoricalReconstruction,
  tree: ReconstructionNodeTree,
): HistoricalReconstruction {
  const building = tree.nodes[buildingNodeIdFor(reconstruction.id)];
  const mass = tree.nodes[partNodeIdFor(reconstruction.id, "mass")];
  const facade = tree.nodes[partNodeIdFor(reconstruction.id, "facade")];
  const groundFloor =
    tree.nodes[partNodeIdFor(reconstruction.id, "ground_floor")];
  const roof = tree.nodes[partNodeIdFor(reconstruction.id, "roof")];

  return {
    ...reconstruction,
    ...(building?.type === "building"
      ? {
          name: building.data.name,
          description: building.data.description,
          position: building.data.position,
          bearing_deg: building.data.bearing_deg,
          time_start: building.data.time_start,
          time_end: building.data.time_end,
        }
      : {}),
    ...(mass?.type === "mass"
      ? {
          footprint: mass.data.footprint,
          height_m: mass.data.height_m,
          confidence: clampConfidence(mass.data.confidence),
        }
      : {}),
    ...(facade?.type === "facade"
      ? { facade_confidence: clampConfidence(facade.data.confidence) }
      : {}),
    ...(groundFloor?.type === "ground_floor"
      ? {
          ground_floor_confidence: clampConfidence(
            groundFloor.data.confidence,
          ),
        }
      : {}),
    ...(roof?.type === "roof"
      ? {
          roof_form: roof.data.form,
          roof_confidence: clampConfidence(roof.data.confidence),
        }
      : {}),
  };
}

export function getReconstructionNodePath(
  tree: ReconstructionNodeTree,
  nodeId: ReconstructionNodeId,
): ReconstructionSceneNode[] {
  const path: ReconstructionSceneNode[] = [];
  let current: ReconstructionSceneNode | undefined = tree.nodes[nodeId];

  while (current) {
    path.unshift(current);
    current = current.parentId ? tree.nodes[current.parentId] : undefined;
  }

  return path;
}

export function diffReconstructionNodeTrees(
  before: ReconstructionNodeTree,
  after: ReconstructionNodeTree,
): ReconstructionNodePatch[] {
  const patches: ReconstructionNodePatch[] = [];
  const nodeIds = new Set([
    ...Object.keys(before.nodes),
    ...Object.keys(after.nodes),
  ]);

  for (const nodeId of [...nodeIds].sort()) {
    const beforeNode = before.nodes[nodeId];
    const afterNode = after.nodes[nodeId];

    if (!beforeNode && afterNode) {
      patches.push({ op: "add", node: afterNode });
      continue;
    }

    if (beforeNode && !afterNode) {
      patches.push({ op: "remove", nodeId });
      continue;
    }

    if (
      beforeNode &&
      afterNode &&
      JSON.stringify(beforeNode) !== JSON.stringify(afterNode)
    ) {
      patches.push({
        op: "update",
        nodeId,
        before: beforeNode,
        after: afterNode,
      });
    }
  }

  return patches;
}

function createBuildingSubtree(
  reconstruction: HistoricalReconstruction,
  siteNodeId: ReconstructionNodeId,
): ReconstructionSceneNode[] {
  const buildingId = buildingNodeIdFor(reconstruction.id);
  const levelId = partNodeIdFor(reconstruction.id, "level:0");
  const massId = partNodeIdFor(reconstruction.id, "mass");
  const facadeId = partNodeIdFor(reconstruction.id, "facade");
  const openingGridId = partNodeIdFor(reconstruction.id, "opening_grid");
  const groundFloorId = partNodeIdFor(reconstruction.id, "ground_floor");
  const roofId = partNodeIdFor(reconstruction.id, "roof");
  const facadeTextureId = textureNodeIdFor(reconstruction.id, "facade");
  const groundFloorTextureId = textureNodeIdFor(
    reconstruction.id,
    "ground_floor",
  );
  const roofTextureId = textureNodeIdFor(reconstruction.id, "roof");
  const massConfidence = clampConfidence(reconstruction.confidence);
  const facadeConfidence = clampConfidence(
    reconstruction.facade_confidence ?? massConfidence,
  );
  const groundFloorConfidence = clampConfidence(
    reconstruction.ground_floor_confidence ?? massConfidence,
  );
  const roofConfidence = clampConfidence(
    reconstruction.roof_confidence ?? massConfidence,
  );

  const commonMetadata = (
    label: string,
    confidence: number | null,
    editable: boolean,
  ): ReconstructionNodeMetadata => ({
    reconstructionId: reconstruction.id,
    civicObjectId: reconstruction.civic_object_id,
    label,
    sourceIds: reconstruction.source_ids,
    confidence,
    editable,
  });

  return [
    {
      id: buildingId,
      type: "building",
      parentId: siteNodeId,
      children: [levelId],
      visible: true,
      metadata: commonMetadata(reconstruction.name, massConfidence, true),
      data: {
        civic_object_id: reconstruction.civic_object_id,
        name: reconstruction.name,
        description: reconstruction.description,
        position: reconstruction.position,
        bearing_deg: reconstruction.bearing_deg,
        time_start: reconstruction.time_start,
        time_end: reconstruction.time_end,
      },
    },
    {
      id: levelId,
      type: "level",
      parentId: buildingId,
      children: [massId, facadeId, groundFloorId, roofId],
      visible: true,
      metadata: commonMetadata("Level 0", massConfidence, false),
      data: {
        level_index: 0,
        elevation_m: 0,
        height_m: reconstruction.height_m,
      },
    },
    {
      id: massId,
      type: "mass",
      parentId: levelId,
      children: [],
      visible: true,
      metadata: commonMetadata("Mass", massConfidence, true),
      data: {
        footprint: reconstruction.footprint,
        height_m: reconstruction.height_m,
        confidence: massConfidence,
      },
    },
    {
      id: facadeId,
      type: "facade",
      parentId: levelId,
      children: [openingGridId, facadeTextureId],
      visible: true,
      metadata: commonMetadata("Primary facade", facadeConfidence, true),
      data: {
        face: "primary",
        confidence: facadeConfidence,
      },
    },
    {
      id: openingGridId,
      type: "opening_grid",
      parentId: facadeId,
      children: [],
      visible: true,
      metadata: commonMetadata("Primary opening grid", null, true),
      data: {
        face: "primary",
        bay_count: null,
        confidence: null,
      },
    },
    {
      id: groundFloorId,
      type: "ground_floor",
      parentId: levelId,
      children: [groundFloorTextureId],
      visible: true,
      metadata: commonMetadata("Ground floor", groundFloorConfidence, true),
      data: {
        face: "primary",
        confidence: groundFloorConfidence,
      },
    },
    {
      id: roofId,
      type: "roof",
      parentId: levelId,
      children: [roofTextureId],
      visible: true,
      metadata: commonMetadata("Roof", roofConfidence, true),
      data: {
        form: reconstruction.roof_form ?? DEFAULT_ROOF_FORM,
        confidence: roofConfidence,
      },
    },
    createTextureFaceNode(
      reconstruction,
      facadeTextureId,
      facadeId,
      "facade_primary",
      "Facade texture",
    ),
    createTextureFaceNode(
      reconstruction,
      groundFloorTextureId,
      groundFloorId,
      "ground_floor_primary",
      "Ground-floor texture",
    ),
    createTextureFaceNode(
      reconstruction,
      roofTextureId,
      roofId,
      "roof",
      "Roof texture",
    ),
  ];
}

function createTextureFaceNode(
  reconstruction: HistoricalReconstruction,
  id: ReconstructionNodeId,
  parentId: ReconstructionNodeId,
  face: TextureFaceNode["data"]["face"],
  label: string,
): TextureFaceNode {
  return {
    id,
    type: "texture_face",
    parentId,
    children: [],
    visible: true,
    metadata: {
      reconstructionId: reconstruction.id,
      civicObjectId: reconstruction.civic_object_id,
      label,
      sourceIds: reconstruction.source_ids,
      confidence: null,
      editable: false,
    },
    data: {
      target_part_id: parentId,
      face,
      texture_provenance: UNTEXTURED_PROVENANCE,
    },
  };
}

function averagePosition(
  reconstructions: readonly HistoricalReconstruction[],
): [number, number] | null {
  if (reconstructions.length === 0) {
    return null;
  }

  const [longitude, latitude] = reconstructions.reduce(
    ([sumLongitude, sumLatitude], reconstruction) => [
      sumLongitude + reconstruction.position[0],
      sumLatitude + reconstruction.position[1],
    ],
    [0, 0],
  );

  return [longitude / reconstructions.length, latitude / reconstructions.length];
}

function siteNodeIdFor(siteId: string): ReconstructionNodeId {
  return `reconstruction-node:${siteId}`;
}

function buildingNodeIdFor(reconstructionId: string): ReconstructionNodeId {
  return partNodeIdFor(reconstructionId, "building");
}

function partNodeIdFor(
  reconstructionId: string,
  part: string,
): ReconstructionNodeId {
  return `reconstruction-node:${reconstructionId}:${part}`;
}

function textureNodeIdFor(
  reconstructionId: string,
  face: "facade" | "ground_floor" | "roof",
): ReconstructionNodeId {
  return partNodeIdFor(reconstructionId, `texture:${face}`);
}

function clampConfidence(value: number): number {
  if (Number.isNaN(value)) {
    return 0;
  }

  return Math.min(1, Math.max(0, value));
}
