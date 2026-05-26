# Pilot Reconstruction: Carriage Town Storefront

## Decision

Use **Carriage Town Storefront** (`building:carriage-town:3`,
`historical:carriage-town:storefront`) as the first lost-building pilot for the
real reconstruction loop.

This is the right pilot because it is already a lost building in the fixture,
has Sanborn map support, has an archival photo placeholder, and has enough
uncertainty around facade, roof, and ground-floor use to exercise the Atelier's
conflict and citation UI honestly.

## Resident-First Research Flow

The reconstruction panel should be useful when a resident arrives blank. A
resident may drag a photo, memory, scan, or note onto the screen, but the default
flow should pull from durable public records already stored in PostGIS and then
use civic research to fill the gaps in real time.

The intended loop is:

1. The resident opens the panel on a parcel, building, street, or loose question.
2. The backend loads any existing PostGIS artifact rows, anchors, source notes,
   and prior reconstruction claims for that tenant-scoped civic object.
3. The panel queues `civicResearch` by default for missing source types,
   dates, occupant/use clues, facade photographs, and contradictions.
4. The resolver returns a source pack in the same shape the atlas already uses
   for places, events, signals, reconstructions, and sources.
5. Accepted research results, plus any resident drag-and-drop contribution, are
   promoted into durable artifact rows, artifact anchors, and reconstruction
   evidence records.
6. `run_full_pipeline` reads those durable artifacts and produces the merged
   reconstruction dossier for the Atelier.

So the "ingest" gate is not a separate resident-facing chore. It is the commit
step after a research run: existing PostGIS evidence plus real-time research,
optionally plus resident-provided material, becomes reviewed reconstruction
evidence.

## Model Posture

A trained Pairformer/GNN should improve the loop over time, but it cannot be a
prerequisite for creating a reconstruction. The engine must produce useful
output from direct evidence, block context, civic research, and heuristic priors
before a trained checkpoint exists. As model quality improves, it should fill
gaps more gracefully and surface better conflict hypotheses, not replace the
source-backed reconstruction path.

## Why PostGIS Still Matters

PostGIS is not more true than the public fixture. Most rows will come from the
same public sources. It matters because it is the runtime place where source
artifacts gain stable ids, tenant scope, spatial anchors, time spans, and
re-runnable joins. The fixture is a product seed and demo package; PostGIS is
the canonical execution store for the live engine.

## Current Pilot Inputs

| Input | Current state |
|---|---|
| Sanborn map support | `loc:sanborn:flint:1899:s18` is attached in the fixture. |
| Photo support | `sloan:storefront-1925` is attached in the fixture. |
| Directory support | Missing as a durable artifact today; should be sourced through Research. |
| Time span | Fixture currently says 1905 to 1968. Research should add a tighter occupant/use slice. |
| Engine target year | Start with 1925 because the photo source is already named around that year. |

## Acceptance Slice

- The panel loads existing PostGIS evidence first when available.
- The Research tab can queue the missing directory/use question for the
  storefront without requiring manual pre-ingest.
- Resident-provided drag-and-drop material can be treated as optional incoming
  evidence, not the only way to start.
- The returned source pack can be promoted into durable source/evidence rows
  without putting service tokens in the frontend.
- The reconstruction resolver can read the storefront evidence pack and return
  a dossier with real evidence items, conflicts, block context, and node tree
  output.
- The Atelier route renders the storefront dossier instead of silently falling
  back to a fixture default.

## Implementation Notes

- 2026-05-26: `promoteResearchArtifact(input)` exists on the backend and the
  frontend has a typed `useResearchArtifactPromotion` hook.
- 2026-05-26: the Research panel can show promotable sources. Promotion is
  enabled only when the panel has an anchor context: the Atelier supplies the
  route parcel key plus reconstruction point geometry, and the main atlas
  supplies selected-building point geometry. Unanchored global research can
  still search, but it will not send a write that the backend cannot attach to
  reconstruction evidence.
- 2026-05-26: promoted sources now carry `sourceUseTags`, a
  `sourceUseNote`, and `reviewState: accepted_for_reconstruction` through the
  GraphQL contract into the persisted artifact metadata JSON. This gives the
  engine/review loop a durable way to distinguish footprint, facade,
  ground-floor-use, date, contradiction, and other support without publishing
  unreviewed claims as final truth.

## Follow-Up Work

- Run the first pipeline at year `1925` and record every stage result here.
