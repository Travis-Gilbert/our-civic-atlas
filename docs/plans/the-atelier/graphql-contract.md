# The Atelier: GraphQL Contract Extensions

Generated 2026-05-23 as Deliverable B of the Atelier planning artifact.

This document specifies the GraphQL surface the Atelier UI needs from the Civic Atlas backend. It extends `docs/design/flint-graphql-schema-v1.graphql` (currently marked "draft for review" in its header) and follows the established architectural rule: **the Civic Atlas frontend talks to one boundary only, GraphQL, and all service-tier auth lives on the Axum civic-atlas-server resolver, never in the frontend**.

The Atelier needs no new authentication, no new client-side credentials, and no new Next.js Route Handler. Every new capability is a GraphQL field whose resolver lives in `our-civic-atlas-backend` and attaches `TenantContext` server-side, exactly like the existing `civicResearch` mutation pattern at `flint-graphql-schema-v1.graphql` lines 619 to 641.

## Architectural rules these extensions honor

From project CLAUDE.md §"Service-Tier Auth Stays Server-Side. No Frontend-Held Tokens.":

- Civic Atlas frontend talks to one boundary only: GraphQL
- All service-tier auth (Theseus harness, Modal/Ray, etc.) lives on the Axum service
- `NEXT_PUBLIC_*` env vars carry the GraphQL endpoint URL and feature flags only; never credentials
- Route Handlers under `src/app/api/` are reserved for local fixture shims, trivially public endpoints, or work that genuinely cannot move to GraphQL; the Atelier passes none of those three tests

The canonical wiring contract repeats here for the Atelier:

```
Theseus harness (Index-API, Strawberry / future gRPC)
  └─ gRPC client (our-civic-atlas-backend `theseus-client` crate)
     └─ Axum civic-atlas-server resolver
        └─ GraphQL response to the Civic Atlas frontend
           └─ urql query/mutation in the relevant component
```

## Mapping spec sections to schema extensions

The Atelier spec (`SPEC-THE-ATELIER.md`) prescribes specific data shapes for the animation, source cards, conflict markers, and dossier panel. Each prescription gets a schema extension below, tagged with the spec line range it implements.

| Spec section | Spec lines | Schema change | Resolver location |
|---|---|---|---|
| Evidence gathering source cards | 64 to 77 | New `EvidenceItem` type, `evidenceForReconstruction` query | Axum `our-civic-atlas-backend` |
| Direct extraction confidence + source attribution | 78 to 96 | Extend `HistoricalReconstruction.sources` with per-source provenance | Axum |
| Block subgraph highlight | 98 to 104 | New `blockSubgraphForReconstruction` query | Axum (read from `BlockSubgraphRepository`) |
| Pairformer inference confidence overlay | 106 to 126 | Extend per-part confidence with model attribution | Axum |
| Merge conflict surfacing | 128 to 146 | New `MergeConflict` type, `conflictsForReconstruction` query | Axum (read from merge step output) |
| Asset generation (Stage 6) | 148 to 160 | Use existing `HistoricalReconstruction.geometryUrl` + `geometryFormat`, no change | Axum |
| Settled-state dossier | 162 to 170, 197 to 235 | New `ReconstructionDossier` type bundling everything | Axum (composes existing resolvers) |
| Replay / pipeline-trace | 173 to 176 | OPTIONAL `ReconstructionPipelineTrace` query for backend-emitted stage events; defer to v1.x | Axum (requires engine instrumentation) |

## Existing schema items the Atelier consumes without change

These already exist in `flint-graphql-schema-v1.graphql` and the Atelier reads them as-is:

- `HistoricalReconstruction` type (lines 275 to 298): id, civicObjectId, name, description, position, footprint, heightMeters, bearingDegrees, confidence (top-level Mass), timeStart, timeEnd, sources, geometryUrl, geometryFormat, foundryAssetUrl
- `historicalReconstructions(bbox, year, minConfidence)` query (lines 549 to 554)
- `historicalReconstruction(id)` query (line 556)
- `Source` type (lines 224 to 235): id, name, homepageUrl, sourceType, publicUseTerms, trustTier, lastChecked, knownLimits, containsPersonalData
- `SourceType` enum (lines 69 to 78): `HISTORICAL_ARCHIVE`, `PHOTO_ARCHIVE`, `PUBLIC_RECORD`, `OFFICIAL_GOVERNMENT`, `COMMUNITY`, `ACADEMIC`, `NEWS`, `MAP_SERVICE`
- `provenanceFor(placeId, sourceId): ProvenanceGraph` (line 590) for the existing CosmosProvenancePanel

The Atelier extensions add to these, not replace them.

## Extension 1: Per-part confidence

**Backreference:** spec lines 117 (Pairformer overlay, "anything inferred renders with a visible 'I'm a guess' treatment"), 197 to 235 (dossier per-part rows).

The existing `HistoricalReconstruction.confidence` is a single top-level value. The frontend fixture already carries per-part values (`facade_confidence`, `roof_confidence`, `ground_floor_confidence`) and the `ConfidenceMixMeshLayer` shader already consumes them. The schema needs to surface what the fixture already proves.

```graphql
extend type HistoricalReconstruction {
  """Per-part confidences. Each in [0, 1]. When null, the consumer falls back
  to the top-level `confidence` (Mass) for that zone, so a Mass-only record
  still renders sensibly. Maps to `ReconstructionSpec.{facades[0],roof,ground_floor}.provenance.confidence`
  in the backend."""
  facadeConfidence: Float
  roofConfidence: Float
  groundFloorConfidence: Float

  """The roof form drives mesh dispatch. Maps to `ReconstructionSpec.roof.form`.
  Frontend value enum matches `RoofForm` in `src/lib/atlas/historical-reconstruction.ts`."""
  roofForm: RoofForm
}

enum RoofForm {
  FLAT
  GABLE
  HIPPED
}
```

Resolver: thin pass-through from the existing `ReconstructionSpec` row in PostGIS to GraphQL. The backend already produces these values; the schema currently does not expose them.

## Extension 2: EvidenceBundle and EvidenceItem

**Backreference:** spec lines 64 to 96 (evidence cards and direct extraction).

The atelier renders source cards on screen, one per evidence item. Each card carries a type (Sanborn / photograph / directory entry / text mention), the source it cites, a confidence score, and (optionally) a thumbnail URL the card can render.

```graphql
"""A single piece of archival evidence that fed into a reconstruction.
The atelier renders one source card per item, with visual identity dispatched
on `evidenceType`."""
type EvidenceItem {
  """Stable id. Prefix: `evidence:`."""
  id: ID!

  """Which reconstruction this evidence supports."""
  reconstructionId: ID!

  """The source this evidence is drawn from. Carries trust tier, known limits,
  public-use terms (existing Source type)."""
  source: Source!

  """The type of evidence. Drives card visual identity per spec lines 36-38:
  SANBORN = amber paper + sepia lines
  PHOTOGRAPH = chamfered frame
  DIRECTORY = typewritten card
  TEXT_MENTION = italic quote slip
  OTHER = neutral paper card"""
  evidenceType: EvidenceType!

  """Where in the reconstruction node tree this evidence applies. Null when
  the evidence is whole-building. Format matches `ReconstructionNodeId`
  in `src/lib/atlas/reconstruction-node-tree.ts` (e.g.,
  'reconstruction-node:historical:carriage-town:whaley-house:facade')."""
  targetNodeId: String

  """Confidence the engine assigned to this evidence item, in [0, 1]."""
  confidence: Float!

  """Optional URL to a thumbnail the card can render (a cropped Sanborn detail,
  a period photograph, a directory excerpt scan). Same-origin or CORS-friendly
  origin. Null when the card renders text-only."""
  thumbnailUrl: String

  """Brief plain-language summary the card surfaces under the source name
  (e.g., 'Sanborn 1925 sheet 18, shows three-story brick mass with hipped roof')."""
  summary: String

  """ISO 8601 date the source originates from (the year on the Sanborn sheet,
  the date stamped on the photograph, etc.). Distinct from `Source.lastChecked`
  which is when we audited the source for freshness."""
  sourceDateLabel: String
}

enum EvidenceType {
  SANBORN
  PHOTOGRAPH
  DIRECTORY
  TEXT_MENTION
  PLAT_MAP
  HABS_RECORD
  CITY_DIRECTORY
  OTHER
}

"""Bundle of all evidence backing one reconstruction. Distinct from
ProvenanceGraph because EvidenceItem is reconstruction-scoped and carries
per-part targetNodeId, while ProvenanceNode is generic graph topology."""
type EvidenceBundle {
  reconstructionId: ID!
  items: [EvidenceItem!]!
  totalCount: Int!
}
```

Query:

```graphql
extend type Query {
  """Returns the evidence bundle for one reconstruction. Used by the atelier
  to render source cards around the building footprint. The atelier dispatches
  card visual identity on `EvidenceItem.evidenceType`."""
  evidenceForReconstruction(reconstructionId: ID!): EvidenceBundle!
}
```

Resolver: reads from `EvidenceRepository` in the Rust engine via gRPC, returns the bundle. The `PostgisRepository` impl at `our-civic-atlas-backend/crates/civic-atlas-reconstruction-engine/src/lib.rs:1188-1311` already has the SQL.

## Extension 3: MergeConflict

**Backreference:** spec lines 128 to 146 (conflict markers and the merge step).

```graphql
"""A disagreement between evidence sources resolved by the merge step.
Surfaces on the building as a clickable terracotta marker per spec lines 130-146.
The atelier's conflict marker module renders one marker per conflict at the
geometry of the targetNodeId's part."""
type MergeConflict {
  """Stable id. Prefix: `merge-conflict:`."""
  id: ID!

  """Which reconstruction this conflict is in."""
  reconstructionId: ID!

  """Which part of the reconstruction the conflict targets. Stable
  reconstruction-node-tree id."""
  targetNodeId: String!

  """Plain civic-language field name (e.g., 'Stories', 'Roof material',
  'Facade color'). Used as the conflict marker label."""
  fieldLabel: String!

  """One entry per disagreeing source. Order: most-confident first."""
  disagreements: [MergeDisagreement!]!

  """The value the merge step chose."""
  resolvedValue: String!

  """Plain-language explanation of WHY this value won (e.g.,
  'Sanborn wins, threshold 0.7'). Shown in the marker's expanded view."""
  resolutionExplanation: String!

  """The confidence threshold the merge step applied (default 0.7 per
  the Track 2 audit reference). Surfaced so a researcher can see the
  threshold that decided the call."""
  resolutionThreshold: Float!
}

type MergeDisagreement {
  """Reference to the source whose evidence is in this disagreement."""
  source: Source!

  """Plain-language label of what this source said (e.g., '2 stories',
  '3 stories', 'brick', 'wood frame')."""
  statedValue: String!

  """Engine confidence in this evidence item."""
  confidence: Float!

  """Reference to the underlying evidence item (so the marker can deep-link
  to the source card)."""
  evidenceItemId: ID!
}
```

Query:

```graphql
extend type Query {
  """Returns the conflicts the merge step surfaced for one reconstruction.
  Empty array when no conflicts (consistent evidence). The atelier renders
  one marker per conflict. Markers stay visible as long as the atelier is
  open per spec line 144."""
  conflictsForReconstruction(reconstructionId: ID!): [MergeConflict!]!
}
```

Resolver: reads from the merge step output. The Rust engine produces structured conflicts but the schema does not yet surface them. The resolver wraps the existing merge output.

## Extension 4: BlockSubgraph

**Backreference:** spec lines 98 to 104 (block subgraph stage, "the building isn't being guessed at, it's being inferred from its block").

```graphql
"""The block-scope subgraph the engine consulted when reconstructing a building.
Used by the atelier Stage 3 highlight pulse: neighbors flash in, connection
lines shimmer with relation labels, then fade so the focus building stays."""
type BlockSubgraph {
  reconstructionId: ID!

  """Neighboring reconstructions the engine consulted."""
  neighbors: [BlockNeighbor!]!
}

type BlockNeighbor {
  """The neighboring reconstruction."""
  reconstruction: HistoricalReconstruction!

  """The relation between focus and neighbor. Limited to the relations
  vocabulary in `CivicPairformerConfig`: 'adjacent_to', 'fronts_street',
  'same_block_as', 'anchored_by', 'temporal_predecessor_of',
  'temporal_successor_of', 'similar_to', 'shares_party_wall',
  'shares_setback_line', 'shares_cornice_line'."""
  relation: String!

  """Strength of the relation in [0, 1]. The atelier uses this to modulate
  the connection-line opacity."""
  strength: Float!
}
```

Query:

```graphql
extend type Query {
  """Returns the block-scope subgraph the engine consulted for one reconstruction.
  Used by atelier Stage 3 (block subgraph highlight)."""
  blockSubgraphForReconstruction(reconstructionId: ID!): BlockSubgraph!
}
```

Resolver: reads from `BlockSubgraphRepository` in the Rust engine (`lib.rs` lines 1312 to 1830).

## Extension 5: ReconstructionDossier (the v1 atelier round-trip)

**Backreference:** spec lines 197 to 235 (the dossier example, "RECONSTRUCTION DOSSIER").

The atelier surface fires a single query when it opens, composing everything the dossier panel needs. This avoids waterfall fetches inside the animation timeline; the data is in hand before the camera moves.

```graphql
"""One-shot atelier payload. Bundles the reconstruction itself, its evidence,
its conflicts, its block subgraph, and its sources. Used by the atelier
on open. Empty arrays when the engine has no data (e.g., evidence-poor parcels);
never null."""
type ReconstructionDossier {
  reconstruction: HistoricalReconstruction!
  evidence: EvidenceBundle!
  conflicts: [MergeConflict!]!
  blockSubgraph: BlockSubgraph!

  """The Pascal-node tree the atelier uses to address parts. Matches
  `ReconstructionNodeTree` in `src/lib/atlas/reconstruction-node-tree.ts`.
  Carried as JSON because the tree shape evolves faster than schema
  can re-version (the existing `JSON` scalar pattern)."""
  nodeTree: JSON!

  """Plain civic-language summary the dossier renders at the top.
  Aggregate of source counts, confidence, and time range. The frontend
  does not regenerate this string; the resolver authors it once."""
  summary: String!

  """Optional debug metadata for telemetry. Never user-facing."""
  debug: JSON
}
```

Query:

```graphql
extend type Query {
  """Returns the full atelier-open payload for one reconstruction.
  Single round-trip so the atelier can prepare the side panel and the
  animation stage data without N+1 fetches."""
  reconstructionDossier(reconstructionId: ID!): ReconstructionDossier!
}
```

Resolver: composes `evidenceForReconstruction`, `conflictsForReconstruction`, `blockSubgraphForReconstruction`, and `historicalReconstruction`. Returns a single payload. No new backend storage; just composition.

## Extension 7: saveReconstruction mutation (added 2026-05-23, v1 scope)

**Backreference:** spec line 169 ("save the reconstruction (in a future iteration, contribute corrections)"); base SAVE in v1, corrections in v2 per the parenthetical.

The user added this to v1 scope at PT-001 design-gate approval time: Axum + Postgres + PostGIS support writes today; the smallest viable save fits cleanly in the existing backend without waiting on the upcoming files SDK or the in-deployment RustyRed graph DB.

Follows the established `submitObservation` write pattern (schema lines 597 to 601): no auth required, optional contributor email for a receipt, server-side persistence via Axum resolver with `TenantContext` attached.

```graphql
"""A saved reconstruction view. Returned by saveReconstruction. The id and
shareUrl let the user return to the exact atelier surface they saved."""
type SavedReconstruction {
  """Stable id. Prefix: `saved-reconstruction:`."""
  id: ID!

  """The reconstruction this save points to."""
  reconstructionId: ID!

  """The atlas year at the moment of save (atelier renders this year)."""
  year: Int!

  """Stable URL the user can bookmark or share. Routes to the atelier
  surface preloaded with the saved reconstruction and year. Example:
  '/open-flint-atlas/atelier/saved/saved-reconstruction:abc123'."""
  shareUrl: String!

  """ISO 8601 timestamp the save was created."""
  savedAt: DateTime!

  """Optional: when contributor_email was provided, the email a receipt
  was sent to. Never returned in queries from other users. Always null
  in v1 because save is anonymous-friendly; the receipt-recall path is
  v1.x."""
  contributorEmailDigest: String
}

"""Input for the saveReconstruction mutation."""
input SaveReconstructionInput {
  """Which reconstruction is being saved."""
  reconstructionId: ID!

  """The atlas year at the moment of save. Used to route back to the
  exact atelier view."""
  year: Int!

  """Optional contributor email for a receipt and future recall. When
  omitted, the returned shareUrl is the only handle for retrieval (the
  user must bookmark it or share it themselves)."""
  contributorEmail: String

  """Optional plain-text caption the user attached at save time
  ('My family lived next door to this in 1925'). Stored alongside the
  save; visible only to the saver in v1. v2 surfaces captions in a
  community-saved view."""
  caption: String
}
```

Mutation:

```graphql
extend type Mutation {
  """Persist a reconstruction view so the user can return to it. Follows
  the same anonymous-but-receipt-able write pattern as submitObservation
  (no auth required; optional email for receipt). Resolver writes to a
  new Postgres table `saved_reconstructions` via the Axum
  civic-atlas-server resolver; TenantContext is attached server-side.

  Does NOT block on the files SDK (upcoming) or the RustyRed graph DB
  (deploying). Uses only existing Axum + Postgres + PostGIS
  infrastructure.

  v2 extends this with user-edited corrections (per spec line 169
  parenthetical 'in a future iteration, contribute corrections'); the
  v2 path requires the files SDK + RustyRed graph state to land first
  but does NOT require changing this mutation's v1 shape."""
  saveReconstruction(input: SaveReconstructionInput!): SavedReconstruction!
}
```

Query for retrieval:

```graphql
extend type Query {
  """Returns a saved reconstruction by its id. Used by the
  /open-flint-atlas/atelier/saved/<saved-id> route to preload the
  atelier with the user's saved view. Public read; no auth required."""
  savedReconstruction(id: ID!): SavedReconstruction
}
```

Resolver expectations:

- New Postgres table `saved_reconstructions` with columns: `id`, `reconstruction_id`, `year`, `share_url`, `saved_at`, `contributor_email_hash` (nullable; hashed for the receipt-digest field), `caption` (nullable), `tenant_id` (from `TenantContext`)
- Indexes on `id` (primary key), `reconstruction_id`, `tenant_id`
- The Axum resolver derives `share_url` from the `id`; the URL is the canonical artifact
- Receipt email (when `contributorEmail` provided) follows the same delivery path as `submitObservation`

Frontend wiring (per `implementation-plan.md` PT-103b, PT-405):

- `useReconstructionSave` hook at `src/lib/atlas/use-reconstruction-save.ts` exposes `saveReconstruction(reconstructionId, year, email?, caption?)`
- The atelier's `<AtelierControls>` Save button calls the hook on click; renders a brief inline confirmation showing the share URL + a "Copy link" affordance
- The saved-reconstruction route at `src/app/open-flint-atlas/atelier/saved/[savedId]/page.tsx` queries `savedReconstruction(id)` and mounts the atelier with the resolved `reconstructionId` + `year`

## Extension 6: ReconstructionPipelineTrace (DEFERRED to v1.x, gated on engine instrumentation)

**Backreference:** spec lines 173 to 176 (replay), spec lines 64 to 167 (the 8 animation stages).

The atelier animation choreographer (`animation-choreography.md`) ships v1 against a CLIENT-SIDE deterministic replay of the 8 stages, driven by the `ReconstructionDossier` payload. This avoids requiring backend instrumentation for v1 and matches the spec's tolerance for "the atelier UI can be built and demoed against mock reconstructions while the model and corpus mature."

For v1.x (when the Rust engine instruments per-stage events), the schema gains:

```graphql
"""Backend-emitted per-stage trace from the reconstruction engine. v1.x feature
that lets the atelier replay an actual run rather than a deterministic synthesis
from the final spec. Until the engine instruments events, this query is not
implemented and the frontend defaults to its own synthesis."""
type ReconstructionPipelineTrace {
  reconstructionId: ID!
  stages: [PipelineStageEvent!]!
}

type PipelineStageEvent {
  """One of the 8 stages from spec lines 51 to 170."""
  stage: PipelineStage!

  """Wall-clock duration of the actual backend stage. The atelier choreographer
  IGNORES this for animation timing (spec budgets are authored); used for
  telemetry only."""
  durationMs: Int!

  """Stage-specific structured payload (per-stage type varies; documented in
  the resolver). Carried as JSON for the same versioning reason as nodeTree."""
  payload: JSON!
}

enum PipelineStage {
  ENTRY
  EVIDENCE_GATHERING
  DIRECT_EXTRACTION
  BLOCK_SUBGRAPH
  PAIRFORMER_INFERENCE
  MERGE_WITH_CONFLICTS
  ASSET_GENERATION
  SETTLED
}

extend type Query {
  """Returns the per-stage trace from the backend engine. NOT IMPLEMENTED in
  v1; resolver returns a 'not-instrumented' error tagged the same way as
  ZeroEmbeddingProvider per the Track 2 audit honesty pattern. Frontend
  catches the error and falls back to client-side synthesis."""
  reconstructionPipelineTrace(reconstructionId: ID!): ReconstructionPipelineTrace
}
```

The v1 path does NOT call this query. The v1.x track introduces the backend instrumentation and only then does the frontend swap to read the real trace. Both paths produce the same visible animation; the backend trace is a fidelity upgrade, not a feature add.

## What this contract intentionally does NOT add

These were considered and rejected (or deferred):

| Item | Why not v1 |
|---|---|
| Atelier-specific mutations (save corrections, contribute sources) | Spec v2 (lines 262 to 267); the atelier intentionally avoids write paths in v1 |
| Live multi-user reconstruction sessions | Spec v3 (line 272) |
| AR-specific GraphQL fields | Spec v3 (line 271) |
| Federation across multiple Civic Atlases | Out of scope; the schema is single-atlas |
| Server-side animation orchestration | The choreographer is intentionally client-side for v1 (avoids stateful sessions over WebSocket) |

## Frontend consumption pattern

Per `package.json`, the project uses `@urql/next` and `graphql-codegen` with config at `codegen.ts`. The Atelier follows the established pattern (see existing queries at `src/lib/api/graphql/queries/*.graphql`):

1. The atelier route fires one `useQuery` call with `reconstructionDossier(reconstructionId)` on mount
2. The animation choreographer consumes the resolved payload as a deterministic input; no further fetches during the animation
3. Conflict marker click handlers and source card click handlers reference items already in the payload by id; no additional queries
4. Codegen produces a typed hook (e.g., `useReconstructionDossierQuery`) that the atelier surface consumes via urql's standard React bindings

Mock fallback: when the GraphQL endpoint is unreachable in development, the existing `useHistoricalReconstructions` hook fallback pattern applies. The atelier's hook (`useReconstructionDossier`) constructs an in-memory `ReconstructionDossier` from `FLINT_LOST_RECONSTRUCTIONS` + a small frontend-side synthesizer that produces plausible `EvidenceItem` and `MergeConflict` placeholders FROM the fixture's `source_ids` and per-part confidence values. This is NOT mock UI in the project-CLAUDE.md sense (the underlying reconstruction is real fixture data); it is a deterministic frontend rendering of incomplete backend state. The fallback only fires in dev when the API is unreachable; production paths always go through the resolver.

When `DecodedArtifact` rows land for Carriage Town (Track 2 audit's named engineering work), the resolver returns real data; the fallback synthesizer becomes dormant; the visible product is identical. This is the seam that makes "v1 ships against fixture, then upgrades silently when backend catches up" work.

## Open questions for the backend team

These belong in `our-civic-atlas-backend`'s planning, not in this Atelier plan, but are listed here so the Axum team has a clean checklist when they pick up the resolver work:

1. **Resolver caching policy**: a single `reconstructionDossier(id)` call composes 4 reads. Cache the composed result for a few seconds at the resolver, or rely on the underlying repository caches? The hot path is "user opens atelier on Whaley House"; the same dossier may be requested repeatedly by different visitors. Resolver-level caching (5-minute TTL) is the conservative default.
2. **`MergeConflict.resolvedValue` typing**: rendered as `String!` for now (plain-language label). If the merge step produces structured outputs (an enum value, a numeric value, a categorical), the resolver flattens to string at the boundary. Acceptable lossy-conversion because the marker click-through always references the underlying evidence items where the structured data lives.
3. **`EvidenceItem.thumbnailUrl` hosting**: Sanborn details, period photographs, and directory scans live in S3 or Scene Foundry assets. The resolver returns the URL; thumbnail generation pipeline is out of scope for this contract. Until thumbnails exist the field returns null and the source card renders text-only.

End of GraphQL contract.
