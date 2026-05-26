# Candidate Source Flow — design draft, 2026-05-26

Source: Codex direction to me (Claude Code) on 2026-05-26, captured in the
session at the end of the temporal-backfill pass.

## Why this exists

The atelier plan's "resident-first research path" introduces a third tier
of evidence that the current schema does not represent honestly:

| Tier | Where it lives | Who creates it | Trust |
|---|---|---|---|
| Artifact | `artifacts` + `artifact_anchors` in PostGIS | Explicit operator save or `promoteResearchArtifact` mutation | Canonical |
| Civic-research result | Ephemeral GraphQL response from `civicResearch` mutation | Theseus harness fractal expansion | Untrusted, transient |
| Candidate source | (NEW) `civic_research_candidate` nodes in Civic RustyRed | Auto-recorded on every `civicResearch` run | Hot, replayable, disposable |

Without a candidate tier, every unsaved civic-research result is either
treated as evidence (lying about its provenance), or thrown away the
moment the user navigates away (losing the work). The current shipped
panel does the second: it renders raw sources in a list with promote
buttons, but if the user clicks away or refreshes, the run is gone.
A candidate tier preserves the work, surfaces prior dismissals when the
user re-runs a similar query, and lets the engine eventually learn from
which candidates get promoted and which get dismissed without polluting
the canonical artifacts table.

## Constraints inherited from Codex's direction

1. **PostGIS remains truth.** The `artifacts` and `artifact_anchors`
   tables stay the canonical evidence store. No row in those tables
   originates from a candidate; promotion always goes through the
   existing `promoteResearchArtifact` mutation that already validates
   anchor + parcel context.
2. **Candidates live in Civic RustyRed.** Not in PostGIS, not in Redis,
   not in the frontend. The Civic Atlas backend already has a deployed
   RustyRed instance (`tenant_runtime_namespaces.rustyred_namespace`
   is the existing keying convention).
3. **Replayable or disposable.** Dropping every `civic_research_candidate`
   node must not lose anything important. Re-running the same
   civic-research query must (a) regenerate the candidate set and (b)
   preserve any prior promotion/dismissal status keyed on stable
   identity.
4. **No path from candidate to artifact except `promoteResearchArtifact`.**
   Even if the engine eventually wants to auto-promote high-confidence
   candidates, that auto-promotion must still call the same mutation
   so the path is uniform.

## Data model

### Node: `civic_research_candidate`

| Property | Type | Required | Notes |
|---|---|---|---|
| `tenant_id` | uuid | yes | Matches PostGIS `tenants.id`. Tenancy is enforced by RustyRed's path-scoped auth (`/v1/tenants/:tenant_id/...`). |
| `run_id` | string | yes | The `runId` from the `civicResearch` mutation response. |
| `source_id` | string | yes | The `id` of the source within the civic-research result (`results.sources[].id`). |
| `identity_key` | string | yes | Stable cross-run dedup key. Derived from `source_url` if present, else `(source_type, title)` slug. See "Identity + dedup" below. |
| `parcel_ref` | string | no | The frontend's `selectedBuilding`-derived parcel reference at time of return. Pass-through, not validated against PostGIS at write time. |
| `building_id` | string | no | Same source as `parcel_ref`. May be a UUID or `civic_object_id` slug. |
| `year` | int | no | The atelier year context if present (e.g., 1925). Useful for surfacing prior promotions for "same parcel, same year" recall. |
| `source_url` | string | no | URL of the underlying source (HathiTrust, LoC, Sanborn, etc.). |
| `title` | string | yes | Display string. |
| `source_type` | string | yes | Mirrors `artifacts.source_type` enum. |
| `confidence` | float | no | Confidence from the civic-research run. |
| `status` | enum | yes | One of `candidate`, `promoted`, `dismissed`. Default `candidate`. |
| `created_at_ms` | bigint | yes | Set on first write. |
| `updated_at_ms` | bigint | yes | Touched on every status transition. |
| `promoted_artifact_id` | uuid | no | Set when transitioning to `promoted`. References the PostGIS `artifacts.id` for the row that came out of `promoteResearchArtifact`. |
| `promoted_artifact_key` | string | no | Mirror of the same row's `artifact_key` (denormalized to avoid an extra PostGIS join for read paths). |
| `payload_jsonb` | json | no | Catch-all for civic-research metadata that doesn't fit a named property (e.g., highlight snippets, source citations the harness returned). |

### Edges

| Edge | Direction | Notes |
|---|---|---|
| `candidate -> run` | many-to-one | Optional: a `civic_research_run` node could carry the query string + result count if useful for analytics. Out of v1 scope; the `run_id` property on the candidate is enough for now. |
| `candidate -> parcel` | many-to-one | Soft link via `parcel_ref` property. Materializing this as a typed edge in RustyRed is an option once parcel nodes exist there; until then, the property is fine. |
| `candidate -> artifact` | one-to-one | Soft link via `promoted_artifact_id` property. Same reasoning. |

v1 deliberately uses properties instead of typed edges to keep the
candidate graph thin and easy to dispose. Edge materialization is a
follow-up if a query pattern needs it.

## Lifecycle

```
                                              dismiss
                                       +-------------+
                                       |             |
                                       v             |
   civicResearch  -->  candidate -->-->-->   dismissed
   (creates 1..N nodes)    |    \
                           |     \--> promote --> promoted
                           |                          |
                       (no-op /                       v
                        already-in-flight)        artifact row
                                                  (PostGIS)
```

### Create

When `civicResearch` resolver returns sources, the resolver (Axum,
post-civic-research) issues a bulk upsert to RustyRed:

```
POST /v1/tenants/{tenant_id}/nodes
[
  {
    "node_type": "civic_research_candidate",
    "natural_key": "<identity_key>",
    "props": { ...node props... }
  },
  ...
]
```

If the `identity_key` already exists (same source promoted or dismissed
in a prior run), the existing node's `status`, `promoted_artifact_id`,
and `updated_at_ms` are preserved; only `run_id`, `source_id`,
`parcel_ref`, `year`, and `confidence` get refreshed to reflect the
latest run that surfaced this candidate.

The civic-research GraphQL response is unchanged: the candidate write
is a side-effect of the resolver, not a field the frontend reads.

### Promote

When the frontend calls `promoteResearchArtifact(input)`:

1. The existing resolver writes the artifact row to PostGIS (already
   shipped).
2. After the PostGIS write succeeds, the resolver looks up the
   matching candidate node in RustyRed by `(tenant_id, run_id, source_id)`
   OR by `(tenant_id, identity_key)` if the input includes the URL.
3. If a candidate exists, transition `status` to `promoted` and set
   `promoted_artifact_id` + `promoted_artifact_key`.
4. If no candidate exists (e.g., direct promotion without a prior
   civic-research run), no-op the RustyRed write. Promotion is not
   gated on a candidate existing — the canonical write to PostGIS is
   what matters.

### Dismiss (new mutation)

```graphql
mutation DismissResearchCandidate($input: DismissCandidateInput!) {
  dismissResearchCandidate(input: $input) {
    candidateId
    status   # always "dismissed" on success
  }
}
```

Input requires `runId` + `sourceId`, optionally accepts a free-form
`reason` that gets stored in `payload_jsonb.dismissal_reason`.

### Replay

User reissues the same civic-research query:

1. `civicResearch` resolver returns sources as before.
2. Bulk upsert hits RustyRed with the same `identity_key` set.
3. For sources where the prior candidate has `status = promoted` or
   `status = dismissed`, the existing status is preserved.
4. The GraphQL response shape stays the same; the frontend reads prior
   status via a separate `listResearchCandidates(parcelRef, year)` query
   (see "New read surface" below).

### Dispose

Two valid disposal paths, both safe by design:

| Path | Trigger | What's lost |
|---|---|---|
| Per-tenant nuke | Operator script wipes all `civic_research_candidate` nodes for a tenant | Nothing important. Promoted artifacts survive in PostGIS. Dismissals are lost. |
| Aged-out cleanup | Optional nightly: delete candidates older than 90 days with `status = candidate` (untouched) | Same. Promoted candidates are never auto-deleted because their status is `promoted` and the join target lives in PostGIS. Dismissed candidates can be kept indefinitely if dismissal history is useful, or aged out by a separate rule. |

There is no "hard delete" path for promoted candidates. If an operator
wants to undo a promotion, they delete the PostGIS artifact row (which
cascades to artifact_anchors), and the candidate node's
`promoted_artifact_id` becomes a dangling reference. The candidate
should then be transitioned back to `status = candidate` by a
clean-up routine; this is out of v1 scope.

## Identity + dedup

`identity_key` is the cross-run dedup primitive. Construction rules:

1. If the source has a `source_url`, normalize and use it (lowercase
   scheme + host, strip trailing slash, strip URL fragments).
2. Else, build a slug from `(source_type, normalized_title)` where the
   title is lowercased + whitespace-collapsed + non-alphanumerics
   stripped.
3. Else, fall back to the civic-research-provided `source_id` (which
   is at minimum unique within a run).

The dedup happens server-side (Axum resolver), not in RustyRed, so we
avoid relying on RustyRed's natural-key semantics for cross-run
correlation.

## Plug-in points (where in existing code)

| Layer | Today | Change |
|---|---|---|
| `crates/civic-atlas-server/src/civic_research.rs` (or wherever the resolver lives) | Returns SearchResults to GraphQL | After the success branch, call `RustyRedClient::upsert_candidates(tenant_id, run_id, sources)` |
| `crates/civic-atlas-server/src/promote_research_artifact.rs` | Writes PostGIS rows | After PostGIS commit, call `RustyRedClient::transition_candidate(tenant_id, run_id, source_id, "promoted", artifact_id, artifact_key)` |
| `apps/graphql-server/src/schema.ts` | Has `promoteResearchArtifact`, `civicResearch` | Add `dismissResearchCandidate(input)` mutation + `listResearchCandidates(parcelRef, year)` query |
| `crates/rustyred-client/src/lib.rs` | Has `graph_vector_hybrid` only | Add `upsert_candidates`, `transition_candidate`, `list_candidates_by_parcel_year`, `nuke_candidates_for_tenant` |
| `src/components/atlas/CivicResearchPanel.tsx` (frontend) | Renders sources with Promote button | Add Dismiss button per row + read `listResearchCandidates` to surface "previously dismissed" / "already promoted" status before re-issuing a civic-research run |

## New read surface

```graphql
query ListResearchCandidates($parcelRef: String, $year: Int) {
  listResearchCandidates(parcelRef: $parcelRef, year: $year) {
    candidates {
      identityKey
      status
      sourceUrl
      title
      sourceType
      confidence
      promotedArtifactKey
      lastSeenRunId
      updatedAtMs
    }
  }
}
```

Read path:

1. Frontend calls this query when the panel mounts OR when the user
   selects a building (parcelRef changes).
2. The atlas panel shows prior promotions as "Saved as <artifactKey>"
   even before the user re-runs a search.
3. Dismissed candidates render as a collapsed "Previously dismissed
   (N)" affordance so dismissed work is recallable but doesn't clutter
   the active list.

## Open questions for Codex

1. **Scope of dismissal:** is a dismissed candidate dismissed for the
   tenant globally, or only for the `(parcelRef, year)` it was
   dismissed under? Recommendation: dismiss globally per tenant (per
   identity_key), since the candidate represents a source not a
   source-parcel-year tuple. A user dismissing a Sanborn sheet for
   parcel A shouldn't keep recommending it for parcel B that's on the
   same sheet.
2. **RustyRed write atomicity:** the `promoteResearchArtifact`
   resolver writes PostGIS first, then transitions the candidate.
   What's the failure-mode for the RustyRed write? Recommendation:
   log and continue. The PostGIS write is the truth; a dangling
   candidate (`status = candidate` but artifact exists) is reconcilable
   by a nightly task.
3. **Multi-edition of the same source:** Sanborn sheets exist in
   1899, 1903, 1925 editions. Same publisher, same neighborhood,
   different year. Are these one candidate (with edition info in
   `payload_jsonb`) or three candidates? Recommendation: three
   candidates, because the user's decision to promote/dismiss likely
   differs by edition.
4. **Confidence threshold:** does the bulk upsert filter sources by
   `acceptedConfidenceFloor` from the civic-research response, or
   does it accept everything the harness returned? Recommendation:
   accept everything; rely on the engine's per-source confidence and
   the user's promote/dismiss signal to filter.
5. **Run lifecycle:** does a `civic_research_run` node exist as a
   separate type with query string + timestamp + total sources, or is
   the `run_id` just a property on candidates? Recommendation: hold off
   on a typed run node until a query pattern needs it.

## Non-goals (v1)

- No engine-side training feedback. Promotions/dismissals are NOT yet
  fed back into the civic-research scoring. That's an integration the
  Theseus harness can pull when ready.
- No cross-tenant candidate sharing. Civic Atlas RustyRed is
  tenant-scoped at the path level; this design preserves that.
- No bulk operator UI. Dismissals happen per-row in the panel; mass
  dismissals are a follow-up.
- No edge materialization. Properties only in v1; typed edges to
  parcels/buildings/artifacts come later if a query needs them.

## Acceptance shape

When this design lands as code, the user-visible behavior is:

1. User runs civic-research for "Carriage Town Storefront history."
   Sources render with Promote + Dismiss buttons. Each source is
   silently upserted as a candidate in RustyRed.
2. User dismisses one source. Status transitions to `dismissed`.
3. User promotes another. Status transitions to `promoted`, the
   `artifacts` + `artifact_anchors` rows materialize in PostGIS
   (already shipping), and the candidate carries the
   `promoted_artifact_id` for replay.
4. User refreshes the page, picks the same building, opens the Ask
   tab. The panel queries `listResearchCandidates` for that parcel
   and renders the prior promotion + prior dismissal honestly without
   needing the user to re-run the search.
5. User re-runs the search anyway. The candidate upsert preserves
   prior status; previously-promoted sources show "Saved as
   <artifactKey>" + a disabled Promote button; previously-dismissed
   sources show in the collapsed "Previously dismissed" section.

## Sequencing

1. Add candidate node + bulk-upsert / status-transition methods to
   `rustyred-client`.
2. Hook the `civicResearch` resolver to upsert on success.
3. Hook the `promoteResearchArtifact` resolver to transition.
4. Add `dismissResearchCandidate` mutation + `listResearchCandidates`
   query to GraphQL.
5. Wire the frontend to call `listResearchCandidates` and render
   prior-status hints in the panel.
6. Add the nightly cleanup task (optional v1.1).

Each step is independently shippable; v1 is shippable after step 5
without the nightly cleanup.
