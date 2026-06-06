# Decision: GraphQL canonical for traffic realtime (REST shim = dev fallback)

Date: 2026-06-05
Status: **AGREED by both agents** (Claude Code + Codex), relayed by Travis
Coordination substrate: git working tree (harness coordination MCP down / HTTP 500)

## Decision

GraphQL `trafficRealtime(networkId: ID!)` (schema Extension 8) is the canonical
public read seam for the realtime traffic snapshot. The REST route
(`/api/v2/theseus/open-flint-atlas/traffic/realtime` + `fetchTrafficRealtime()`)
is demoted to a **dev / resolver-not-ready fixture fallback**, and retires once
the backend resolver lands (per the schema header's own note).

This supersedes the earlier "REST canonical" API-decision section that was
written into the README before both agents reconsidered.

## Why (both agents converged here independently)

- The snapshot is a **civic-domain object**: tenant context, road-network
  identity, per-segment provenance (`estimateBasis` / `sourceStatus`), source
  limits, measured-vs-inferred truth, and future scenario compatibility. That
  belongs in the typed curation boundary, not an opaque REST view-model.
- The schema header already declares the REST shim transitional: *"All atlas data
  fetching goes through this schema. The REST shim in /api/v2/theseus/... gets
  retired once this lands."*
- The curation boundary is a **privacy guarantee** for a PUBLIC atlas over
  Theseus: only allow-listed, typed fields can ever surface.
- The data-shape argument for REST (map-native GeoJSON) is real but handled by a
  tiny client adapter; it does not outweigh the above. (This is the argument
  Claude Code initially over-weighted and then withdrew.)

## Shape of the convergence (agreed)

```
Frontend
  useTrafficRealtime(networkId)
    -> GraphQL trafficRealtime(networkId)          [canonical]
       -> Axum resolver (TenantContext)
          -> road-network graph + live/inferred flow source
             -> TrafficRealtimeSnapshot
  dev / resolver-not-ready fallback
    -> fetchTrafficRealtime() REST shim -> same view model
```

A tiny adapter maps the GraphQL snapshot to the existing map/panel view model
(`src/lib/api/openFlintAtlas.ts` `TrafficRealtimeSnapshot`), so the render barely
changes. **GraphQL returns snapshots, not animation ticks**: the client keeps
animating particles locally between polls (`refreshIntervalSeconds`). This keeps
the backend contract clean while the map still feels real-time.

## Contract notes

- Extension 8 already includes the fields the REST shim proved useful:
  `refreshIntervalSeconds` (snapshot) and `expiresAt` (segment). [Codex's ask: done]
- Field vocabulary mirrors the proven REST shape, typed + camelCased:
  `estimateBasis`, `sourceStatus`, `sourceLabel`, `supportNote`, `speedMph`,
  `freeFlowSpeedMph`, `volumePerHour`, `congestionRatio`, `confidence`.

## Lanes

- **Claude Code (this commit):** schema Extension 8, the `TrafficRealtime`
  operation, codegen output, the `useTrafficRealtime` hook + GraphQL->view-model
  adapter + REST dev fallback, the shared `usePrefersReducedMotion` primitive,
  and this note.
- **Codex (render lane, your files):** swap the data source in
  `OpenFlintAtlasScene` (`loadTraffic` / `fetchTrafficRealtime`) to
  `useTrafficRealtime(networkId, { fallback: true })`; let the hook own polling;
  apply the two render hardening fixes below.
- **Backend lane:** `trafficRealtime` resolver (TenantContext) + road-network
  subgraph + live MDOT RIDE feed; retire the REST shim after.

## Render hardening (gaps found by the design review; apply in the render files)

- **TR-H1 reduced-motion (a11y gate):** guard the particle `setInterval`
  (`AtlasMap.tsx` ~L1736) with `usePrefersReducedMotion()`
  (`src/lib/atlas/use-prefers-reduced-motion.ts`). When reduced, skip the
  particle layer and keep the static congestion-coloured line layer: congestion
  still reads via colour + the panel numbers, so nothing is communicated by
  motion alone.
- **TR-H2 provenance honesty:** `trafficColor` (`AtlasMap.tsx` ~L787) keys full
  opacity off `estimate_basis === "live_feed"`. Change it to
  `source_status === "live"` so a FIXTURE segment never renders at full "live"
  opacity while the snapshot `status` is `fixture_fallback`. (When the live feed
  lands and `source_status` flips to `live`, those segments brighten: an honest
  visual signal of liveness.)
