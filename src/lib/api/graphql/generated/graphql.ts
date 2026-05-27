/* eslint-disable */
/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type BboxInput = {
  east: number;
  north: number;
  south: number;
  west: number;
};

export type BookmarkCreateInput = {
  bearing?: number | null | undefined;
  centerLat: number;
  centerLng: number;
  eventSlug: string;
  name: string;
  pitch?: number | null | undefined;
  zoom: number;
};

export type BookmarkDeleteInput = {
  bookmarkId: string | number;
  expectedVersion: number;
};

export type BookmarkUpdateInput = {
  bearing?: number | null | undefined;
  bookmarkId: string | number;
  centerLat?: number | null | undefined;
  centerLng?: number | null | undefined;
  expectedVersion: number;
  name?: string | null | undefined;
  pitch?: number | null | undefined;
  zoom?: number | null | undefined;
};

export type CreatePlacementNoteInput = {
  body: string;
  placementId: string | number;
};

export type DeletePlacementNoteInput = {
  noteId: string | number;
};

export type EvidenceType =
  | 'CITY_DIRECTORY'
  | 'DIRECTORY'
  | 'HABS_RECORD'
  | 'OTHER'
  | 'PHOTOGRAPH'
  | 'PLAT_MAP'
  | 'SANBORN'
  | 'TEXT_MENTION';

/** Geometry artifact formats the renderer understands. */
export type GeometryFormat =
  | 'GLB'
  | 'GLTF'
  | 'PLY'
  | 'SPLAT'
  | 'USD'
  | 'USDZ';

export type ObservationInput = {
  /** Required for receipt issuance. Stays private; never reaches public read model. */
  contributorEmail: string;
  /** High-level observation category (e.g. condition_update, source_correction). */
  observationType: string;
  /** Optional place this observation is about. */
  placeId?: string | number | null | undefined;
  /** Optional public URLs the contributor cites as backing. */
  sourceUrls?: Array<string> | null | undefined;
  /** Resident-written summary. Will be reviewer-rewritten before publication. */
  summary: string;
};

export type PlaceType =
  | 'BUILDING'
  | 'CITY'
  | 'CORRIDOR'
  | 'DISTRICT'
  | 'INFRASTRUCTURE'
  | 'NEIGHBORHOOD'
  | 'PARCEL'
  | 'PARK'
  | 'WARD';

export type PlacementCreateInput = {
  category: string;
  eventSlug: string;
  geometry: Record<string, unknown>;
  label: string;
  notes?: string | null | undefined;
  status?: string | null | undefined;
  sublabel?: string | null | undefined;
};

export type PlacementDeleteInput = {
  expectedVersion: number;
  placementId: string | number;
};

export type PlacementUpdateInput = {
  category?: string | null | undefined;
  expectedVersion: number;
  geometry?: Record<string, unknown> | null | undefined;
  label?: string | null | undefined;
  notes?: string | null | undefined;
  placementId: string | number;
  status?: string | null | undefined;
  sublabel?: string | null | undefined;
};

/**
 * A source selected from civicResearch and promoted into the tenant-scoped
 * artifact store. The resolver attaches TenantContext server-side and writes
 * to the backend artifacts + artifact_anchors tables; the browser never sends
 * service-tier credentials.
 */
export type ResearchArtifactPromotionInput = {
  /** Optional WKT geometry anchor. */
  anchorGeometryWkt?: string | null | undefined;
  /** Anchor family. Defaults to `research`. */
  anchorKind?: string | null | undefined;
  /** JSON object persisted on artifact_anchors.payload_jsonb. */
  anchorPayload?: Record<string, unknown> | null | undefined;
  /** Optional end of the source's applicability window. */
  anchorTimeEnd?: string | null | undefined;
  /** Optional start of the source's applicability window. */
  anchorTimeStart?: string | null | undefined;
  /**
   * Optional stable key. When omitted, the resolver derives a deterministic
   * research:<source-or-run>:<hash> key so repeat promotions upsert.
   */
  artifactKey?: string | number | null | undefined;
  /** Optional building UUID for already-resolved backend objects. */
  buildingId?: string | number | null | undefined;
  /** Optional building-part UUID for already-resolved backend objects. */
  buildingPartId?: string | number | null | undefined;
  /**
   * Optional candidate id returned by civicResearch.candidateSources. The
   * resolver records it in metadata only; it does not make unsaved research
   * durable without this explicit promotion.
   */
  candidateId?: string | number | null | undefined;
  /** Capture/publication time for the source itself. */
  capturedAt?: string | null | undefined;
  /** Short citation or holding note. */
  citation?: string | null | undefined;
  /**
   * UUID or parcel_key. For resident research results, prefer parcel_key
   * (for example `carriage-town:3`) so the backend resolves the stable UUID.
   */
  parcelRef?: string | null | undefined;
  /** JSON object persisted on artifacts.payload_jsonb. */
  payload?: Record<string, unknown> | null | undefined;
  /**
   * Review state for the saved source. Defaults to
   * accepted_for_reconstruction on the backend.
   */
  reviewState?: string | null | undefined;
  /** Harness run id returned by civicResearch. */
  runId?: string | number | null | undefined;
  /** Source/result id selected from civicResearch results. */
  sourceId?: string | number | null | undefined;
  /**
   * Source family used by reconstruction filtering (directory,
   * archival_photo, map, text, etc.).
   */
  sourceType: string;
  /** Short human review note describing why this source was saved. */
  sourceUseNote?: string | null | undefined;
  /**
   * Which reconstruction claim(s) this source helps: footprint, facade,
   * ground_floor_use, date, contradiction, or other.
   */
  sourceUseTags?: Array<string> | null | undefined;
  /** Resident-readable source title. */
  title: string;
  /** Canonical source URL when one exists. */
  uri?: string | null | undefined;
};

export type ReviewStatus =
  | 'ACCEPTED'
  | 'CONTESTED'
  | 'CORROBORATED'
  | 'NEEDS_REVIEW'
  | 'OUTDATED'
  | 'RETRACTED'
  | 'WITHDRAWN';

export type RoofForm =
  | 'FLAT'
  | 'GABLE'
  | 'HIPPED';

export type SaveReconstructionInput = {
  caption?: string | null | undefined;
  contributorEmail?: string | null | undefined;
  reconstructionId: string | number;
  year: number;
};

export type SignalKind =
  /** 311 incidents and other civic safety alerts. */
  | 'CIVIC_INCIDENT'
  /** A resident-contributed observation. */
  | 'COMMUNITY_OBSERVATION'
  /** Active construction / permit / city work. */
  | 'CONSTRUCTION'
  /** A news story tied to a location. */
  | 'NEWS_STORY'
  /** Source freshness / update notices. */
  | 'SOURCE_UPDATE';

export type SourceType =
  | 'ACADEMIC'
  | 'COMMUNITY'
  | 'HISTORICAL_ARCHIVE'
  | 'MAP_SERVICE'
  | 'NEWS'
  | 'OFFICIAL_GOVERNMENT'
  | 'PHOTO_ARCHIVE'
  | 'PUBLIC_RECORD';

export type TaskCreateInput = {
  dueAt?: string | null | undefined;
  eventSlug: string;
  notes?: string | null | undefined;
  ownerUserId?: string | number | null | undefined;
  placementId?: string | number | null | undefined;
  status?: string | null | undefined;
  title: string;
};

export type TaskDeleteInput = {
  expectedVersion: number;
  taskId: string | number;
};

export type TaskUpdateInput = {
  dueAt?: string | null | undefined;
  expectedVersion: number;
  notes?: string | null | undefined;
  ownerUserId?: string | number | null | undefined;
  placementId?: string | number | null | undefined;
  status?: string | null | undefined;
  taskId: string | number;
  title?: string | null | undefined;
};

export type TemporalStatus =
  | 'CURRENT'
  | 'DISPUTED'
  | 'HISTORICAL'
  | 'INFERRED'
  | 'PROPOSED'
  | 'UNKNOWN'
  | 'VANISHED';

export type TimeRangeInput = {
  end?: string | null | undefined;
  start?: string | null | undefined;
};

export type TrustTier =
  | 'HIGH'
  | 'LOW'
  | 'MEDIUM';

export type VisibilityLevel =
  | 'PRIVATE'
  | 'PUBLIC'
  | 'REVIEW_ONLY';

export type CivicResearchMutationVariables = Exact<{
  query: string;
  budget?: Record<string, unknown> | null | undefined;
  scope?: Record<string, unknown> | null | undefined;
  sessionId?: string | null | undefined;
  folioId?: string | null | undefined;
}>;


export type CivicResearchMutation = { civicResearch: { runId: string, skill: string, results: { query: string, totalResultCount: number, reranked: boolean, acceptedConfidenceFloor: number, inferredTimeRange: { start: string | null, end: string | null, label: string | null } | null, places: Array<{ id: string, name: string, placeType: PlaceType, centroid: [number, number] | null, confidence: number, temporalStatus: TemporalStatus }>, signals: Array<{ id: string, signalKind: SignalKind, title: string, summary: string, publishedAt: string | null, relativeTimeLabel: string | null, confidence: number, place: { id: string, name: string } | null }>, events: Array<{ id: string, title: string, summary: string, occurredAt: string | null, confidence: number, place: { id: string, name: string } | null }>, historicalReconstructions: Array<{ id: string, name: string, description: string, position: [number, number], confidence: number, timeStart: string | null, timeEnd: string | null }>, sources: Array<{ id: string, name: string, sourceType: SourceType, trustTier: TrustTier }> }, candidateSources: Array<{ candidateId: string, runId: string, sourceId: string, title: string, sourceType: string, uri: string | null, trustTier: string, confidence: number | null, status: string, parcelRef: string | null, year: number | null, candidateGraphKey: string, promotionMutation: string, proposedUseTags: Array<string>, payload: Record<string, unknown> }> } };

export type BlockSubgraphForReconstructionQueryVariables = Exact<{
  reconstructionId: string | number;
}>;


export type BlockSubgraphForReconstructionQuery = { blockSubgraphForReconstruction: { reconstructionId: string, neighbors: Array<{ relation: string, strength: number, reconstruction: { id: string, civicObjectId: string, name: string, description: string, position: [number, number], heightMeters: number, bearingDegrees: number, confidence: number, timeStart: string | null, timeEnd: string | null, footprint: { widthMeters: number, depthMeters: number } } }> } };

export type ConflictsForReconstructionQueryVariables = Exact<{
  reconstructionId: string | number;
}>;


export type ConflictsForReconstructionQuery = { conflictsForReconstruction: Array<{ id: string, reconstructionId: string, targetNodeId: string, fieldLabel: string, resolvedValue: string, resolutionExplanation: string, resolutionThreshold: number, disagreements: Array<{ statedValue: string, confidence: number, evidenceItemId: string, source: { id: string, name: string, sourceType: SourceType, trustTier: TrustTier } }> }> };

export type ReconstructionForQueryVariables = Exact<{
  parcelId: string | number;
  year: number;
}>;


export type ReconstructionForQuery = { reconstructionFor: { nodeTree: Record<string, unknown>, summary: string, debug: Record<string, unknown> | null, reconstruction: { id: string, civicObjectId: string, name: string, description: string, position: [number, number], heightMeters: number, bearingDegrees: number, confidence: number, facadeConfidence: number | null, roofConfidence: number | null, groundFloorConfidence: number | null, roofForm: RoofForm | null, timeStart: string | null, timeEnd: string | null, geometryUrl: string | null, geometryFormat: GeometryFormat | null, foundryAssetUrl: string | null, footprint: { widthMeters: number, depthMeters: number }, sources: Array<{ id: string, name: string, homepageUrl: string | null, sourceType: SourceType, trustTier: TrustTier, lastChecked: string | null, knownLimits: Array<string> }> }, evidence: { reconstructionId: string, totalCount: number, items: Array<{ id: string, reconstructionId: string, evidenceType: EvidenceType, targetNodeId: string | null, confidence: number, thumbnailUrl: string | null, summary: string | null, sourceDateLabel: string | null, source: { id: string, name: string, homepageUrl: string | null, sourceType: SourceType, trustTier: TrustTier, lastChecked: string | null, knownLimits: Array<string> } }> }, conflicts: Array<{ id: string, reconstructionId: string, targetNodeId: string, fieldLabel: string, resolvedValue: string, resolutionExplanation: string, resolutionThreshold: number, disagreements: Array<{ statedValue: string, confidence: number, evidenceItemId: string, source: { id: string, name: string, trustTier: TrustTier } }> }>, blockSubgraph: { reconstructionId: string, neighbors: Array<{ relation: string, strength: number, reconstruction: { id: string, civicObjectId: string, name: string, position: [number, number], confidence: number, timeStart: string | null, timeEnd: string | null } }> } } | null };

export type ReconstructionDossierQueryVariables = Exact<{
  reconstructionId: string | number;
}>;


export type ReconstructionDossierQuery = { reconstructionDossier: { nodeTree: Record<string, unknown>, summary: string, debug: Record<string, unknown> | null, reconstruction: { id: string, civicObjectId: string, name: string, description: string, position: [number, number], heightMeters: number, bearingDegrees: number, confidence: number, facadeConfidence: number | null, roofConfidence: number | null, groundFloorConfidence: number | null, roofForm: RoofForm | null, timeStart: string | null, timeEnd: string | null, geometryUrl: string | null, geometryFormat: GeometryFormat | null, foundryAssetUrl: string | null, footprint: { widthMeters: number, depthMeters: number }, sources: Array<{ id: string, name: string, homepageUrl: string | null, sourceType: SourceType, trustTier: TrustTier, lastChecked: string | null, knownLimits: Array<string> }> }, evidence: { reconstructionId: string, totalCount: number, items: Array<{ id: string, reconstructionId: string, evidenceType: EvidenceType, targetNodeId: string | null, confidence: number, thumbnailUrl: string | null, summary: string | null, sourceDateLabel: string | null, source: { id: string, name: string, homepageUrl: string | null, sourceType: SourceType, trustTier: TrustTier, lastChecked: string | null, knownLimits: Array<string> } }> }, conflicts: Array<{ id: string, reconstructionId: string, targetNodeId: string, fieldLabel: string, resolvedValue: string, resolutionExplanation: string, resolutionThreshold: number, disagreements: Array<{ statedValue: string, confidence: number, evidenceItemId: string, source: { id: string, name: string, trustTier: TrustTier } }> }>, blockSubgraph: { reconstructionId: string, neighbors: Array<{ relation: string, strength: number, reconstruction: { id: string, civicObjectId: string, name: string, position: [number, number], confidence: number, timeStart: string | null, timeEnd: string | null } }> } } };

export type EvidenceForReconstructionQueryVariables = Exact<{
  reconstructionId: string | number;
}>;


export type EvidenceForReconstructionQuery = { evidenceForReconstruction: { reconstructionId: string, totalCount: number, items: Array<{ id: string, reconstructionId: string, evidenceType: EvidenceType, targetNodeId: string | null, confidence: number, thumbnailUrl: string | null, summary: string | null, sourceDateLabel: string | null, source: { id: string, name: string, homepageUrl: string | null, sourceType: SourceType, trustTier: TrustTier, lastChecked: string | null, knownLimits: Array<string> } }> } };

export type SaveReconstructionMutationVariables = Exact<{
  input: SaveReconstructionInput;
}>;


export type SaveReconstructionMutation = { saveReconstruction: { id: string, reconstructionId: string, year: number, shareUrl: string, savedAt: string, contributorEmailDigest: string | null } };

export type SavedReconstructionQueryVariables = Exact<{
  id: string | number;
}>;


export type SavedReconstructionQuery = { savedReconstruction: { id: string, reconstructionId: string, year: number, shareUrl: string, savedAt: string, contributorEmailDigest: string | null } | null };

export type DossierForQueryVariables = Exact<{
  placeId: string | number;
}>;


export type DossierForQuery = { dossierFor: { description: string, confidence: number, confidenceExplanation: string, place: { id: string, name: string, placeType: PlaceType, geometry: Record<string, unknown> | null, centroid: [number, number] | null, confidence: number, temporalStatus: TemporalStatus, reviewStatus: ReviewStatus, lastUpdated: string, description: string | null }, events: Array<{ id: string, eventType: string, title: string, summary: string, occurredAt: string | null, confidence: number, reviewStatus: ReviewStatus }>, signals: Array<{ id: string, signalKind: SignalKind, title: string, summary: string, publishedAt: string | null, relativeTimeLabel: string | null, confidence: number, visibilityLevel: VisibilityLevel, warningCopy: string | null }>, historicalReconstructions: Array<{ id: string, civicObjectId: string, name: string, description: string, position: [number, number], heightMeters: number, bearingDegrees: number, confidence: number, timeStart: string | null, timeEnd: string | null, geometryUrl: string | null, geometryFormat: GeometryFormat | null, foundryAssetUrl: string | null, footprint: { widthMeters: number, depthMeters: number } }>, sources: Array<{ id: string, name: string, homepageUrl: string | null, sourceType: SourceType, trustTier: TrustTier, lastChecked: string | null, knownLimits: Array<string> }>, metrics: Array<{ id: string, key: string, label: string, value: number | null, stringValue: string | null, unit: string | null, observedAt: string | null, caveat: string | null }>, relatedPlaces: Array<{ id: string, name: string, placeType: PlaceType, centroid: [number, number] | null }> } | null };

export type CreatePlacementMutationVariables = Exact<{
  input: PlacementCreateInput;
}>;


export type CreatePlacementMutation = { createPlacement: { staleWrite: boolean, deleted: boolean, placement: { id: string, eventLayerId: string, category: string, sublabel: string | null, label: string, geometry: Record<string, unknown>, status: string, notes: string | null, version: number } | null } };

export type UpdatePlacementMutationVariables = Exact<{
  input: PlacementUpdateInput;
}>;


export type UpdatePlacementMutation = { updatePlacement: { staleWrite: boolean, deleted: boolean, placement: { id: string, eventLayerId: string, category: string, sublabel: string | null, label: string, geometry: Record<string, unknown>, status: string, notes: string | null, version: number } | null } };

export type DeletePlacementMutationVariables = Exact<{
  input: PlacementDeleteInput;
}>;


export type DeletePlacementMutation = { deletePlacement: { staleWrite: boolean, deleted: boolean, placement: { id: string } | null } };

export type CreateEventTaskMutationVariables = Exact<{
  input: TaskCreateInput;
}>;


export type CreateEventTaskMutation = { createTask: { staleWrite: boolean, deleted: boolean, task: { id: string, eventLayerId: string, title: string, ownerDisplay: string | null, dueAt: string | null, status: string, placementId: string | null, notes: string | null, version: number } | null } };

export type UpdateEventTaskMutationVariables = Exact<{
  input: TaskUpdateInput;
}>;


export type UpdateEventTaskMutation = { updateTask: { staleWrite: boolean, deleted: boolean, task: { id: string, eventLayerId: string, title: string, ownerDisplay: string | null, dueAt: string | null, status: string, placementId: string | null, notes: string | null, version: number } | null } };

export type DeleteEventTaskMutationVariables = Exact<{
  input: TaskDeleteInput;
}>;


export type DeleteEventTaskMutation = { deleteTask: { staleWrite: boolean, deleted: boolean, task: { id: string } | null } };

export type PlacementNotesQueryVariables = Exact<{
  tenantSlug?: string;
  placementId: string | number;
}>;


export type PlacementNotesQuery = { placementNotes: Array<{ id: string, placementId: string, eventLayerId: string, authorUserId: string, authorDisplay: string, body: string, createdAt: string, version: number }> };

export type CreatePlacementNoteMutationVariables = Exact<{
  input: CreatePlacementNoteInput;
}>;


export type CreatePlacementNoteMutation = { createPlacementNote: { deleted: boolean, note: { id: string, placementId: string, eventLayerId: string, authorUserId: string, authorDisplay: string, body: string, createdAt: string, version: number } | null } };

export type DeletePlacementNoteMutationVariables = Exact<{
  input: DeletePlacementNoteInput;
}>;


export type DeletePlacementNoteMutation = { deletePlacementNote: { deleted: boolean, note: { id: string } | null } };

export type CameraBookmarksQueryVariables = Exact<{
  tenantSlug?: string;
  eventSlug: string;
}>;


export type CameraBookmarksQuery = { cameraBookmarks: Array<{ id: string, eventLayerId: string, name: string, centerLng: number, centerLat: number, zoom: number, pitch: number, bearing: number, createdByUserId: string | null, createdAt: string, version: number }> };

export type CreateBookmarkMutationVariables = Exact<{
  input: BookmarkCreateInput;
}>;


export type CreateBookmarkMutation = { createBookmark: { staleWrite: boolean, deleted: boolean, bookmark: { id: string, eventLayerId: string, name: string, centerLng: number, centerLat: number, zoom: number, pitch: number, bearing: number, createdByUserId: string | null, createdAt: string, version: number } | null } };

export type UpdateBookmarkMutationVariables = Exact<{
  input: BookmarkUpdateInput;
}>;


export type UpdateBookmarkMutation = { updateBookmark: { staleWrite: boolean, deleted: boolean, bookmark: { id: string, name: string, centerLng: number, centerLat: number, zoom: number, pitch: number, bearing: number, version: number } | null } };

export type DeleteBookmarkMutationVariables = Exact<{
  input: BookmarkDeleteInput;
}>;


export type DeleteBookmarkMutation = { deleteBookmark: { staleWrite: boolean, deleted: boolean, bookmark: { id: string } | null } };

export type EventLayersQueryVariables = Exact<{
  tenantSlug?: string;
}>;


export type EventLayersQuery = { eventLayers: Array<{ id: string, slug: string, title: string, startsAt: string | null, endsAt: string | null }> };

export type EventPlacementsQueryVariables = Exact<{
  tenantSlug?: string;
  eventSlug: string;
}>;


export type EventPlacementsQuery = { placements: Array<{ id: string, eventLayerId: string, category: string, sublabel: string | null, label: string, geometry: Record<string, unknown>, status: string, notes: string | null, version: number }> };

export type EventTasksListQueryVariables = Exact<{
  tenantSlug?: string;
  eventSlug: string;
}>;


export type EventTasksListQuery = { eventTasks: Array<{ id: string, eventLayerId: string, title: string, ownerDisplay: string | null, dueAt: string | null, status: string, placementId: string | null, notes: string | null, version: number }> };

export type SpatialEventsListQueryVariables = Exact<{
  bbox?: BboxInput | null | undefined;
  timeRange?: TimeRangeInput | null | undefined;
  eventTypes?: Array<string> | string | null | undefined;
  limit?: number | null | undefined;
}>;


export type SpatialEventsListQuery = { spatialEvents: Array<{ id: string, eventType: string, title: string, summary: string, occurredAt: string | null, confidence: number, reviewStatus: ReviewStatus, geometry: Record<string, unknown> | null, occurredRange: { start: string | null, end: string | null, label: string | null } | null, place: { id: string, name: string, centroid: [number, number] | null } | null, sources: Array<{ id: string, name: string, trustTier: TrustTier }> }> };

export type HistoricalReconstructionsAtQueryVariables = Exact<{
  bbox: BboxInput;
  year?: number | null | undefined;
  minConfidence?: number | null | undefined;
}>;


export type HistoricalReconstructionsAtQuery = { historicalReconstructions: Array<{ id: string, civicObjectId: string, name: string, description: string, position: [number, number], heightMeters: number, bearingDegrees: number, confidence: number, timeStart: string | null, timeEnd: string | null, geometryUrl: string | null, geometryFormat: GeometryFormat | null, foundryAssetUrl: string | null, footprint: { widthMeters: number, depthMeters: number }, sources: Array<{ id: string, name: string, trustTier: TrustTier }> }> };

export type HistoricalReconstructionByIdQueryVariables = Exact<{
  id: string | number;
}>;


export type HistoricalReconstructionByIdQuery = { historicalReconstruction: { id: string, civicObjectId: string, name: string, description: string, position: [number, number], heightMeters: number, bearingDegrees: number, confidence: number, timeStart: string | null, timeEnd: string | null, geometryUrl: string | null, geometryFormat: GeometryFormat | null, foundryAssetUrl: string | null, footprint: { widthMeters: number, depthMeters: number }, sources: Array<{ id: string, name: string, homepageUrl: string | null, sourceType: SourceType, trustTier: TrustTier, lastChecked: string | null, knownLimits: Array<string> }> } | null };

export type AtlasManifestQueryVariables = Exact<{ [key: string]: never; }>;


export type AtlasManifestQuery = { manifest: { atlasId: string, builtAt: string, schemaVersion: number, placeCount: number, sourceCount: number, signalCount: number, metricCount: number, historicalReconstructionCount: number, privacyNotes: Array<string> } };

export type SubmitObservationMutationVariables = Exact<{
  input: ObservationInput;
}>;


export type SubmitObservationMutation = { submitObservation: { receiptId: string, submissionId: string, acknowledgedAt: string, status: ReviewStatus, nextReviewWindowLabel: string, contributorVisibleNotes: Array<string> } };

export type PlacesByBboxQueryVariables = Exact<{
  bbox: BboxInput;
  types?: Array<PlaceType> | PlaceType | null | undefined;
  limit?: number | null | undefined;
}>;


export type PlacesByBboxQuery = { placesByBbox: Array<{ id: string, name: string, placeType: PlaceType, geometry: Record<string, unknown> | null, centroid: [number, number] | null, confidence: number, temporalStatus: TemporalStatus, reviewStatus: ReviewStatus, lastUpdated: string }> };

export type PlacesByTimeRangeQueryVariables = Exact<{
  range: TimeRangeInput;
  bbox?: BboxInput | null | undefined;
  types?: Array<PlaceType> | PlaceType | null | undefined;
}>;


export type PlacesByTimeRangeQuery = { placesByTimeRange: Array<{ id: string, name: string, placeType: PlaceType, centroid: [number, number] | null, confidence: number, temporalStatus: TemporalStatus }> };

export type PlaceByIdQueryVariables = Exact<{
  id: string | number;
}>;


export type PlaceByIdQuery = { place: { id: string, name: string, placeType: PlaceType, geometry: Record<string, unknown> | null, centroid: [number, number] | null, parentId: string | null, childIds: Array<string>, confidence: number, temporalStatus: TemporalStatus, reviewStatus: ReviewStatus, lastUpdated: string, description: string | null, bbox: { west: number, south: number, east: number, north: number } | null, sources: Array<{ id: string, name: string, sourceType: SourceType, trustTier: TrustTier, lastChecked: string | null }> } | null };

export type ProvenanceQueryVariables = Exact<{
  placeId?: string | number | null | undefined;
  sourceId?: string | number | null | undefined;
}>;


export type ProvenanceQuery = { provenanceFor: { nodeCount: number, edgeCount: number, nodes: Array<{ id: string, labels: Array<string>, properties: Record<string, unknown> }>, edges: Array<{ source: string, target: string, edgeType: string, weight: number | null }> } };

export type PromoteResearchArtifactMutationVariables = Exact<{
  input: ResearchArtifactPromotionInput;
}>;


export type PromoteResearchArtifactMutation = { promoteResearchArtifact: { artifactId: string, artifactKey: string, status: string } };

export type SearchAtlasQueryVariables = Exact<{
  query: string;
  bbox?: BboxInput | null | undefined;
  timeRange?: TimeRangeInput | null | undefined;
  minConfidence?: number | null | undefined;
  limit?: number | null | undefined;
}>;


export type SearchAtlasQuery = { searchAtlas: { query: string, totalResultCount: number, reranked: boolean, acceptedConfidenceFloor: number, inferredTimeRange: { start: string | null, end: string | null, label: string | null } | null, places: Array<{ id: string, name: string, placeType: PlaceType, centroid: [number, number] | null, confidence: number, temporalStatus: TemporalStatus }>, signals: Array<{ id: string, signalKind: SignalKind, title: string, summary: string, publishedAt: string | null, relativeTimeLabel: string | null, confidence: number, place: { id: string, name: string } | null }>, events: Array<{ id: string, title: string, summary: string, occurredAt: string | null, confidence: number, place: { id: string, name: string } | null }>, historicalReconstructions: Array<{ id: string, name: string, description: string, position: [number, number], confidence: number, timeStart: string | null, timeEnd: string | null }>, sources: Array<{ id: string, name: string, sourceType: SourceType, trustTier: TrustTier }> } };

export type SignalsInBboxQueryVariables = Exact<{
  bbox?: BboxInput | null | undefined;
  kinds?: Array<SignalKind> | SignalKind | null | undefined;
  minConfidence?: number | null | undefined;
  limit?: number | null | undefined;
}>;


export type SignalsInBboxQuery = { signals: Array<{ id: string, signalKind: SignalKind, title: string, summary: string, publishedAt: string | null, receivedAt: string | null, relativeTimeLabel: string | null, confidence: number, reviewStatus: ReviewStatus, visibilityLevel: VisibilityLevel, warningCopy: string | null, expiresAt: string | null, geometry: Record<string, unknown> | null, source: { id: string, name: string, sourceType: SourceType, trustTier: TrustTier } | null, place: { id: string, name: string, centroid: [number, number] | null } | null }> };

export type SourcesListQueryVariables = Exact<{
  sourceTypes?: Array<SourceType> | SourceType | null | undefined;
  minTrustTier?: TrustTier | null | undefined;
}>;


export type SourcesListQuery = { sources: Array<{ id: string, name: string, homepageUrl: string | null, sourceType: SourceType, publicUseTerms: string | null, trustTier: TrustTier, lastChecked: string | null, knownLimits: Array<string>, containsPersonalData: boolean }> };

export type SourceByIdQueryVariables = Exact<{
  id: string | number;
}>;


export type SourceByIdQuery = { source: { id: string, name: string, homepageUrl: string | null, sourceType: SourceType, publicUseTerms: string | null, trustTier: TrustTier, lastChecked: string | null, knownLimits: Array<string>, containsPersonalData: boolean } | null };


export const CivicResearchDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CivicResearch"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"query"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"budget"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"scope"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"sessionId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"folioId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"civicResearch"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"query"},"value":{"kind":"Variable","name":{"kind":"Name","value":"query"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"budget"},"value":{"kind":"Variable","name":{"kind":"Name","value":"budget"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"scope"},"value":{"kind":"Variable","name":{"kind":"Name","value":"scope"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"sessionId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"sessionId"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"folioId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"folioId"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"runId"}},{"kind":"Field","name":{"kind":"Name","value":"skill"}},{"kind":"Field","name":{"kind":"Name","value":"results"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"query"}},{"kind":"Field","name":{"kind":"Name","value":"totalResultCount"}},{"kind":"Field","name":{"kind":"Name","value":"reranked"}},{"kind":"Field","name":{"kind":"Name","value":"acceptedConfidenceFloor"}},{"kind":"Field","name":{"kind":"Name","value":"inferredTimeRange"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"start"}},{"kind":"Field","name":{"kind":"Name","value":"end"}},{"kind":"Field","name":{"kind":"Name","value":"label"}}]}},{"kind":"Field","name":{"kind":"Name","value":"places"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"placeType"}},{"kind":"Field","name":{"kind":"Name","value":"centroid"}},{"kind":"Field","name":{"kind":"Name","value":"confidence"}},{"kind":"Field","name":{"kind":"Name","value":"temporalStatus"}}]}},{"kind":"Field","name":{"kind":"Name","value":"signals"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"signalKind"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"summary"}},{"kind":"Field","name":{"kind":"Name","value":"publishedAt"}},{"kind":"Field","name":{"kind":"Name","value":"relativeTimeLabel"}},{"kind":"Field","name":{"kind":"Name","value":"confidence"}},{"kind":"Field","name":{"kind":"Name","value":"place"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"events"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"summary"}},{"kind":"Field","name":{"kind":"Name","value":"occurredAt"}},{"kind":"Field","name":{"kind":"Name","value":"confidence"}},{"kind":"Field","name":{"kind":"Name","value":"place"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"historicalReconstructions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"position"}},{"kind":"Field","name":{"kind":"Name","value":"confidence"}},{"kind":"Field","name":{"kind":"Name","value":"timeStart"}},{"kind":"Field","name":{"kind":"Name","value":"timeEnd"}}]}},{"kind":"Field","name":{"kind":"Name","value":"sources"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"sourceType"}},{"kind":"Field","name":{"kind":"Name","value":"trustTier"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"candidateSources"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"candidateId"}},{"kind":"Field","name":{"kind":"Name","value":"runId"}},{"kind":"Field","name":{"kind":"Name","value":"sourceId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"sourceType"}},{"kind":"Field","name":{"kind":"Name","value":"uri"}},{"kind":"Field","name":{"kind":"Name","value":"trustTier"}},{"kind":"Field","name":{"kind":"Name","value":"confidence"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"parcelRef"}},{"kind":"Field","name":{"kind":"Name","value":"year"}},{"kind":"Field","name":{"kind":"Name","value":"candidateGraphKey"}},{"kind":"Field","name":{"kind":"Name","value":"promotionMutation"}},{"kind":"Field","name":{"kind":"Name","value":"proposedUseTags"}},{"kind":"Field","name":{"kind":"Name","value":"payload"}}]}}]}}]}}]} as unknown as DocumentNode<CivicResearchMutation, CivicResearchMutationVariables>;
export const BlockSubgraphForReconstructionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"BlockSubgraphForReconstruction"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"reconstructionId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"blockSubgraphForReconstruction"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"reconstructionId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"reconstructionId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"reconstructionId"}},{"kind":"Field","name":{"kind":"Name","value":"neighbors"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"relation"}},{"kind":"Field","name":{"kind":"Name","value":"strength"}},{"kind":"Field","name":{"kind":"Name","value":"reconstruction"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"civicObjectId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"position"}},{"kind":"Field","name":{"kind":"Name","value":"footprint"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"widthMeters"}},{"kind":"Field","name":{"kind":"Name","value":"depthMeters"}}]}},{"kind":"Field","name":{"kind":"Name","value":"heightMeters"}},{"kind":"Field","name":{"kind":"Name","value":"bearingDegrees"}},{"kind":"Field","name":{"kind":"Name","value":"confidence"}},{"kind":"Field","name":{"kind":"Name","value":"timeStart"}},{"kind":"Field","name":{"kind":"Name","value":"timeEnd"}}]}}]}}]}}]}}]} as unknown as DocumentNode<BlockSubgraphForReconstructionQuery, BlockSubgraphForReconstructionQueryVariables>;
export const ConflictsForReconstructionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ConflictsForReconstruction"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"reconstructionId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"conflictsForReconstruction"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"reconstructionId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"reconstructionId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"reconstructionId"}},{"kind":"Field","name":{"kind":"Name","value":"targetNodeId"}},{"kind":"Field","name":{"kind":"Name","value":"fieldLabel"}},{"kind":"Field","name":{"kind":"Name","value":"resolvedValue"}},{"kind":"Field","name":{"kind":"Name","value":"resolutionExplanation"}},{"kind":"Field","name":{"kind":"Name","value":"resolutionThreshold"}},{"kind":"Field","name":{"kind":"Name","value":"disagreements"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"statedValue"}},{"kind":"Field","name":{"kind":"Name","value":"confidence"}},{"kind":"Field","name":{"kind":"Name","value":"evidenceItemId"}},{"kind":"Field","name":{"kind":"Name","value":"source"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"sourceType"}},{"kind":"Field","name":{"kind":"Name","value":"trustTier"}}]}}]}}]}}]}}]} as unknown as DocumentNode<ConflictsForReconstructionQuery, ConflictsForReconstructionQueryVariables>;
export const ReconstructionForDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ReconstructionFor"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"parcelId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"year"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"reconstructionFor"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"parcelId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"parcelId"}}},{"kind":"Argument","name":{"kind":"Name","value":"year"},"value":{"kind":"Variable","name":{"kind":"Name","value":"year"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"reconstruction"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"civicObjectId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"position"}},{"kind":"Field","name":{"kind":"Name","value":"footprint"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"widthMeters"}},{"kind":"Field","name":{"kind":"Name","value":"depthMeters"}}]}},{"kind":"Field","name":{"kind":"Name","value":"heightMeters"}},{"kind":"Field","name":{"kind":"Name","value":"bearingDegrees"}},{"kind":"Field","name":{"kind":"Name","value":"confidence"}},{"kind":"Field","name":{"kind":"Name","value":"facadeConfidence"}},{"kind":"Field","name":{"kind":"Name","value":"roofConfidence"}},{"kind":"Field","name":{"kind":"Name","value":"groundFloorConfidence"}},{"kind":"Field","name":{"kind":"Name","value":"roofForm"}},{"kind":"Field","name":{"kind":"Name","value":"timeStart"}},{"kind":"Field","name":{"kind":"Name","value":"timeEnd"}},{"kind":"Field","name":{"kind":"Name","value":"geometryUrl"}},{"kind":"Field","name":{"kind":"Name","value":"geometryFormat"}},{"kind":"Field","name":{"kind":"Name","value":"foundryAssetUrl"}},{"kind":"Field","name":{"kind":"Name","value":"sources"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"homepageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"sourceType"}},{"kind":"Field","name":{"kind":"Name","value":"trustTier"}},{"kind":"Field","name":{"kind":"Name","value":"lastChecked"}},{"kind":"Field","name":{"kind":"Name","value":"knownLimits"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"evidence"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"reconstructionId"}},{"kind":"Field","name":{"kind":"Name","value":"totalCount"}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"reconstructionId"}},{"kind":"Field","name":{"kind":"Name","value":"evidenceType"}},{"kind":"Field","name":{"kind":"Name","value":"targetNodeId"}},{"kind":"Field","name":{"kind":"Name","value":"confidence"}},{"kind":"Field","name":{"kind":"Name","value":"thumbnailUrl"}},{"kind":"Field","name":{"kind":"Name","value":"summary"}},{"kind":"Field","name":{"kind":"Name","value":"sourceDateLabel"}},{"kind":"Field","name":{"kind":"Name","value":"source"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"homepageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"sourceType"}},{"kind":"Field","name":{"kind":"Name","value":"trustTier"}},{"kind":"Field","name":{"kind":"Name","value":"lastChecked"}},{"kind":"Field","name":{"kind":"Name","value":"knownLimits"}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"conflicts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"reconstructionId"}},{"kind":"Field","name":{"kind":"Name","value":"targetNodeId"}},{"kind":"Field","name":{"kind":"Name","value":"fieldLabel"}},{"kind":"Field","name":{"kind":"Name","value":"resolvedValue"}},{"kind":"Field","name":{"kind":"Name","value":"resolutionExplanation"}},{"kind":"Field","name":{"kind":"Name","value":"resolutionThreshold"}},{"kind":"Field","name":{"kind":"Name","value":"disagreements"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"statedValue"}},{"kind":"Field","name":{"kind":"Name","value":"confidence"}},{"kind":"Field","name":{"kind":"Name","value":"evidenceItemId"}},{"kind":"Field","name":{"kind":"Name","value":"source"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"trustTier"}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"blockSubgraph"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"reconstructionId"}},{"kind":"Field","name":{"kind":"Name","value":"neighbors"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"relation"}},{"kind":"Field","name":{"kind":"Name","value":"strength"}},{"kind":"Field","name":{"kind":"Name","value":"reconstruction"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"civicObjectId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"position"}},{"kind":"Field","name":{"kind":"Name","value":"confidence"}},{"kind":"Field","name":{"kind":"Name","value":"timeStart"}},{"kind":"Field","name":{"kind":"Name","value":"timeEnd"}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"nodeTree"}},{"kind":"Field","name":{"kind":"Name","value":"summary"}},{"kind":"Field","name":{"kind":"Name","value":"debug"}}]}}]}}]} as unknown as DocumentNode<ReconstructionForQuery, ReconstructionForQueryVariables>;
export const ReconstructionDossierDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ReconstructionDossier"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"reconstructionId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"reconstructionDossier"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"reconstructionId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"reconstructionId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"reconstruction"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"civicObjectId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"position"}},{"kind":"Field","name":{"kind":"Name","value":"footprint"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"widthMeters"}},{"kind":"Field","name":{"kind":"Name","value":"depthMeters"}}]}},{"kind":"Field","name":{"kind":"Name","value":"heightMeters"}},{"kind":"Field","name":{"kind":"Name","value":"bearingDegrees"}},{"kind":"Field","name":{"kind":"Name","value":"confidence"}},{"kind":"Field","name":{"kind":"Name","value":"facadeConfidence"}},{"kind":"Field","name":{"kind":"Name","value":"roofConfidence"}},{"kind":"Field","name":{"kind":"Name","value":"groundFloorConfidence"}},{"kind":"Field","name":{"kind":"Name","value":"roofForm"}},{"kind":"Field","name":{"kind":"Name","value":"timeStart"}},{"kind":"Field","name":{"kind":"Name","value":"timeEnd"}},{"kind":"Field","name":{"kind":"Name","value":"geometryUrl"}},{"kind":"Field","name":{"kind":"Name","value":"geometryFormat"}},{"kind":"Field","name":{"kind":"Name","value":"foundryAssetUrl"}},{"kind":"Field","name":{"kind":"Name","value":"sources"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"homepageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"sourceType"}},{"kind":"Field","name":{"kind":"Name","value":"trustTier"}},{"kind":"Field","name":{"kind":"Name","value":"lastChecked"}},{"kind":"Field","name":{"kind":"Name","value":"knownLimits"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"evidence"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"reconstructionId"}},{"kind":"Field","name":{"kind":"Name","value":"totalCount"}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"reconstructionId"}},{"kind":"Field","name":{"kind":"Name","value":"evidenceType"}},{"kind":"Field","name":{"kind":"Name","value":"targetNodeId"}},{"kind":"Field","name":{"kind":"Name","value":"confidence"}},{"kind":"Field","name":{"kind":"Name","value":"thumbnailUrl"}},{"kind":"Field","name":{"kind":"Name","value":"summary"}},{"kind":"Field","name":{"kind":"Name","value":"sourceDateLabel"}},{"kind":"Field","name":{"kind":"Name","value":"source"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"homepageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"sourceType"}},{"kind":"Field","name":{"kind":"Name","value":"trustTier"}},{"kind":"Field","name":{"kind":"Name","value":"lastChecked"}},{"kind":"Field","name":{"kind":"Name","value":"knownLimits"}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"conflicts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"reconstructionId"}},{"kind":"Field","name":{"kind":"Name","value":"targetNodeId"}},{"kind":"Field","name":{"kind":"Name","value":"fieldLabel"}},{"kind":"Field","name":{"kind":"Name","value":"resolvedValue"}},{"kind":"Field","name":{"kind":"Name","value":"resolutionExplanation"}},{"kind":"Field","name":{"kind":"Name","value":"resolutionThreshold"}},{"kind":"Field","name":{"kind":"Name","value":"disagreements"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"statedValue"}},{"kind":"Field","name":{"kind":"Name","value":"confidence"}},{"kind":"Field","name":{"kind":"Name","value":"evidenceItemId"}},{"kind":"Field","name":{"kind":"Name","value":"source"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"trustTier"}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"blockSubgraph"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"reconstructionId"}},{"kind":"Field","name":{"kind":"Name","value":"neighbors"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"relation"}},{"kind":"Field","name":{"kind":"Name","value":"strength"}},{"kind":"Field","name":{"kind":"Name","value":"reconstruction"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"civicObjectId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"position"}},{"kind":"Field","name":{"kind":"Name","value":"confidence"}},{"kind":"Field","name":{"kind":"Name","value":"timeStart"}},{"kind":"Field","name":{"kind":"Name","value":"timeEnd"}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"nodeTree"}},{"kind":"Field","name":{"kind":"Name","value":"summary"}},{"kind":"Field","name":{"kind":"Name","value":"debug"}}]}}]}}]} as unknown as DocumentNode<ReconstructionDossierQuery, ReconstructionDossierQueryVariables>;
export const EvidenceForReconstructionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"EvidenceForReconstruction"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"reconstructionId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"evidenceForReconstruction"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"reconstructionId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"reconstructionId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"reconstructionId"}},{"kind":"Field","name":{"kind":"Name","value":"totalCount"}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"reconstructionId"}},{"kind":"Field","name":{"kind":"Name","value":"evidenceType"}},{"kind":"Field","name":{"kind":"Name","value":"targetNodeId"}},{"kind":"Field","name":{"kind":"Name","value":"confidence"}},{"kind":"Field","name":{"kind":"Name","value":"thumbnailUrl"}},{"kind":"Field","name":{"kind":"Name","value":"summary"}},{"kind":"Field","name":{"kind":"Name","value":"sourceDateLabel"}},{"kind":"Field","name":{"kind":"Name","value":"source"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"homepageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"sourceType"}},{"kind":"Field","name":{"kind":"Name","value":"trustTier"}},{"kind":"Field","name":{"kind":"Name","value":"lastChecked"}},{"kind":"Field","name":{"kind":"Name","value":"knownLimits"}}]}}]}}]}}]}}]} as unknown as DocumentNode<EvidenceForReconstructionQuery, EvidenceForReconstructionQueryVariables>;
export const SaveReconstructionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SaveReconstruction"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SaveReconstructionInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"saveReconstruction"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"reconstructionId"}},{"kind":"Field","name":{"kind":"Name","value":"year"}},{"kind":"Field","name":{"kind":"Name","value":"shareUrl"}},{"kind":"Field","name":{"kind":"Name","value":"savedAt"}},{"kind":"Field","name":{"kind":"Name","value":"contributorEmailDigest"}}]}}]}}]} as unknown as DocumentNode<SaveReconstructionMutation, SaveReconstructionMutationVariables>;
export const SavedReconstructionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"SavedReconstruction"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"savedReconstruction"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"reconstructionId"}},{"kind":"Field","name":{"kind":"Name","value":"year"}},{"kind":"Field","name":{"kind":"Name","value":"shareUrl"}},{"kind":"Field","name":{"kind":"Name","value":"savedAt"}},{"kind":"Field","name":{"kind":"Name","value":"contributorEmailDigest"}}]}}]}}]} as unknown as DocumentNode<SavedReconstructionQuery, SavedReconstructionQueryVariables>;
export const DossierForDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"DossierFor"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"placeId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"dossierFor"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"placeId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"placeId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"place"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"placeType"}},{"kind":"Field","name":{"kind":"Name","value":"geometry"}},{"kind":"Field","name":{"kind":"Name","value":"centroid"}},{"kind":"Field","name":{"kind":"Name","value":"confidence"}},{"kind":"Field","name":{"kind":"Name","value":"temporalStatus"}},{"kind":"Field","name":{"kind":"Name","value":"reviewStatus"}},{"kind":"Field","name":{"kind":"Name","value":"lastUpdated"}},{"kind":"Field","name":{"kind":"Name","value":"description"}}]}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"confidence"}},{"kind":"Field","name":{"kind":"Name","value":"confidenceExplanation"}},{"kind":"Field","name":{"kind":"Name","value":"events"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"eventType"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"summary"}},{"kind":"Field","name":{"kind":"Name","value":"occurredAt"}},{"kind":"Field","name":{"kind":"Name","value":"confidence"}},{"kind":"Field","name":{"kind":"Name","value":"reviewStatus"}}]}},{"kind":"Field","name":{"kind":"Name","value":"signals"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"signalKind"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"summary"}},{"kind":"Field","name":{"kind":"Name","value":"publishedAt"}},{"kind":"Field","name":{"kind":"Name","value":"relativeTimeLabel"}},{"kind":"Field","name":{"kind":"Name","value":"confidence"}},{"kind":"Field","name":{"kind":"Name","value":"visibilityLevel"}},{"kind":"Field","name":{"kind":"Name","value":"warningCopy"}}]}},{"kind":"Field","name":{"kind":"Name","value":"historicalReconstructions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"civicObjectId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"position"}},{"kind":"Field","name":{"kind":"Name","value":"footprint"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"widthMeters"}},{"kind":"Field","name":{"kind":"Name","value":"depthMeters"}}]}},{"kind":"Field","name":{"kind":"Name","value":"heightMeters"}},{"kind":"Field","name":{"kind":"Name","value":"bearingDegrees"}},{"kind":"Field","name":{"kind":"Name","value":"confidence"}},{"kind":"Field","name":{"kind":"Name","value":"timeStart"}},{"kind":"Field","name":{"kind":"Name","value":"timeEnd"}},{"kind":"Field","name":{"kind":"Name","value":"geometryUrl"}},{"kind":"Field","name":{"kind":"Name","value":"geometryFormat"}},{"kind":"Field","name":{"kind":"Name","value":"foundryAssetUrl"}}]}},{"kind":"Field","name":{"kind":"Name","value":"sources"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"homepageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"sourceType"}},{"kind":"Field","name":{"kind":"Name","value":"trustTier"}},{"kind":"Field","name":{"kind":"Name","value":"lastChecked"}},{"kind":"Field","name":{"kind":"Name","value":"knownLimits"}}]}},{"kind":"Field","name":{"kind":"Name","value":"metrics"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"stringValue"}},{"kind":"Field","name":{"kind":"Name","value":"unit"}},{"kind":"Field","name":{"kind":"Name","value":"observedAt"}},{"kind":"Field","name":{"kind":"Name","value":"caveat"}}]}},{"kind":"Field","name":{"kind":"Name","value":"relatedPlaces"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"placeType"}},{"kind":"Field","name":{"kind":"Name","value":"centroid"}}]}}]}}]}}]} as unknown as DocumentNode<DossierForQuery, DossierForQueryVariables>;
export const CreatePlacementDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreatePlacement"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"PlacementCreateInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createPlacement"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"placement"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"eventLayerId"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"sublabel"}},{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"geometry"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"version"}}]}},{"kind":"Field","name":{"kind":"Name","value":"staleWrite"}},{"kind":"Field","name":{"kind":"Name","value":"deleted"}}]}}]}}]} as unknown as DocumentNode<CreatePlacementMutation, CreatePlacementMutationVariables>;
export const UpdatePlacementDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdatePlacement"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"PlacementUpdateInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updatePlacement"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"placement"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"eventLayerId"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"sublabel"}},{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"geometry"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"version"}}]}},{"kind":"Field","name":{"kind":"Name","value":"staleWrite"}},{"kind":"Field","name":{"kind":"Name","value":"deleted"}}]}}]}}]} as unknown as DocumentNode<UpdatePlacementMutation, UpdatePlacementMutationVariables>;
export const DeletePlacementDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeletePlacement"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"PlacementDeleteInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deletePlacement"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"placement"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}},{"kind":"Field","name":{"kind":"Name","value":"staleWrite"}},{"kind":"Field","name":{"kind":"Name","value":"deleted"}}]}}]}}]} as unknown as DocumentNode<DeletePlacementMutation, DeletePlacementMutationVariables>;
export const CreateEventTaskDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateEventTask"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"TaskCreateInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createTask"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"task"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"eventLayerId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"ownerDisplay"}},{"kind":"Field","name":{"kind":"Name","value":"dueAt"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"placementId"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"version"}}]}},{"kind":"Field","name":{"kind":"Name","value":"staleWrite"}},{"kind":"Field","name":{"kind":"Name","value":"deleted"}}]}}]}}]} as unknown as DocumentNode<CreateEventTaskMutation, CreateEventTaskMutationVariables>;
export const UpdateEventTaskDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateEventTask"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"TaskUpdateInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateTask"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"task"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"eventLayerId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"ownerDisplay"}},{"kind":"Field","name":{"kind":"Name","value":"dueAt"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"placementId"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"version"}}]}},{"kind":"Field","name":{"kind":"Name","value":"staleWrite"}},{"kind":"Field","name":{"kind":"Name","value":"deleted"}}]}}]}}]} as unknown as DocumentNode<UpdateEventTaskMutation, UpdateEventTaskMutationVariables>;
export const DeleteEventTaskDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteEventTask"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"TaskDeleteInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteTask"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"task"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}},{"kind":"Field","name":{"kind":"Name","value":"staleWrite"}},{"kind":"Field","name":{"kind":"Name","value":"deleted"}}]}}]}}]} as unknown as DocumentNode<DeleteEventTaskMutation, DeleteEventTaskMutationVariables>;
export const PlacementNotesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"PlacementNotes"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"tenantSlug"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},"defaultValue":{"kind":"StringValue","value":"flint","block":false}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"placementId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"placementNotes"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"tenantSlug"},"value":{"kind":"Variable","name":{"kind":"Name","value":"tenantSlug"}}},{"kind":"Argument","name":{"kind":"Name","value":"placementId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"placementId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"placementId"}},{"kind":"Field","name":{"kind":"Name","value":"eventLayerId"}},{"kind":"Field","name":{"kind":"Name","value":"authorUserId"}},{"kind":"Field","name":{"kind":"Name","value":"authorDisplay"}},{"kind":"Field","name":{"kind":"Name","value":"body"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"version"}}]}}]}}]} as unknown as DocumentNode<PlacementNotesQuery, PlacementNotesQueryVariables>;
export const CreatePlacementNoteDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreatePlacementNote"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreatePlacementNoteInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createPlacementNote"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"note"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"placementId"}},{"kind":"Field","name":{"kind":"Name","value":"eventLayerId"}},{"kind":"Field","name":{"kind":"Name","value":"authorUserId"}},{"kind":"Field","name":{"kind":"Name","value":"authorDisplay"}},{"kind":"Field","name":{"kind":"Name","value":"body"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"version"}}]}},{"kind":"Field","name":{"kind":"Name","value":"deleted"}}]}}]}}]} as unknown as DocumentNode<CreatePlacementNoteMutation, CreatePlacementNoteMutationVariables>;
export const DeletePlacementNoteDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeletePlacementNote"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"DeletePlacementNoteInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deletePlacementNote"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"note"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}},{"kind":"Field","name":{"kind":"Name","value":"deleted"}}]}}]}}]} as unknown as DocumentNode<DeletePlacementNoteMutation, DeletePlacementNoteMutationVariables>;
export const CameraBookmarksDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"CameraBookmarks"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"tenantSlug"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},"defaultValue":{"kind":"StringValue","value":"flint","block":false}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"eventSlug"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cameraBookmarks"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"tenantSlug"},"value":{"kind":"Variable","name":{"kind":"Name","value":"tenantSlug"}}},{"kind":"Argument","name":{"kind":"Name","value":"eventSlug"},"value":{"kind":"Variable","name":{"kind":"Name","value":"eventSlug"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"eventLayerId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"centerLng"}},{"kind":"Field","name":{"kind":"Name","value":"centerLat"}},{"kind":"Field","name":{"kind":"Name","value":"zoom"}},{"kind":"Field","name":{"kind":"Name","value":"pitch"}},{"kind":"Field","name":{"kind":"Name","value":"bearing"}},{"kind":"Field","name":{"kind":"Name","value":"createdByUserId"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"version"}}]}}]}}]} as unknown as DocumentNode<CameraBookmarksQuery, CameraBookmarksQueryVariables>;
export const CreateBookmarkDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateBookmark"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"BookmarkCreateInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createBookmark"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"bookmark"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"eventLayerId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"centerLng"}},{"kind":"Field","name":{"kind":"Name","value":"centerLat"}},{"kind":"Field","name":{"kind":"Name","value":"zoom"}},{"kind":"Field","name":{"kind":"Name","value":"pitch"}},{"kind":"Field","name":{"kind":"Name","value":"bearing"}},{"kind":"Field","name":{"kind":"Name","value":"createdByUserId"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"version"}}]}},{"kind":"Field","name":{"kind":"Name","value":"staleWrite"}},{"kind":"Field","name":{"kind":"Name","value":"deleted"}}]}}]}}]} as unknown as DocumentNode<CreateBookmarkMutation, CreateBookmarkMutationVariables>;
export const UpdateBookmarkDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateBookmark"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"BookmarkUpdateInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateBookmark"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"bookmark"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"centerLng"}},{"kind":"Field","name":{"kind":"Name","value":"centerLat"}},{"kind":"Field","name":{"kind":"Name","value":"zoom"}},{"kind":"Field","name":{"kind":"Name","value":"pitch"}},{"kind":"Field","name":{"kind":"Name","value":"bearing"}},{"kind":"Field","name":{"kind":"Name","value":"version"}}]}},{"kind":"Field","name":{"kind":"Name","value":"staleWrite"}},{"kind":"Field","name":{"kind":"Name","value":"deleted"}}]}}]}}]} as unknown as DocumentNode<UpdateBookmarkMutation, UpdateBookmarkMutationVariables>;
export const DeleteBookmarkDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteBookmark"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"BookmarkDeleteInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteBookmark"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"bookmark"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}},{"kind":"Field","name":{"kind":"Name","value":"staleWrite"}},{"kind":"Field","name":{"kind":"Name","value":"deleted"}}]}}]}}]} as unknown as DocumentNode<DeleteBookmarkMutation, DeleteBookmarkMutationVariables>;
export const EventLayersDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"EventLayers"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"tenantSlug"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},"defaultValue":{"kind":"StringValue","value":"flint","block":false}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"eventLayers"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"tenantSlug"},"value":{"kind":"Variable","name":{"kind":"Name","value":"tenantSlug"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}}]}}]}}]} as unknown as DocumentNode<EventLayersQuery, EventLayersQueryVariables>;
export const EventPlacementsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"EventPlacements"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"tenantSlug"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},"defaultValue":{"kind":"StringValue","value":"flint","block":false}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"eventSlug"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"placements"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"tenantSlug"},"value":{"kind":"Variable","name":{"kind":"Name","value":"tenantSlug"}}},{"kind":"Argument","name":{"kind":"Name","value":"eventSlug"},"value":{"kind":"Variable","name":{"kind":"Name","value":"eventSlug"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"eventLayerId"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"sublabel"}},{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"geometry"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"version"}}]}}]}}]} as unknown as DocumentNode<EventPlacementsQuery, EventPlacementsQueryVariables>;
export const EventTasksListDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"EventTasksList"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"tenantSlug"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},"defaultValue":{"kind":"StringValue","value":"flint","block":false}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"eventSlug"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"eventTasks"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"tenantSlug"},"value":{"kind":"Variable","name":{"kind":"Name","value":"tenantSlug"}}},{"kind":"Argument","name":{"kind":"Name","value":"eventSlug"},"value":{"kind":"Variable","name":{"kind":"Name","value":"eventSlug"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"eventLayerId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"ownerDisplay"}},{"kind":"Field","name":{"kind":"Name","value":"dueAt"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"placementId"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"version"}}]}}]}}]} as unknown as DocumentNode<EventTasksListQuery, EventTasksListQueryVariables>;
export const SpatialEventsListDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"SpatialEventsList"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"bbox"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"BboxInput"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"timeRange"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"TimeRangeInput"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"eventTypes"}},"type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}},"defaultValue":{"kind":"IntValue","value":"100"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"spatialEvents"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"bbox"},"value":{"kind":"Variable","name":{"kind":"Name","value":"bbox"}}},{"kind":"Argument","name":{"kind":"Name","value":"timeRange"},"value":{"kind":"Variable","name":{"kind":"Name","value":"timeRange"}}},{"kind":"Argument","name":{"kind":"Name","value":"eventTypes"},"value":{"kind":"Variable","name":{"kind":"Name","value":"eventTypes"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"eventType"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"summary"}},{"kind":"Field","name":{"kind":"Name","value":"occurredAt"}},{"kind":"Field","name":{"kind":"Name","value":"occurredRange"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"start"}},{"kind":"Field","name":{"kind":"Name","value":"end"}},{"kind":"Field","name":{"kind":"Name","value":"label"}}]}},{"kind":"Field","name":{"kind":"Name","value":"confidence"}},{"kind":"Field","name":{"kind":"Name","value":"reviewStatus"}},{"kind":"Field","name":{"kind":"Name","value":"geometry"}},{"kind":"Field","name":{"kind":"Name","value":"place"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"centroid"}}]}},{"kind":"Field","name":{"kind":"Name","value":"sources"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"trustTier"}}]}}]}}]}}]} as unknown as DocumentNode<SpatialEventsListQuery, SpatialEventsListQueryVariables>;
export const HistoricalReconstructionsAtDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"HistoricalReconstructionsAt"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"bbox"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"BboxInput"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"year"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"minConfidence"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Float"}},"defaultValue":{"kind":"FloatValue","value":"0.0"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"historicalReconstructions"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"bbox"},"value":{"kind":"Variable","name":{"kind":"Name","value":"bbox"}}},{"kind":"Argument","name":{"kind":"Name","value":"year"},"value":{"kind":"Variable","name":{"kind":"Name","value":"year"}}},{"kind":"Argument","name":{"kind":"Name","value":"minConfidence"},"value":{"kind":"Variable","name":{"kind":"Name","value":"minConfidence"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"civicObjectId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"position"}},{"kind":"Field","name":{"kind":"Name","value":"footprint"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"widthMeters"}},{"kind":"Field","name":{"kind":"Name","value":"depthMeters"}}]}},{"kind":"Field","name":{"kind":"Name","value":"heightMeters"}},{"kind":"Field","name":{"kind":"Name","value":"bearingDegrees"}},{"kind":"Field","name":{"kind":"Name","value":"confidence"}},{"kind":"Field","name":{"kind":"Name","value":"timeStart"}},{"kind":"Field","name":{"kind":"Name","value":"timeEnd"}},{"kind":"Field","name":{"kind":"Name","value":"geometryUrl"}},{"kind":"Field","name":{"kind":"Name","value":"geometryFormat"}},{"kind":"Field","name":{"kind":"Name","value":"foundryAssetUrl"}},{"kind":"Field","name":{"kind":"Name","value":"sources"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"trustTier"}}]}}]}}]}}]} as unknown as DocumentNode<HistoricalReconstructionsAtQuery, HistoricalReconstructionsAtQueryVariables>;
export const HistoricalReconstructionByIdDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"HistoricalReconstructionById"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"historicalReconstruction"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"civicObjectId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"position"}},{"kind":"Field","name":{"kind":"Name","value":"footprint"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"widthMeters"}},{"kind":"Field","name":{"kind":"Name","value":"depthMeters"}}]}},{"kind":"Field","name":{"kind":"Name","value":"heightMeters"}},{"kind":"Field","name":{"kind":"Name","value":"bearingDegrees"}},{"kind":"Field","name":{"kind":"Name","value":"confidence"}},{"kind":"Field","name":{"kind":"Name","value":"timeStart"}},{"kind":"Field","name":{"kind":"Name","value":"timeEnd"}},{"kind":"Field","name":{"kind":"Name","value":"geometryUrl"}},{"kind":"Field","name":{"kind":"Name","value":"geometryFormat"}},{"kind":"Field","name":{"kind":"Name","value":"foundryAssetUrl"}},{"kind":"Field","name":{"kind":"Name","value":"sources"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"homepageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"sourceType"}},{"kind":"Field","name":{"kind":"Name","value":"trustTier"}},{"kind":"Field","name":{"kind":"Name","value":"lastChecked"}},{"kind":"Field","name":{"kind":"Name","value":"knownLimits"}}]}}]}}]}}]} as unknown as DocumentNode<HistoricalReconstructionByIdQuery, HistoricalReconstructionByIdQueryVariables>;
export const AtlasManifestDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AtlasManifest"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"manifest"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"atlasId"}},{"kind":"Field","name":{"kind":"Name","value":"builtAt"}},{"kind":"Field","name":{"kind":"Name","value":"schemaVersion"}},{"kind":"Field","name":{"kind":"Name","value":"placeCount"}},{"kind":"Field","name":{"kind":"Name","value":"sourceCount"}},{"kind":"Field","name":{"kind":"Name","value":"signalCount"}},{"kind":"Field","name":{"kind":"Name","value":"metricCount"}},{"kind":"Field","name":{"kind":"Name","value":"historicalReconstructionCount"}},{"kind":"Field","name":{"kind":"Name","value":"privacyNotes"}}]}}]}}]} as unknown as DocumentNode<AtlasManifestQuery, AtlasManifestQueryVariables>;
export const SubmitObservationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SubmitObservation"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ObservationInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"submitObservation"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"receiptId"}},{"kind":"Field","name":{"kind":"Name","value":"submissionId"}},{"kind":"Field","name":{"kind":"Name","value":"acknowledgedAt"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"nextReviewWindowLabel"}},{"kind":"Field","name":{"kind":"Name","value":"contributorVisibleNotes"}}]}}]}}]} as unknown as DocumentNode<SubmitObservationMutation, SubmitObservationMutationVariables>;
export const PlacesByBboxDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"PlacesByBbox"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"bbox"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"BboxInput"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"types"}},"type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"PlaceType"}}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}},"defaultValue":{"kind":"IntValue","value":"500"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"placesByBbox"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"bbox"},"value":{"kind":"Variable","name":{"kind":"Name","value":"bbox"}}},{"kind":"Argument","name":{"kind":"Name","value":"types"},"value":{"kind":"Variable","name":{"kind":"Name","value":"types"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"placeType"}},{"kind":"Field","name":{"kind":"Name","value":"geometry"}},{"kind":"Field","name":{"kind":"Name","value":"centroid"}},{"kind":"Field","name":{"kind":"Name","value":"confidence"}},{"kind":"Field","name":{"kind":"Name","value":"temporalStatus"}},{"kind":"Field","name":{"kind":"Name","value":"reviewStatus"}},{"kind":"Field","name":{"kind":"Name","value":"lastUpdated"}}]}}]}}]} as unknown as DocumentNode<PlacesByBboxQuery, PlacesByBboxQueryVariables>;
export const PlacesByTimeRangeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"PlacesByTimeRange"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"range"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"TimeRangeInput"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"bbox"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"BboxInput"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"types"}},"type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"PlaceType"}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"placesByTimeRange"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"range"},"value":{"kind":"Variable","name":{"kind":"Name","value":"range"}}},{"kind":"Argument","name":{"kind":"Name","value":"bbox"},"value":{"kind":"Variable","name":{"kind":"Name","value":"bbox"}}},{"kind":"Argument","name":{"kind":"Name","value":"types"},"value":{"kind":"Variable","name":{"kind":"Name","value":"types"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"placeType"}},{"kind":"Field","name":{"kind":"Name","value":"centroid"}},{"kind":"Field","name":{"kind":"Name","value":"confidence"}},{"kind":"Field","name":{"kind":"Name","value":"temporalStatus"}}]}}]}}]} as unknown as DocumentNode<PlacesByTimeRangeQuery, PlacesByTimeRangeQueryVariables>;
export const PlaceByIdDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"PlaceById"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"place"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"placeType"}},{"kind":"Field","name":{"kind":"Name","value":"geometry"}},{"kind":"Field","name":{"kind":"Name","value":"bbox"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"west"}},{"kind":"Field","name":{"kind":"Name","value":"south"}},{"kind":"Field","name":{"kind":"Name","value":"east"}},{"kind":"Field","name":{"kind":"Name","value":"north"}}]}},{"kind":"Field","name":{"kind":"Name","value":"centroid"}},{"kind":"Field","name":{"kind":"Name","value":"parentId"}},{"kind":"Field","name":{"kind":"Name","value":"childIds"}},{"kind":"Field","name":{"kind":"Name","value":"confidence"}},{"kind":"Field","name":{"kind":"Name","value":"temporalStatus"}},{"kind":"Field","name":{"kind":"Name","value":"reviewStatus"}},{"kind":"Field","name":{"kind":"Name","value":"lastUpdated"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"sources"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"sourceType"}},{"kind":"Field","name":{"kind":"Name","value":"trustTier"}},{"kind":"Field","name":{"kind":"Name","value":"lastChecked"}}]}}]}}]}}]} as unknown as DocumentNode<PlaceByIdQuery, PlaceByIdQueryVariables>;
export const ProvenanceDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Provenance"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"placeId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"sourceId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"provenanceFor"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"placeId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"placeId"}}},{"kind":"Argument","name":{"kind":"Name","value":"sourceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"sourceId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nodeCount"}},{"kind":"Field","name":{"kind":"Name","value":"edgeCount"}},{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"labels"}},{"kind":"Field","name":{"kind":"Name","value":"properties"}}]}},{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"source"}},{"kind":"Field","name":{"kind":"Name","value":"target"}},{"kind":"Field","name":{"kind":"Name","value":"edgeType"}},{"kind":"Field","name":{"kind":"Name","value":"weight"}}]}}]}}]}}]} as unknown as DocumentNode<ProvenanceQuery, ProvenanceQueryVariables>;
export const PromoteResearchArtifactDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"PromoteResearchArtifact"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ResearchArtifactPromotionInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"promoteResearchArtifact"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"artifactId"}},{"kind":"Field","name":{"kind":"Name","value":"artifactKey"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]}}]} as unknown as DocumentNode<PromoteResearchArtifactMutation, PromoteResearchArtifactMutationVariables>;
export const SearchAtlasDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"SearchAtlas"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"query"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"bbox"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"BboxInput"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"timeRange"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"TimeRangeInput"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"minConfidence"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Float"}},"defaultValue":{"kind":"FloatValue","value":"0.6"}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}},"defaultValue":{"kind":"IntValue","value":"25"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"searchAtlas"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"query"},"value":{"kind":"Variable","name":{"kind":"Name","value":"query"}}},{"kind":"Argument","name":{"kind":"Name","value":"bbox"},"value":{"kind":"Variable","name":{"kind":"Name","value":"bbox"}}},{"kind":"Argument","name":{"kind":"Name","value":"timeRange"},"value":{"kind":"Variable","name":{"kind":"Name","value":"timeRange"}}},{"kind":"Argument","name":{"kind":"Name","value":"minConfidence"},"value":{"kind":"Variable","name":{"kind":"Name","value":"minConfidence"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"query"}},{"kind":"Field","name":{"kind":"Name","value":"totalResultCount"}},{"kind":"Field","name":{"kind":"Name","value":"reranked"}},{"kind":"Field","name":{"kind":"Name","value":"acceptedConfidenceFloor"}},{"kind":"Field","name":{"kind":"Name","value":"inferredTimeRange"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"start"}},{"kind":"Field","name":{"kind":"Name","value":"end"}},{"kind":"Field","name":{"kind":"Name","value":"label"}}]}},{"kind":"Field","name":{"kind":"Name","value":"places"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"placeType"}},{"kind":"Field","name":{"kind":"Name","value":"centroid"}},{"kind":"Field","name":{"kind":"Name","value":"confidence"}},{"kind":"Field","name":{"kind":"Name","value":"temporalStatus"}}]}},{"kind":"Field","name":{"kind":"Name","value":"signals"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"signalKind"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"summary"}},{"kind":"Field","name":{"kind":"Name","value":"publishedAt"}},{"kind":"Field","name":{"kind":"Name","value":"relativeTimeLabel"}},{"kind":"Field","name":{"kind":"Name","value":"confidence"}},{"kind":"Field","name":{"kind":"Name","value":"place"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"events"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"summary"}},{"kind":"Field","name":{"kind":"Name","value":"occurredAt"}},{"kind":"Field","name":{"kind":"Name","value":"confidence"}},{"kind":"Field","name":{"kind":"Name","value":"place"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"historicalReconstructions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"position"}},{"kind":"Field","name":{"kind":"Name","value":"confidence"}},{"kind":"Field","name":{"kind":"Name","value":"timeStart"}},{"kind":"Field","name":{"kind":"Name","value":"timeEnd"}}]}},{"kind":"Field","name":{"kind":"Name","value":"sources"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"sourceType"}},{"kind":"Field","name":{"kind":"Name","value":"trustTier"}}]}}]}}]}}]} as unknown as DocumentNode<SearchAtlasQuery, SearchAtlasQueryVariables>;
export const SignalsInBboxDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"SignalsInBbox"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"bbox"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"BboxInput"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"kinds"}},"type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SignalKind"}}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"minConfidence"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Float"}},"defaultValue":{"kind":"FloatValue","value":"0.6"}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}},"defaultValue":{"kind":"IntValue","value":"50"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"signals"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"bbox"},"value":{"kind":"Variable","name":{"kind":"Name","value":"bbox"}}},{"kind":"Argument","name":{"kind":"Name","value":"kinds"},"value":{"kind":"Variable","name":{"kind":"Name","value":"kinds"}}},{"kind":"Argument","name":{"kind":"Name","value":"minConfidence"},"value":{"kind":"Variable","name":{"kind":"Name","value":"minConfidence"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"signalKind"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"summary"}},{"kind":"Field","name":{"kind":"Name","value":"publishedAt"}},{"kind":"Field","name":{"kind":"Name","value":"receivedAt"}},{"kind":"Field","name":{"kind":"Name","value":"relativeTimeLabel"}},{"kind":"Field","name":{"kind":"Name","value":"confidence"}},{"kind":"Field","name":{"kind":"Name","value":"reviewStatus"}},{"kind":"Field","name":{"kind":"Name","value":"visibilityLevel"}},{"kind":"Field","name":{"kind":"Name","value":"warningCopy"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"geometry"}},{"kind":"Field","name":{"kind":"Name","value":"source"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"sourceType"}},{"kind":"Field","name":{"kind":"Name","value":"trustTier"}}]}},{"kind":"Field","name":{"kind":"Name","value":"place"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"centroid"}}]}}]}}]}}]} as unknown as DocumentNode<SignalsInBboxQuery, SignalsInBboxQueryVariables>;
export const SourcesListDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"SourcesList"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"sourceTypes"}},"type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SourceType"}}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"minTrustTier"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"TrustTier"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sources"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"sourceTypes"},"value":{"kind":"Variable","name":{"kind":"Name","value":"sourceTypes"}}},{"kind":"Argument","name":{"kind":"Name","value":"minTrustTier"},"value":{"kind":"Variable","name":{"kind":"Name","value":"minTrustTier"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"homepageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"sourceType"}},{"kind":"Field","name":{"kind":"Name","value":"publicUseTerms"}},{"kind":"Field","name":{"kind":"Name","value":"trustTier"}},{"kind":"Field","name":{"kind":"Name","value":"lastChecked"}},{"kind":"Field","name":{"kind":"Name","value":"knownLimits"}},{"kind":"Field","name":{"kind":"Name","value":"containsPersonalData"}}]}}]}}]} as unknown as DocumentNode<SourcesListQuery, SourcesListQueryVariables>;
export const SourceByIdDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"SourceById"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"source"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"homepageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"sourceType"}},{"kind":"Field","name":{"kind":"Name","value":"publicUseTerms"}},{"kind":"Field","name":{"kind":"Name","value":"trustTier"}},{"kind":"Field","name":{"kind":"Name","value":"lastChecked"}},{"kind":"Field","name":{"kind":"Name","value":"knownLimits"}},{"kind":"Field","name":{"kind":"Name","value":"containsPersonalData"}}]}}]}}]} as unknown as DocumentNode<SourceByIdQuery, SourceByIdQueryVariables>;