# Public Read Models

Our Civic Atlas separates how data is published from how it is loaded into a
client. This document names the binary and JSON formats the atlas uses, when
each one is the right choice, and how the fallback chain works when a binary
path is not yet available.

This document supersedes any earlier prose about "we will use Parquet" or
"PMTiles is our tile format" by giving each format an explicit role.

## Why Explicit Roles

A single read model can be encoded several different ways. Without role rules,
the repo accumulates inconsistent fixtures, fallbacks are reinvented per slice,
and mobile pays for whatever the desktop slice happened to ship.

Roles let the atlas:

- pick the right format for the audience (resident browser, bulk consumer,
  Data Lab, mobile, fallback);
- keep the catalog (`read-model-catalog.json`) as a list of URLs while keeping
  format intent in a separate contract; and
- preserve a JSON fallback for every binary path so a node can publish before
  the binary lane is ready.

## Roles

| Role | Purpose | Default format | Acceptable fallbacks |
|---|---|---|---|
| `basemap_archive` | Pre-tiled raster or vector basemap, range-requestable. | `pmtiles` | none — the role is the format. |
| `bulk_query` | Tabular features and attributes for DuckDB-WASM, Data Lab, and bulk consumers. | `geoparquet` | `parquet`, then `geojson` for human inspection, then `json`. |
| `viewport_packet` | Range-streamed feature delivery for mid-zoom mobile and desktop overlays. | `flatgeobuf` | `geojson` for small bbox, then `json`. |
| `runtime_transfer` | In-memory transfer between worker and main thread, or between DuckDB-WASM and the renderer. | `arrow` | typed-array projection of the same fields, then `json`. |
| `fixture_fallback` | Repo-checked-in static fixtures for tests, validators, and offline review. | `json` or `geojson` | none — the role is the fallback. |
| `dossier_record` | Per-object civic record for residents and reviewers. | `json` | none — dossier records stay JSON. |

`csv` and `glb` remain in `ReadModelFormat` for source-pack ingestion and 3D
asset export respectively. They are not roles.

## Fallback Chain Rules

- Every binary role must have a JSON or GeoJSON fallback URL declared so the
  client can serve the same place data when the binary path is unavailable.
- The fallback chain runs from preferred to least preferred. The client picks
  the first available format.
- A renderer fallback is not the same as a format fallback. Renderer fallback
  (deck → leaflet, R3F → deck, etc.) is described in the renderer bridge
  contract and `OBSERVABILITY.md`.

## Encoding Rules

- `geoparquet`: WGS84 unless the layer carries its own CRS metadata; geometry
  column named `geometry`; partition by atlas node id at publication scale.
- `flatgeobuf`: range-request capable hosting required; index sidecar included
  when the host supports it; preferred for viewport packets between
  `min_zoom` and `packet_handoff_zoom` per the viewport vector contract.
- `pmtiles`: single archive per layer family; metadata file alongside or
  embedded; cache strategy from `MobileTilePublicationContract`.
- `arrow`: schema declared per worker boundary in `MobileRuntimeWorkerBoundary`;
  Arrow IPC stream over postMessage when used between workers.
- `json` / `geojson`: pretty-printed for fixtures, minified for runtime delivery;
  never carry private fields listed in `PRIVACY.md`.

## What This Doc Does Not Decide

- It does not pick the hosting provider for binary archives.
- It does not enable any new client loading path on its own.
- It does not authorize an ML or forecast read model.
- It does not change the dossier shape.

Those are separate UCA items in `our-civic-atlas-north-star-execution-plan.md`.

## Contracts

The role assignment lives in `src/data/open-flint-atlas/fixtures/static-package/data/read-model-formats.json`
and is typed by `ReadModelFormatsManifest` in `src/lib/atlas/contracts.ts`.

The catalog of files lives in `read-model-catalog.json` and remains a flat
list of URLs and media types.

## Validators

`npm run validate:atlas` checks that:

- every declared role's `default_format` is a member of `ReadModelFormat`;
- every fallback format is also a member of `ReadModelFormat`;
- every binary role has at least one fallback url; and
- the `read-model-catalog.json` lists a file id for `read-model-formats`.

## Related Documents

- `METHODOLOGY.md` for the source-first posture.
- `OBSERVABILITY.md` for `read_model.*` and `runtime.renderer_fallback` events.
- `RELEASE-CHECKLIST.md` for the gates a binary role must clear before
  replacing a JSON fallback.
- `DISPUTES.md` for what happens when two read models disagree about a place.
