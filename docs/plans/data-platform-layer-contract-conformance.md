# Data Platform Layer Contract Conformance

This checklist records how producer resolvers register with the Slice 1 Layer
contract. The generic `Layer` surface is additive: type-specific queries remain
the detail surfaces.

## Ported producers

| Producer | Layer id | Kind | Source action | Renderer boundary | Projection rule |
|---|---|---|---|---|---|
| Traffic | `layer:traffic:flint-downtown` | `TRAFFIC` | `MODEL` | `data_overlay` | Project `trafficRealtime(networkId: "flint-downtown")` segments into public `LayerRecord` rows. Preserve `FIXTURE`, historic-average, and live status honestly. |
| Event planner | `layer:event-surface:flint:<eventSlug>` | `EVENT_SURFACE` | `BASE` | `data_overlay` | Project `placements(tenantSlug, eventSlug)` rows into public placement records. Keep `eventLayers`, `placements`, and write mutations unchanged. |
| Reconstruction | `layer:reconstruction:flint:historical` | `RECONSTRUCTION` | `MODEL` | `object_scene` | Project reconstruction specs into records for catalog/discovery. Keep `reconstructionDossier` and atelier detail flows unchanged. |

## Public projection rule

`layerView` only returns records that are:

- `visibility = PUBLIC`
- `reviewStatus = ACCEPTED` or `CORROBORATED`
- `confidence >= minConfidence`

RAW, CANDIDATE, REVIEW_ONLY, and PRIVATE records stay behind producer-specific
review/admin paths. A producer can appear in `layers` with `lifecycleState =
CANDIDATE`, but its public `layerView` must return an empty record set until
promotion changes record visibility/review state.

## Producer conformance checklist

When a producer resolver enters the Axum GraphQL surface, add it to the Layer
catalog by checking each item:

- Stable `Layer.id` prefixed by `layer:<kind>:<tenant-or-scope>:...`.
- Correct `LayerKind` and `LayerSourceAction`.
- `lifecycleState` set from the producer lifecycle, not inferred from UI state.
- `rendererBoundaryId` matches `src/lib/atlas/renderer-registry.ts`.
- `recordCount` comes from the same source read as the projection.
- `temporalRange` is computed from record times when available.
- `provenanceSummary.sourceCount` is nonzero when source labels/ids exist.
- Every `LayerRecord` carries `confidence`, `reviewStatus`, `visibility`, and a compact source summary.
- `LayerRecipe.displayEncoding.rendererBoundaryId` matches the descriptor.
- `LayerRecipe.displayEncoding.deckGlLayerType` is executable by `src/lib/atlas/layer-recipe.ts` or the producer adds the adapter before exposing the recipe.
- The producer-specific detail query keeps working unchanged.
- A schema or resolver test asserts the producer appears in `layers` and returns a public `layerView`.

## Not-yet-ported producer mapping

| Producer | Layer kind | Source action | Expected renderer boundary | Detail query to preserve |
|---|---|---|---|---|
| Places | `PLACE` | `BASE` | `data_overlay` | `places`, `place`, `dossierFor` |
| Signals | `SIGNAL` | `SEARCH` | `data_overlay` | `signals` |
| Spatial events | `EVENT` | `SEARCH` | `data_overlay` | `spatialEvents` |
| Fresh signals | `FRESH_SIGNAL` | `SEARCH` | `data_overlay` | Fresh signal resolver/read model |
| Metrics | `METRIC` | `BASE` | `analytics` | KPI and metric resolvers |
| Scenarios | `SCENARIO` | `MODEL` | `data_overlay` | `scenarios`, `scenarioEnvelopes`, KPI comparison |
| Uploads | `UPLOAD` | `UPLOAD` | `data_overlay` | Contribution receipt and review queue |
| Model outputs | `MODEL_OUTPUT` | `MODEL` | `data_overlay` or `object_scene` | Producer-specific model run detail |

## Verification

- Backend: `cargo test -p civic-atlas-server graphql::tests::schema_builds_with_layer_contract_fields`
- Frontend contract: `npm run validate:layer-contract`
- Codegen: `npm run codegen`
- Typecheck: `npm run typecheck`
