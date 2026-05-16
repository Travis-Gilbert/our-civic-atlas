# Our Civic Atlas Codex Guide

Use source data and checked-in fixtures as the authority for the current standalone app. Upstream Index-API plans explain intent, but this repo owns the public Our Civic Atlas product surface, with Flint Atlas as the first city node.

Current posture:
- Keep this repo separate from the Context Theorem harness UI.
- Treat the repo as public by default: do not commit secrets, private contributor data, raw uploads, or unreviewed personal information.
- Treat `/Users/travisgilbert/Tech Dev Local/Flint.OurAtlast.org` as the working idea vault, not the app root. Repo-local product intent lives in `docs/product-vault/flint-ouratlast/`, and executable plans live under `docs/plans/`.
- Reuse existing components and public design primitives wherever possible before inventing new UI.
- Visible UI should follow WCAG 2.2, WAI-ARIA Authoring Practices Guide patterns, Material Design 3 interaction/accessibility guidance, and Apple Human Interface Guidelines where they apply to a web civic atlas.
- Preserve the public-good framing: open contribution, source-backed support, reviewable confidence, and clear sourcing history.
- Public surface copy should avoid academic or trust-and-safety jargon such as `evidence`, `provenance`, and `epistemic`; keep those ideas in plain civic language for residents.
- Do not add staff-only/admin capture UI to the public route unless it is clearly separated from public contribution flows.
- ACC/ACT and TF.js scoring are advisory moderation aids, not final verdicts.
- Trust UI should read as progress and explanation, not a hard truth meter.
- V1 renderer intent is Three/R3F-first Atlas Scene. MapLibre/deck.gl are
  baseline/fallback and geospatial helper paths, not the ceiling of the product.
- Treat `r3f-atlas-scene-quality` as a parked experiment unless the user
  explicitly revives it as an active delivery lane.
- Lost Flint is a high-priority remaining product slice, not a late polish item.
- Mosaic/DuckDB-WASM, Brush/IFC/OpenBIM, and Rusty Red style geocache/hash
  lanes are part of the intended architecture when grounded by SceneManifest
  and reviewed public read models.

Validation:
- Prefer `npm run typecheck`, `npm run lint`, and a rendered browser smoke of `/open-flint-atlas`.
- For visual changes, capture screenshots before replacing the baseline and do not mark Product complete without a visual gate.

Context and compaction:
- Hard rule: when context is at or near 75% of the model window, stop before the
  next substantial tool call, emit a checkpoint, then run `/compact` if
  available. If the agent cannot trigger `/compact` directly, ask the user to
  run it and include the checkpoint in the message.
- A checkpoint must name the repo path, branch, files touched, validation
  state, unresolved risks, and the next unfinished item.
- For long-running UI or deploy work, compact before browser/server validation,
  deploy attempts, or switching between this repo, the vault, and `Index-API`.
- If a Theseus/Orchestrate harness is available, use its compact context
  machinery as the checkpoint payload when practical: `ContextArtifact`,
  compact map artifacts, compact retrieved objects, or the equivalent
  run/context pack. Outside the harness, use a plain Markdown checkpoint with
  the same facts.
