# Plan: Atelier → Real Reconstruction → Trained Pairformer

A single coordinated plan covering everything needed to turn the atelier from a great-looking placeholder into a working reconstruction surface backed by real engine output, real evidence, and eventually a trained Pairformer model.

The work is presented as discrete tasks with clear inputs, outputs, and acceptance criteria. Peer agents self-coordinate. There is no lane assignment, no ordering imposed beyond data dependencies. Where tasks unblock each other, the dependency is called out. Where tasks are independent, they can proceed in parallel.

**Commit this document as `docs/plans/atelier-real-reconstruction-plan.md` at the start of work.**

---

## Context

What exists today:

- **Reconstruction engine** (Rust, `crates/civic-atlas-reconstruction-engine`): all 8 pipeline stages implemented. Trait ports for `EvidenceRepository`, `BlockSubgraphRepository`, `EmbeddingProvider`, `AssetGenerator`.
- **Pairformer model** (Python, `civic_atlas_ingest/building_head_pairformer.py`): architecture complete (3-layer encoder, RGCN, multihead attention, per-part decoders). No trained checkpoint.
- **Civic Research path** (frontend → GraphQL sidecar → Axum → Theseus bridge → orchestrator): proven end-to-end. The same pattern needs to apply to reconstruction.
- **Atelier frontend surface**: shipped. R3F scene, choreographer, evidence cards, provenance lines, dossier panel, conflict markers, dust motes. Reads from a hardcoded in-repo fixture (`FLINT_LOST_RECONSTRUCTIONS`) with one building (Whaley House).
- **Sanborn ingest scaffold** (`civic_atlas_ingest/ingest_sanborn.py`): exists at 8KB. Actual decoded corpus state unknown.

What's missing:

- A path from the atelier surface to the reconstruction engine.
- A real evidence corpus large enough to produce useful reconstructions and train the Pairformer.
- A trained Pairformer checkpoint.
- A pilot reconstruction proving end-to-end works.

---

## Task A — Atelier ↔ Engine wiring

**Goal:** the atelier surface calls the reconstruction engine and renders the engine's actual output, not the in-repo fixture.

**Backend work:**

- Add a `reconstructionFor(parcelId: ID!, year: Int!): ReconstructionResult` query to the GraphQL schema in `apps/graphql-server/src/schema.ts`.
- Add a `reconstructionFor` resolver in `apps/graphql-server/src/grpcClient.ts` that calls Axum over gRPC with tenant context.
- Add a corresponding gRPC method in the proto definitions (`proto/civic_atlas.proto` or wherever the existing `civic_research` lives). Method signature: `rpc ReconstructionFor(ReconstructionRequest) returns (ReconstructionResponse)`.
- Implement the Axum handler in `crates/civic-atlas-server/src/reconstruction.rs` (the file exists at 47KB; extend it). The handler calls `civic-atlas-reconstruction-engine::run_full_pipeline` for the requested parcel + year and returns the typed `PipelineOutput`.
- Serialize `PipelineOutput` to a typed GraphQL response shape — not a JSON blob. The atelier needs typed access to `evidence_bundle.direct_artifacts`, `merge_result.conflicts`, `assets.gltf_uri`, etc.

**Frontend work:**

- Replace `resolveAtelierRoute` (which reads the in-repo fixture) with a GraphQL query that calls `reconstructionFor`. Keep the fixture as a fallback for parcels not yet in the database.
- Plumb the typed response through `AtelierSurface` → `AtelierR3FScene` → child components. Currently these consume the fixture's `AtelierDossier` shape; they need to consume the engine's `PipelineOutput` shape. Define a typed adapter if needed.
- `AtelierEvidenceCard` reads from the engine's `EvidenceBundle.direct_artifacts` instead of hardcoded card data. Each artifact has a type (`SANBORN`, `PHOTO`, `DIRECTORY`, `TEXT`), a source ID, a confidence, and a content reference. The card renders these honestly.
- `AtelierConflictMarkers` reads from the engine's `MergeResult.conflicts` instead of fixture data. Each conflict has a part, a list of sources with their values, and the winning resolution.
- Remove the "Backend resolver pending. Rendering against the in-repo fixture." status string from `AtelierDossierPanel`. It becomes obsolete.

**Acceptance criteria:**

- Opening `/open-flint-atlas/atelier/<parcelId>/<year>` for a parcel in the database produces a reconstruction from the engine, not the fixture.
- The dossier panel shows engine-derived evidence with real source IDs.
- The conflict section shows engine-derived conflicts, not fixture conflicts.
- The fixture remains as a fallback for parcels not yet in the database (so existing routes don't 404).
- A failed engine call surfaces an honest error, not a fixture fallback.

**Dependencies:**

- Task B must surface at least one parcel with enough evidence that the engine produces a non-trivial reconstruction. Tasks A and B can develop in parallel; A is verifiable against any parcel B produces.

---

## Task B — Evidence corpus inventory

**Goal:** know exactly what's in the database. This is the unblock for everything downstream.

**Audit `civic_atlas_ingest/ingest_sanborn.py`:**

- What does it produce? Schema of the rows it writes?
- How many Sanborn sheets are decoded and stored today?
- What's the temporal coverage — are there sheets from multiple editions (1885, 1903, 1925, etc.)?
- What parcels in Flint have Sanborn coverage at all? In how many editions?

**Audit other ingest modules:**

- `civic_atlas_ingest/ingest_overpass.py` — confirmed working, produces OSM building footprints. What's the count and schema?
- Anything for photographs? Look for image-ingest paths. If none exist, that's a finding — Sanborn alone isn't enough for high-quality reconstruction.
- Anything for city directories? Critical for ground-floor use signals. If absent, that's another finding.
- Anything for plat maps, HABS records, newspaper archives?

**PostGIS queries to run:**

```sql
-- Count artifacts by source type
SELECT source_type, COUNT(*)
FROM evidence_artifacts
GROUP BY source_type;

-- Parcels with multi-source evidence
SELECT parcel_id, COUNT(DISTINCT source_type) as source_count
FROM evidence_artifacts
GROUP BY parcel_id
HAVING COUNT(DISTINCT source_type) >= 2
ORDER BY source_count DESC;

-- Temporal coverage per parcel
SELECT parcel_id,
       MIN(artifact_date) as earliest,
       MAX(artifact_date) as latest,
       COUNT(DISTINCT EXTRACT(decade FROM artifact_date)) as decade_count
FROM evidence_artifacts
GROUP BY parcel_id
HAVING COUNT(DISTINCT EXTRACT(decade FROM artifact_date)) >= 2;
```

Adjust queries to match the actual schema.

**Output:**

A document at `docs/plans/evidence-corpus-inventory-2026-05.md` covering:

- Counts per source type
- Per-parcel evidence depth distribution (histogram: how many parcels have 1 source, 2 sources, 3+ sources)
- Temporal coverage analysis
- Top 20 parcels by evidence depth (these become candidates for Task C)
- Gaps: which source types are missing, which time periods are underrepresented, which neighborhoods have thin coverage
- Concrete next-step recommendations: "decode X more Sanborn sheets," "OCR Y directory pages," etc., with rough effort estimates

**Acceptance criteria:**

- The document exists in the repo.
- Top 20 parcels list is named, with their counts.
- Gap recommendations are specific enough to scope follow-up work.

---

## Task C — First real reconstruction pilot

**Goal:** prove the full pipeline (engine + frontend + evidence) end-to-end against a real lost Flint building.

**Pick the pilot building** based on Task B's top-20 list. Selection criteria:

- The building is *lost* (demolished). The atelier's value is reconstructing what's gone. Whaley House still stands and isn't a useful pilot.
- The building has evidence from at least 3 source types (Sanborn + photo + directory at minimum).
- Evidence spans at least two decades so temporal grounding is real.
- The building has historic significance — Buick Plant 36, Vehicle City Tavern, the original Capitol Theatre, a notable downtown commercial block, etc. The pilot becomes a demo.

**Pilot selection update (2026-05-25):** use Carriage Town Storefront as the
first lost-building pilot. It is already demolished in the fixture, has map and
photo support, and its weak storefront/use evidence makes it a useful test for
the conflict UI. See
`docs/plans/pilot-reconstruction-carriage-town-storefront.md`.

**Resident-first research path:** Task C should not require a user or operator
to manually ingest a folder of source rows before the product proves itself.
The reconstruction panel should start useful for a blank resident by loading
existing PostGIS evidence and then queuing `civicResearch` for missing facts in
real time. Drag-and-drop resident material is additive. A trained GNN improves
the reconstruction prior over time; it is not a prerequisite.

**Implementation update (2026-05-26):** the first acceptance workflow now exists
as `promoteResearchArtifact(input)`. The Axum GraphQL resolver wraps the
tenant-scoped `PersistArtifact` service path, writing selected `civicResearch`
sources into `artifacts` + `artifact_anchors`; the frontend contract and hook
are generated so the Research tab/Atelier panel can call it next.

**Reconstruct it:**

- Run the engine's `run_full_pipeline` against the picked building with `year = N` for a year where evidence is strongest.
- Inspect every stage's output. Does `assemble_evidence` find the artifacts? Does `extract_direct` produce sensible spec values? Does `build_block_subgraph` populate neighbors? Does `merge_evidence_prior` surface conflicts honestly?
- If the engine fails at any stage, that's a finding — not a blocker. Document what failed and why.

**Render it in the atelier:**

- Verify the atelier route loads the pilot building.
- Verify all evidence cards render with real source data.
- Verify conflicts (if any) surface with citation chains.
- Verify the building geometry reflects the merged spec (not a fixture default).

**Acceptance criteria:**

- One reconstruction running through the live pipeline end-to-end.
- The atelier surface for this building shows real evidence, real conflicts, real merge resolution.
- Documentation in `docs/plans/pilot-reconstruction-{building-slug}.md` covering what worked, what didn't, what's missing.
- A list of follow-up work the pilot revealed (probably 5-15 items: schema fixes, ingest gaps, engine refinements).

**Dependencies:**

- Task A's wiring must be in place (or developed in parallel and verified together).
- Task B must surface candidate buildings.
- The research-to-artifact promotion step exists for the pilot's missing
  directory/use evidence. Next UI work should attach it to selected
  `civicResearch` sources; it does not need a bulk ingest lane before Task C
  starts.

---

## Task D — Pairformer training plan

**Goal:** a concrete plan to train the Pairformer model. Not the training run itself yet — the plan that scopes it.

**Inputs needed (most come from Task B):**

- Total count of buildings with sufficient evidence for training (target: 500+ minimum, ideally 2,000+).
- Distribution by typology class. The model needs balanced data; if residential is 80% of the corpus and civic is 2%, training will overfit.
- Distribution by completeness (how many parts of the spec are documented). The training signal comes from filling in missing parts, so partial-evidence buildings are valuable.
- Identified gold validation set: 50-100 buildings where evidence is unusually rich (multiple photos, multi-edition Sanborn, contemporaneous accounts). These are held out for validation; the model never sees them during training.

**Plan covers:**

- Training corpus assembly procedure: how to extract training tuples (graph context, partial evidence, ground-truth spec) from the database
- Loss function balance across the 5 categorical decoders (mass_form, story_count, facade_material, roof_form, ground_floor_use) and 3 regression decoders (height_meters, bay_count, roof_pitch_degrees)
- Curriculum strategy: high-evidence buildings first, then medium, then sparse
- Training compute estimate (Modal A100 hours, dollar cost)
- Per-class accuracy targets, especially for rare classes like civic and industrial
- Held-out validation strategy: gold set evaluated separately from corpus split
- Versioning approach: `pairformer-v0.1-flint-corpus` etc., with each version's metadata captured

**Output:**

A document at `docs/plans/pairformer-training-plan-2026-05.md` covering all of the above.

**Acceptance criteria:**

- The document exists.
- Numbers are concrete (corpus size, costs, class targets) rather than abstract.
- The plan is detailed enough that the actual training run becomes a known-cost operation.

**Dependencies:**

- Task B's inventory must surface enough about the corpus to ground the numbers. If the inventory reveals the corpus is too thin for training, Task D becomes "what corpus expansion is needed before training is viable" — which is a different but equally useful plan.

---

## Task E — Atlas chrome residuals from prior round

**Goal:** finish the unresolved items from the most recent design pass that aren't blocked by anything else.

These items are independent of the atelier work and can ship in parallel.

**Downtown still feels crowded.** The pyramidal roofs are partly addressed in the most recent PR but the downtown screenshots still show occlusion-heavy stacks. Investigation: is the per-zoom-level LOD honoring the spec? At zoom 17 the buildings should be glTF archetypes (Phase A.5) — but Phase A.5 hasn't shipped. At zoom 15 they should be simple extrusions. Are buildings rendering too many parts at zoom 15 because the 3-part cap isn't gating correctly?

**Bound-world feeling regressed.** The previous iteration's vignette mask was more effective than the current one. Compare the old and new mask alpha + boundary stroke. Most likely cause: the alpha walk-back from 220 to 160 went too far in the other direction. Try alpha 190 as a middle point. Boundary stroke might also need to be more prominent — the previous version had a 2-3px hard boundary that read; the current 1.5px terracotta might be too subtle.

**The map color is still washed.** Overlay alphas were strengthened in the recent PR but the screenshots still feel washed compared to the urban-design reference. The remaining lever is the basemap itself. Options:

- Replace CARTO Light with Stadia Alidade Smooth (free, MapLibre-compatible, warmer paper aesthetic, 30-minute swap).
- Hand-tune a custom basemap via MapTiler Studio or Mapbox Studio (export-once, host-yourself, weekend of design work).
- Strengthen overlays further: bump parks to alpha 240, bump water to alpha 250.

Recommend the Stadia swap as the fast path. The custom basemap is correct long-term but isn't the bottleneck right now.

**Building hover tooltip still shows osm_id.** The `RESIDENTIAL Building #1202389185` hover that came up in the previous round wasn't fully removed. The confidence-discipline rule should cover this — find the remaining hover tooltip component and either remove it, or replace with the plain-English noun phrase from the dossier rewrite.

**Acceptance criteria:**

- LOD gating audited and corrected if buildings are over-rendered at low zoom.
- Vignette mask tuned to a middle alpha (try 190, iterate).
- Basemap swap to Stadia Alidade Smooth (or a recommendation document if a different basemap is chosen).
- All confidence/osm_id references removed from hover tooltips.

---

## Task F — Building rendering refinements

**Goal:** address the "buildings still don't feel right" diagnosis from the most recent round.

The most recent PR added paper grain texture, edge lines, drop shadows, and simplified geometry. The screenshots show this landed partially — the edge lines are visible, geometry is simpler, but the buildings still feel polygonal rather than drawn.

**Things to verify and tune:**

- **Edge line weight.** The spec called for 1.5px in `#7a8696`. Verify both. The screenshots suggest the lines may be too thin or too low-contrast. Try 2px at higher alpha.
- **Paper grain visibility.** The spec called for 12% opacity SVG noise. At that opacity on a near-white building face, the texture may be effectively invisible. Try 18-22% opacity. Or switch to a procedural noise that varies by face orientation.
- **Drop shadow direction and intensity.** Verify the shadow offset matches the light source direction. A shadow southeast of a building lit from northwest reads correctly; a shadow underneath a building reads as floating. The Eugene reference has shadows that fall *clearly* to the side; the current screenshots have shadows that are subtle to the point of absence.
- **Roof geometry.** The hipped roofs on civic buildings render as pyramidal points even at the low slope spec. The 0.5m peak rise is probably being multiplied by some camera factor. Investigation: trace from the `civic_anchor` rule through to the final R3F mesh and confirm the peak height matches the spec.

**Things to consider adding:**

- **Wall-corner darkening.** Architectural drawings darken corners where two walls meet to imply shadow. A subtle gradient from corner outward on each wall face. Cheap to add via shader or vertex coloring.
- **Ground contact line.** A 1px dark line where each building meets the ground. This is what makes a drawing feel grounded vs. floating. Currently buildings appear to hover slightly because there's no contact line.
- **Faint cast shadow on adjacent buildings.** A building that's taller than its neighbor casts visible shadow on it in real-world lighting. Implementing this is real-time shadow mapping work — costly. But even a fake "ambient occlusion at building bases" approximation reads as drawn.

**Acceptance criteria:**

- Each tuning lever investigated and adjusted.
- At least one of the additions (corner darkening, ground contact line) implemented.
- Visual verification: a downtown screenshot from the same camera angle as the existing screenshots, side-by-side, shows clearly stronger sketch character.

---

## Task G — Street rendering refinements

**Goal:** the streets are visible now (most recent PR added the PathLayer) but they still feel like overlay rather than infrastructure.

**Things to investigate:**

- **Street width at zoom.** Streets in the screenshots look like uniform thin lines. They should taper with zoom and have different weights for different tiers. Verify the three-tier system (arterial / collector / local) is rendering at the spec'd widths.
- **Street color.** The current streets render in warm gray-brown. They feel like ink lines rather than streets. Consider a slightly different color — closer to `#a89c84` (`--ctx-ink-faint`) at higher alpha, so they read as space rather than line.
- **Intersection visibility.** Where two streets cross, the lines just overlap. Real architectural drawings often show intersections explicitly (the cross-pattern, the corner radii). Out of scope for v1 but worth noting.

**Acceptance criteria:**

- Streets read as infrastructure at all zoom levels.
- Width tapers visibly between arterial and local.
- The street grid is legible from a downtown overview.

---

## Task H — Mobile experience audit

**Goal:** the mobile screenshots reveal specific problems that the desktop work didn't address.

From the mobile screenshot in the most recent round:

- The dynamic island at the bottom is fine, but the top-of-screen branding/search has been replaced by a bare URL bar context. There's no atlas chrome on mobile beyond the bottom island.
- The map renders smaller and less detailed.
- The compass/heading isn't visible.
- The bound-world mask renders but feels different at mobile aspect ratio.

**Acceptance criteria:**

- Mobile has its own top-of-screen chrome (a smaller version of the desktop top bar, or an alternative pattern).
- The dynamic island works at mobile width without overflowing.
- Bound-world mask works at mobile aspect.
- Touch interactions verified: tap-to-select, long-press for atelier entry, pinch-zoom, two-finger rotate.

---

## Task I — Methodology page

**Goal:** the confidence-discipline rule needs a home. The methodology page is where classifier accuracy, evidence sourcing, and the engine's pipeline get explained honestly to users.

**Content to cover:**

- What the typology classifier does, what its accuracy looks like, where it fails. This is the *only* place in the product where confidence numbers appear in user-facing chrome.
- What the reconstruction engine does. Walk through the eight stages in plain English.
- What evidence sources we use (Sanborn, HABS, photos, directories, plat maps, etc.) and how each is weighted.
- Known limitations: tax-exempt buildings underrepresented in assessor data, mixed-use class is sparse, civic recall is unmeasured, etc.
- How users can correct mistakes (this links to the contribution flow that doesn't exist yet — placeholder for future feature).

**Acceptance criteria:**

- Page exists at `/open-flint-atlas/methodology` (route already exists in the directory tree).
- Confidence numbers appear here in the spec-defined way (transparently, with context).
- Plain language. A non-technical Flint resident can read it and understand what the atlas claims and doesn't claim.

---

## Cross-cutting items

**Sonnet synthesis for civic research.** Previously discussed but unscheduled. The civic research path is end-to-end working. Adding Sonnet as a synthesis layer (server-side proxy through Axum, streaming back to the frontend, evidence-pack-grounded with whitelist citation) is roughly 200 lines of Rust. Drop into the schedule wherever it fits — it doesn't block anything else.

**Code ingest into Theseus.** Previously discussed but unscheduled. Running `theseus_code_ingest` against the three Civic Atlas repos populates the code graph so future audits can use PPR instead of GitHub MCP walks. Background task. Run when there's a quiet moment.

**Berthold font question.** Open. The current heavy display font feels heavier than the rest of the chrome warrants. Two options after Task E lands: revisit with the new map color and see if it settles, or swap to GT Sectra Display / PP Editorial New / DM Serif Display. Worth a decision but not urgent.

---

## What done looks like

When all tasks land:

- The atelier renders real reconstructions from the engine, with real evidence cards, real conflicts, real merge resolution.
- At least one pilot historical building has been reconstructed end-to-end and the result is documented.
- The evidence corpus state is inventoried and the gaps to viable Pairformer training are scoped.
- A concrete Pairformer training plan exists with numbers.
- The atlas chrome residuals (downtown crowding, bound-world feel, washed map, hover tooltips) are resolved.
- Building rendering reads as architectural sketch rather than polygon soup.
- Streets read as infrastructure.
- Mobile experience is verified.
- The methodology page exists.

After this round, the atlas is shippable to a public beta. Press, grants, and Patreon outreach become viable because the product can demonstrate something nobody else has built: real historical reconstruction from archival evidence, rendered honestly, with provenance traceable to source.

The Pairformer training run itself comes after this plan lands. The plan gates the training; the training gates the highest-quality reconstructions. But many reconstructions are useful before the model is trained — direct evidence (Sanborn + photo + directory) gets you most of the way for buildings with rich sources.
