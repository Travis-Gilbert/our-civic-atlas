# Traffic Domain — Realtime flow (plan + lane split)

Status: **GraphQL canonical; Anime.js renderer wired and browser-validated. Contract + `useTrafficRealtime` hook + render data-source swap + TR-H1/TR-H2 hardening landed; visual polish + TR-B2b backend resolver read remain open**
Started: 2026-06-05
Source handoff: `CIVIC-ATLAS-TRAFFIC-DOMAIN-HANDOFF.md` (Travis, root of Downloads)
Active north-star plan: `docs/plans/our-civic-atlas-north-star-execution-plan.md`

## One-sentence framing

Traffic is a new domain on the reconstruction engine, not a bespoke feature.
This plan ships the **realtime** mechanism only: a per-segment flow snapshot
mapped onto road-network edges, which the atlas renders as animated flow with
honest provenance on every estimate. No travel-demand model is involved in the
realtime tier; the feed is ground truth. (Historic replay and future-projection
via the four-step SUMO model are later extensions against the same segment shape.)

## Why realtime first

Of the handoff's three mechanisms, realtime is the *simplest*: no SUMO, no
gravity model, no equilibrium solve. Feed in, map to segments, animate. It is
the fastest path to something on screen that is honest, and it forces the
segment data contract that the harder mechanisms reuse.

## API decision (Git coordination record)

**Updated 2026-06-05: GraphQL is canonical.** An earlier draft of this section
named REST canonical; both agents (Claude Code + Codex) then reconsidered and
converged on **GraphQL as the canonical public read seam**, with the REST route
demoted to a dev / resolver-not-ready fixture fallback. Authoritative record:
[`decision-2026-06-05-graphql-canonical.md`](decision-2026-06-05-graphql-canonical.md).

```
useTrafficRealtime(networkId)
  -> GraphQL trafficRealtime(networkId)          [canonical, schema Extension 8]
     -> Axum resolver (TenantContext) -> road-network graph + flow source
  -> dev fallback: fetchTrafficRealtime() REST shim -> same map/panel view model
```

Why the flip: the snapshot is a civic-domain object (tenant context, per-segment
provenance, source limits, measured-vs-inferred truth, scenario compatibility),
which belongs in the typed curation boundary the schema header already declares
canonical ("the REST shim ... gets retired once this lands"). The map-native
GeoJSON argument for REST is real but handled by a tiny client adapter
(`adaptGraphqlTrafficSnapshot` in `src/lib/atlas/use-traffic-realtime.ts`).
GraphQL returns snapshots, not animation ticks: the client keeps animating
particles locally between polls.

The project security boundary is unchanged: no MDOT/511, RunPod, RustyRed, or
other service-tier credential may live in the frontend. The live feed adapter
belongs in the backend resolver; the local Next route is a dev shim/fallback only.

## The two-lane split (decided, not arbitrated)

This repo is the **public frontend**. The backend lives in the sibling repo
`our-civic-atlas-backend` (Axum + Postgres/PostGIS + RustyRed). The repos do not
overlap, so the two agents cannot collide on files.

| Lane | Owner | Repo | Scope |
|---|---|---|---|
| Frontend vertical | **Claude Code + Codex, coordinated through Git** | `Open-Flint-Atlas-main-release` | GraphQL `trafficRealtime` hook, REST fixture fallback, GraphQL-to-map view-model adapter, Flint road-segment fixture, Anime.js `createMotionPath` flow overlay, deck.gl static/pickable segment layer, Traffic island surface, reduced-motion and visual validation. |
| Backend feed | **Backend lane when active** | `our-civic-atlas-backend` | A tenant-scoped GraphQL `trafficRealtime(networkId)` resolver, the RustyRed road-network subgraph (segments with capacity + free-flow speed), the realtime feed ingestion (511 / MDOT / probe) OR a SUMO+TraCI persistent pod, calibration, provenance. |

Coordination substrate: the harness coordination MCP (room / presence / mentions)
was returning HTTP 500 at kickoff, so coordination runs through the **git working
tree** (this repo's native pattern, cf. `lane-4-strategic-seams/`): committed
docs, then push after each unit. Agents should read this file before changing the
traffic render or feed contract.

## Honesty contract (binding)

Mirrors the reconstruction honesty contract (`atelier-fallback-synthesizer.ts`,
project CLAUDE.md "No Fake UI"):

- Every segment carries `estimate_basis`, `source_status`, `confidence`, and a
  plain-language `support_note`.
- With no live feed wired, the fallback renders **real Flint road geometry**
  driven by a clearly-labeled fixture/time-of-day estimate (`status:
  fixture_fallback`, `source_status: fixture` or `pending_live_source`). It is
  never presented as measured live data.
- The frontend flips to measured data when the backend returns `status: live`
  and segment-level `source_status: live` values. No map-render rewrite should be
  needed at that point.

## Open dependency (flagged, not blocking)

A genuinely-live Flint feed at the basic tier is a backend + data-availability
question (does MDOT/511 expose Flint-downtown loop detectors or probe data we
can legally ingest?). The frontend vertical does NOT block on it: it ships
against the honest fixture fallback and goes live when the backend lane wires a
source.

## Checklist (stable IDs)

Frontend:
- [x] TR-01 GraphQL contract + operation + `useTrafficRealtime()` hook, adapting into the existing `TrafficRealtimeSnapshot` map/panel view model.
- [x] TR-02 REST fallback shim: `/api/v2/theseus/open-flint-atlas/traffic/realtime` with `no-store` cache behavior and fixture fallback.
- [x] TR-03 Flint road-segment fixture (real downtown corridors; named segments with free-flow speed, base volume, support labels).
- [x] TR-04 Initial deck.gl rendering layer and Traffic island surface.
- [x] TR-05a Render data-source swap: `OpenFlintAtlasScene` now reads `useTrafficRealtime("flint-downtown", { fallback: true })`; the hook owns polling.
- [x] TR-05b TR-H1 reduced-motion gate: traffic particles stop under `prefers-reduced-motion`, while static congestion-colored lines remain visible.
- [x] TR-05c TR-H2 source-status honesty: fixture/pending-live segments render dimmer/dashed, live segments render solid/brighter, and the panel shows stronger not-live-feed copy plus legends.
- [x] TR-05d Renderer correction: Anime.js is required by the sourced handoff; `animejs` is installed and `AtlasMap` now renders flow particles via an SVG `AnimeTrafficFlowOverlay` using `svg.createMotionPath()` over projected road paths. The old deck.gl `ScatterplotLayer` particle path is retired.
- [ ] TR-05e Visual-register polish still open: final particle opacity/radius tuning, contrast/color-blind review, optional pause/scrubber control.
- [x] TR-06 Browser validation (preview): segments render, Anime.js flow animates, support labels honest, reduced-motion respected. Evidence: `docs/validation/traffic-realtime/traffic-anime-browser-smoke.json` (19 Anime.js particles / 6 paths, transform changes over time; reduced-motion removes the Anime overlay), `traffic-anime-normal-map.png`, `traffic-anime-normal-panel-visible.png`, `traffic-anime-reduced-motion-map.png`.

Backend (sister repo `our-civic-atlas-backend`, **live on Railway**):
- [x] TR-B1 GraphQL `trafficRealtime(networkId)` resolver, schema Extension 8 (honest fixture) — deployed (`e1d0e36`). `useTrafficRealtime` auto-flips `fallback`->`graphql` once the frontend reaches this backend; no frontend change needed.
- [x] TR-B2 `traffic_segments` PostGIS table + RLS + FK-safe 6-corridor seed; migration validated against a real postgis container — deployed (`ca58a57`)
- [ ] TR-B2b Wire the resolver to READ `traffic_segments` (tenant-RLS transaction + `ST_AsGeoJSON`), fixture fallback on empty/error
- [ ] TR-B3 Realtime feed ingestion (511 / MDOT / probe) OR SUMO+TraCI pod; provenance per segment
- [ ] TR-B4 Calibration against any measured counts; `confidence` per segment honest

## Later extensions (same segment shape, not in this slice)

- Historic replay (AADT hourly curve; `source_status: live` where counts exist,
  `estimate_basis: hourly_pattern` where not).
- Future projection (four-step model via SUMO MAROUTER on RunPod; scenario =
  graph branch + network change; animate baseline-vs-scenario delta). This is
  the high-value planner capability and a better fit for GraphQL because it
  composes scenario metadata, changed graph branches, baseline snapshots, and
  delta explanations.
- Cross-cutting: the time scrubber built here is the shared primitive the PorchFest planner and historical reconstruction also need (handoff §"Cross-cutting anime.js opportunities").
