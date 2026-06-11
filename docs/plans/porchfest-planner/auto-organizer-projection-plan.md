# Auto-organizer projection: geo plugin + civic graph

Decision (Travis, 2026-06-11): incorporate the RustyRed Geo-space plugin via
the auto-organizer substrate (Option 2 of the geo-plugin theorem). Projection,
not rewiring: the civic-object Yjs store mirrors read-only into a RustyRed
graph; insights flow back as proposals with provenance; RustyRed never becomes
the store and never writes silently. This is the engine hook from
`porchfest-consolidation-and-engine-hook.md` section 4, unblocked.

## What fell into place today

1. The server-side view of the store EXISTS: production RustyRed
   (rustyred-production-fc07.up.railway.app) holds the live
   `civic:porchfest-2026` doc (77 rows, seeded + independently verified).
2. The decoder is PROVEN: `scripts/spike-civic-doc-projection.mjs` decodes
   the production doc into plain civic rows at the raw yjs level (no
   BlockSuite): `civic:column-ids` map for fieldKey -> columnId, `blocks`
   map for the database block, `prop:cells` per row, select option IDs
   resolved through column `data.options`. 77/77 rows, all categories,
   planning state intact. The yrs (Rust) port is the same CRDT surface.
3. The proposal-confirm UI EXISTS: the planner's import preview panel
   (Feature 2) is the human-confirm seam the consolidation doc specified.

## Topology fact that gates everything

`origin/Travis-Gilbert/rustyred-Geo-space-plugin` (tip cf33004: geometry
plugin API, geo/geozero Point + WKB + WKT encodings, contains/intersects/
within predicates, S2 RegionCoverer + H3 backends, plugin registry,
`/v1/tenants/:t/graph/spatial/:operation`) and RustyRed `main` (12f1636,
the yjs_sync line) DIVERGED; neither contains the other. Step 1 is the
merge, before any Civic Atlas work.

Operational caveat found while grounding: yjs_sync rooms are process-global
in-memory docs. A server restart drops room state until a client reconnects
and re-pushes; the durable truth is client IndexedDB. The projection job is
also the natural fix: projecting rows into RustyRed graph nodes on push
makes the PROJECTED VIEW durable server-side while CRDT truth stays
client-owned.

## Lanes

1. **Codex: RustyRed merge + redeploy.** Merge the geo branch onto main
   (make S2/H3 features compile beside yjs_sync), redeploy the Railway
   service `rustyred` (project rustyred-graphdb-demo, env production).
   Declared in the coordination room 2026-06-11.
2. **Projection job (after the merge):** a yrs-side decoder in
   rustyred-server (port of the spike) that, per tenant doc, projects civic
   rows into graph nodes with a `GeometryDesignation::point` on the parsed
   `location` (and WKB for imported line/polygon placements when those join
   the store). Trigger: on yjs push (hook) or interval batch; idempotent
   upsert keyed by rowId.
3. **Engine jobs over the projected graph,** in order of nearness:
   a. Entity resolution: KML pin <-> civic object merge proposals (name
      similarity + S2 cell proximity), surfaced in the import preview.
   b. Gap demons: standing queries (accepted-but-unscheduled,
      scheduled-address-without-geocode, placed-but-unledgered).
   c. Organizer briefing endpoint.
4. **Frontend (this repo):** proposals render in the existing
   preview-and-confirm panel; no new write path; nothing lands in the CRDT
   store without organizer confirmation.

## Falsifiers and fallbacks

- If the merge stalls, jobs (2)-(3) can run as a Node sidecar using the
  spike decoder against the live sync endpoint (slower, no graph-native
  spatial index; S2 via JS) without touching RustyRed internals.
- If yrs decoding surprises (it should not; same CRDT model), batch
  projection from the lossless CSV export is the degraded mode.

## Non-goals (this phase)

Browser-direct spatial queries against RustyRed (HTTP routes are
bearer-gated; the frontend carries no service token per AGENTS.md), Theseus
LLM extraction of unstructured drops (job 2 of the engine hook; later), and
event-scoping/productization (consolidation gap G).

## Execution status (2026-06-11, end of day)

Lanes 1 and 2 are LIVE in production:

- Geo plugin merged onto RustyRed main (e119963, clean merge, 170 tests)
  and deployed; spatial routes answering.
- Civic projection job shipped (26ea931) after adversarial review fixes:
  decoder structural guards (missing prop:columns/prop:cells/sys:children
  error instead of wiping), tenant allowlist
  (RUSTY_RED_CIVIC_PROJECTION_TENANTS=flint on the service), 10k row cap,
  doc-scoped node ids (civic-row:<docId>:<rowId>), H3 spatial index
  eviction symmetry, room-open priming (post-restart designation
  recovery), pre-commit generation re-check.
- Verified in production: authenticated nodes/query returns the projected
  civic_object rows; yjs room state survived the deploy restart (server
  persists room docs via save_doc, correcting this plan's earlier
  in-memory caveat: restarts do NOT lose the doc).

Lane 3 (engine jobs) is the open frontier: entity resolution proposals in
the import preview, gap demons, briefing endpoint.
