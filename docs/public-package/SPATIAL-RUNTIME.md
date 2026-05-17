# Spatial Runtime

This document names the spatial indexing family the atlas uses, the viewport
cache key strategy, the Rusty Red hot-state boundaries, and the first Rust
preprocessing lanes.

Two rules govern everything below.

1. **Rusty Red is hot state, not canon.** Every boundary points back to a
   canonical source. Hot state is allowed to fail. Truth lives elsewhere.
2. **Rust lanes are offline.** Public pages must load without any Rust
   service or local toolchain being available.

The typed contract lives in `SpatialRuntimeContract` (`src/lib/atlas/contracts.ts`)
and the live values for Flint live in
`src/data/open-flint-atlas/fixtures/static-package/data/spatial-runtime-contract.json`.

## Indexing Family

| Choice | Rationale |
|---|---|
| `h3` | Hex cells avoid the neighbor artifacts of geohash quadrants. Active JS/WASM support. Multiple resolutions for zoom-aware queries. |
| `s2` | Considered. Strong at large scale, but JS support is weaker and the cell shape is less convenient for civic-scale joins. |
| `geohash` | Considered. Simple and fast, but neighbor handling and resolution math are awkward at city scale. |

The Flint contract uses `h3` with resolutions `[6, 8, 10, 12]` (district,
neighborhood, building cluster, lot). Status is **current**.

The promotion rationale: H3 hex cells give every cell exactly six neighbors
that share full edges, which removes the neighbor-discontinuity artifacts of
geohash quadrants. JS/WASM tooling (`h3-js`) is the strongest of the three
candidates evaluated. S2 has finer dynamic range but the cell shape and JS
ecosystem are less convenient for civic-scale joins. Geohash is simpler but
strings can suggest neighbor relationships that are not always true.

What "resolution" means here: H3 uses a fixed integer ladder from 0 to 15.
Each step subdivides cells by ~7x. Resolution 6 is roughly a city-district
hex; 8 a neighborhood cluster; 10 a building cluster; 12 a single lot.
Geohash "resolution" is string length; S2 uses cell levels 0–30.

Other families remain available in the type union for future review without
contract changes. If a real benchmark surfaces a reason to switch, only the
`indexing_family` field and the dependent worker code need updating; the
read-model stack is decoupled from indexing.

## Viewport Cache Key

A viewport cache key is the stable identifier the runtime uses to memoize a
view-state. It must produce the same key when the same fields are equal and
must change when any field changes.

Fields in Flint's contract:

- `atlas_node_id`
- `layer_id`
- `h3_index`
- `resolution`
- `time_range`
- `filters_hash`

Canonical form: stable JSON serialization of the fields above, hashed into a
short opaque key. Production may swap the hash for any deterministic function
that preserves the same equality.

Invalidation triggers:

- Source freshness change for any source id in the layer.
- Read-model rebuild for the affected layer.
- Review-state transition for any contained civic object.

TTL: 300 seconds. The TTL is short on purpose. The cache is a session
accelerator, not a publication artifact.

## Rusty Red Hot-State Boundaries

Rusty Red is the project's name for a Rust-implemented, Redis-style hot
cache. It accelerates session-scoped reads. It is never the source of truth.

Every boundary record carries:

- `boundary_id` and `label`.
- `hot_state_kind`: one of `viewport_cache`, `session`, `scene_hydration`,
  `nearby_lookup`.
- `canonical_source`: where the truth lives. This field is required and is
  validated.
- `rebuild_on`: events that trigger a rebuild of the cached value.
- `ttl_seconds`: a non-negative number, or null when the boundary is
  session-scoped and discarded on close.
- `status`: `proposed`, `current`, or `deprecated`.

Flint's contract proposes three boundaries:

1. **Viewport cache (hot)** — caches repeated viewport queries during a
   session. TTL 300s.
2. **Scene hydration cache** — keeps a hydrated scene available for fast
   re-entry. Session-scoped (TTL null).
3. **Nearby civic object lookup** — short-lived cache for tap-to-explore and
   dossier hover affordances. TTL 60s.

All three are `proposed`. Promotion to `current` requires real worker code
and a measured benefit over re-querying the canonical source.

## Rust Preprocessing Lanes

Rust preprocessing turns reviewed inputs into binary read-model outputs. The
lanes are offline. Public page load must not depend on them being available.

Flint's contract proposes two lanes:

1. **GeoParquet partitioner** — partitions reviewed read models into
   atlas-node-scoped GeoParquet files. Input GeoJSON, output GeoParquet.
2. **PMTiles packer** — packs reviewed basemap layers into PMTiles archives.
   Input GeoJSON, output PMTiles.

Each lane carries a `lane_id`, `label`, `input_format` and `output_format`
that must be members of `ReadModelFormat`, a `runtime` (`rust_cli` or
`rust_wasm`), a `status`, and notes. Validation enforces the format
membership.

## Validators

`npm run validate:atlas` checks:

- `indexing_family.name` is a `SpatialIndexFamily`.
- `viewport_cache_key.ttl_seconds` is a non-negative number.
- At least one Rusty Red boundary exists and every boundary declares a
  `canonical_source`.
- Every Rust preprocessing lane uses real `ReadModelFormat` values.

## What This Contract Does Not Do

- It does not enable any cache on a public route.
- It does not authorize Rusty Red to override read-model truth.
- It does not change the dossier shape.
- It does not commit to a particular hosting choice for hot caches.

Those are downstream slices in the unified plan.

## Related Documents

- `READ-MODELS.md` for read-model format roles.
- `SCENE-FOUNDRY.md` for offline 3D asset export.
- `OBSERVABILITY.md` for `runtime.cache_miss` and `runtime.cache_eviction`
  events.
- `RELEASE-CHECKLIST.md` for the gates a Rusty Red boundary must clear before
  going from `proposed` to `current`.
