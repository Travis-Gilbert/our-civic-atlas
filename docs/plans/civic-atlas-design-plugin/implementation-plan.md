# Civic Atlas Design Plugin: Implementation Plan (Revision 2)

## Revision history

- **Revision 1 (2026-05-23 morning)**: Scoped the plugin around the historical-reconstruction discipline only, derived from `SPEC-MAP-BODY-AND-DISCIPLINE.md`. Install proposed as repo-shipped or personal. **This was wrong on scope.**
- **Revision 2 (this revision)**: Two corrections from user.
  - **Install**: moves to the harness at `/Users/travisgilbert/Tech Dev Local/codex-plugins/civic-atlas-design/` as a dual-host plugin, sibling to `production-theorem`, `animation-pro`, `cosmos-pro`, `django-design`, etc.
  - **Scope**: expands from one provenance mode (historical) to all four (`actual`, `historical`, `future`, `proposed`) as defined by `ScenarioRecord.provenance` in `src/lib/atlas/scenario-model.ts`. The plugin's job is the design language across all four modes plus the scenario-compare surface.

## What this is

A dual-host Claude Code + Codex plugin that encodes the visual discipline, form taxonomy, file map, scenario primitives, and per-mode aesthetic registers of the Civic Atlas across all four provenance modes:

- `actual` — present-day Flint (real built environment, OSM-derived current state)
- `historical` — reconstructed past (the SPEC-MAP-BODY-AND-DISCIPLINE focus)
- `future` — projected futures (envelope buildouts, predicted change)
- `proposed` — human-authored design propositions

Plus the scenario-compare surface where two modes can be put side by side and their deltas surfaced (KPI bundles, envelope changes, parcel-key diffs, binding constraints).

Loaded automatically when work happens inside `src/components/atlas/**` or `src/lib/atlas/**`. Its job is to make Claude and Codex informed collaborators on every design surface in the atlas, not just on building rendering.

## What this is NOT

- Not a generic urban design library (the baseline Urban-Design-Skills plugin already does that; the decision not to layer it is unchanged from Rev 1: theory is not load-bearing for a rendering surface).
- Not a React UI editor (that is what css.gui is; flagged as a possible follow-up only if you want a parametric single-building configurator surface someday).
- Not the implementation of any single SPEC. The historical SPEC, the scenario-branching Phase D plan, and any future SPEC are all things the plugin would help execute, not embody. When a SPEC lands, the relevant skill body and references get updated in the same PR.
- Not a substitute for the existing `visual-work-design-gate` skill. The gate still fires first on visual code edits; this plugin gives the gate's specialists better source material for atlas work specifically.

## Codebase grounding for the four modes

| Mode | Data model anchor | UI surface | Proposed aesthetic register |
|---|---|---|---|
| `actual` | OSM-derived current state, photographed materials, real heights in `urban-design-model.ts` properties | `AtlasMap.tsx` base raster + infrastructure layers + building extrudes at measured heights | Photographic accuracy. Basemap and infra layers do most of the visual work. Buildings render at measured heights with measured tags. No proposal chrome. No scenario badges. |
| `historical` | Reconstructed massings via `UrbanDesignFormType` (10 forms), fabric archetypes (`BuildingFabricArchetype`), classifier confidence (`typology_class`, `typology_confidence`) | Same map shell, swapped data, time-scrubber-aware (`atlas-time.ts`) | Chipboard study. Confidence gates archetype selection upstream. Three-parts-max. Anti-railroad taste. Per-form roof rules from SPEC §1. |
| `future` | Buildable envelopes via `ScenarioEnvelopeType` (`as_of_right`, `mixed_use_infill`, `missing_middle`, `adaptive_reuse`, `civic_anchor`), parcel-keyed via `ScenarioEnvelopeProperties` | `OpenFlintAtlasScene.tsx` scenario layer; `LayerControls.tsx` `scenarioEnvelopes` toggle; KPI bundle panels | OMA-style colorblock massing (the first attached reference). Reads as forecast/projection. Envelope-type drives color. Edge treatment reads as "this is a calculation, not a design." |
| `proposed` | Same envelope schema as `future`, distinguished by `ScenarioRecord.provenance = "proposed"` and scenario state (`draft` / `published`) | Same surfaces, distinguished in legend + chrome + register | Watercolor sketch and hand-drawn isometric registers (your watercolor and hand-drawn references). Reads as a human design proposition. Less calculated, more authored. |

### Cross-mode shared concepts

- The form taxonomy (`UrbanDesignFormType`, 10 values) is shared across modes; the rendering register differs but the form vocabulary stays the same.
- The fabric archetype catalog (`BuildingFabricArchetype`) is shared.
- The infrastructure layers (parks, water, rail, highways), the city perimeter, and the vignette mask are shared.
- The dossier discipline (no debug overlays in chrome, no confidence chips, real buttons with real handlers) is shared.
- The confidence-gates-selection rule is shared in spirit. It applies hardest to `historical` and `future`. For `actual` confidence is not a concept (the data is observed). For `proposed` the "confidence" is authorial intent, not classifier output.

## Install location and shape

`/Users/travisgilbert/Tech Dev Local/codex-plugins/civic-atlas-design/` as a sibling plugin to `production-theorem`, dual-host:

```
codex-plugins/civic-atlas-design/
  .claude-plugin/
    plugin.json
  .codex-plugin/
    plugin.json
  README.md
  plugin.manifest.json
  skills/                              (shared, read by both hosts)
    civic-atlas-foundations/
      SKILL.md
      references/
        codebase-map.md
        provenance-taxonomy.md
        form-and-fabric-catalog.md
        color-register.md
        aesthetic-references.md
    actual-mode-register/
      SKILL.md
      references/
        photographic-baseline.md
        material-vocabulary.md
    historical-mode-register/
      SKILL.md
      references/
        per-form-roof-rules.md
        geometry-recipes.md
        chipboard-vs-railroad.md
    future-mode-register/
      SKILL.md
      references/
        envelope-type-palette.md
        forecast-edge-treatments.md
    proposed-mode-register/
      SKILL.md
      references/
        watercolor-handdrawn-vocabulary.md
        authorial-edge-treatments.md
    scenario-compare-discipline/
      SKILL.md
      references/
        delta-overlay-encoding.md
        kpi-bundle-reading.md
        parcel-diff-surface.md
    cross-mode-discipline/
      SKILL.md
      references/
        map-body-color.md
        confidence-discipline.md
        dossier-discipline.md
        anti-pattern-catalog.md
  references/
    aesthetic-references/              (optional, see Open Decision 2)
      future-oma-colorblock-isometric.png
      proposed-watercolor-isometric.jpg
      proposed-handdrawn-isometric.png
      antipattern-graycube-clustering.png
      ...
```

Both manifests reference the same `skills/` tree, matching the source-of-truth pattern documented for production-theorem in the project CLAUDE.md.

## Skill inventory (Layer 0)

Seven Layer-1 skills. Foundation auto-fires; per-mode skills route via the foundation when context names a provenance; cross-cutting discipline is invoked manually or via routing.

| Skill | Auto? | Job | Target body size |
|---|---|---|---|
| `civic-atlas-foundations` | yes | Names the project, names the four provenance modes and the envelope-type tier, lists the form taxonomy, points at the codebase map, routes to specialists. | ~280 lines |
| `actual-mode-register` | no | Visual register for present-day rendering. Material honesty, basemap-led, infra-led, building heights at measured values. What stays out of chrome (proposal markers, scenario badges, forecast deltas). | ~150 lines |
| `historical-mode-register` | no | The SPEC's chipboard register. Confidence gates archetype upstream. Three-parts-max. Anti-railroad taste. Per-form roof rules from SPEC §1. | ~220 lines |
| `future-mode-register` | no | OMA-style colorblock projection. Reads as forecast. `ScenarioEnvelopeType` drives palette. Edge treatment for "this is a calculation." | ~180 lines |
| `proposed-mode-register` | no | Watercolor and hand-drawn proposition register. Reads as authored. Edge treatment for "this is a vision someone drew." | ~180 lines |
| `scenario-compare-discipline` | no | Two-mode side-by-side. Delta overlay encoding. KPI bundle reading. Parcel-key diff surface. State-aware (draft vs published affects opacity and chrome). | ~200 lines |
| `cross-mode-discipline` | no | Shared rules across all modes: map body color, vignette mask, perimeter glow, confidence-shapes-selection, dossier structure, fake-UI ban, anti-pattern catalog. | ~200 lines |

### Layer-2 references owned by the foundation

- `codebase-map.md`: concept -> file mapping. Includes the four-mode map: which file holds which mode's data, which component renders it, where the boundary between modes is enforced.
- `provenance-taxonomy.md`: definitions, examples, what triggers each mode, what data is required, the published/draft/archived state interaction.
- `form-and-fabric-catalog.md`: shared form types and fabric archetypes with cross-references to source files (`urban-design-model.ts`, `building-fabric.ts`).
- `color-register.md`: all hex codes across all modes plus the section colors (terracotta, teal, gold, green) plus the infra colors (parks, water, rail, highways) plus per-mode envelope-type palettes.
- `aesthetic-references.md`: curated visual library indexed by mode. The OMA-style image under `future`, watercolor and hand-drawn under `proposed`, the gray-cube clustering as the universal anti-pattern, future references for `actual` and `historical` as they are sourced.

## Worked example (cross-mode): adding a new proposed scenario

You ask Claude: "Add a new proposed scenario that turns the riverfront civic-anchor envelope into a missing-middle infill cluster, render it in the watercolor register, and queue a compare against the current safe-routes-starter future."

Without the plugin: Claude needs to discover `scenario-model.ts`, learn the envelope schema, infer the register from your verbal cue ("watercolor"), guess at the compare surface, and probably do all of it inconsistently with how the current historical register is rendered.

With the plugin: foundation auto-fires on the atlas context. The phrase "proposed scenario" routes to `proposed-mode-register`. The phrase "envelope" + the file context routes also to the shared envelope-type vocabulary in `form-and-fabric-catalog.md`. The phrase "compare against" routes to `scenario-compare-discipline`. The phrase "watercolor register" matches `proposed-mode-register` directly; Claude already knows the palette, edge treatment, and chrome rules. The plugin does not write the code; it primes the writer with consistent vocabulary and constraints across all three concerns (new scenario, render in proposed register, compare-view delta).

## Bridge to the existing visual-work-design-gate skill

The project-wide gate at `~/.claude/skills/visual-work-design-gate/SKILL.md` already fires on `.tsx` / `.css` / `.glsl` edits and mandates `superpowers:brainstorming` + `$impeccable shape` + `ui-design-pro:design-theory` + scan of `Theseus/Design Components/`. That stays in force. The civic-atlas-design plugin slots in below it: when the gate's brainstorming step asks "what is the design context here?", the foundation skill answers with provenance taxonomy, form vocabulary, codebase map, and per-mode aesthetic register. The gate continues to require a synthesized design proposal before any code; the plugin makes that proposal better-informed and more consistent across modes.

## What does NOT belong in this plugin

- Generic urban design theory (Lynch / Jacobs / Alexander / Gehl frameworks). The atlas is a rendering surface, not a planning tool.
- The KPI computation engine itself. The plugin reads KPI bundles and shapes the surface that displays them; it does not opine on which KPIs are correct.
- The scenario CRUD backend. The plugin shapes the FE surfaces; the GraphQL resolvers and the Ray/RunPod recompute jobs are out of scope.
- Build automation, lint config, CI hooks. Those live in the atlas repo's package.json and CI.
- Knowledge of OSM Overpass query syntax beyond the specific tags the historical SPEC names. If a future SPEC needs generic Overpass help, it gets its own plugin or skill.

## Decisions resolved by Rev 2

- **Install location**: `/Users/travisgilbert/Tech Dev Local/codex-plugins/civic-atlas-design/` as sibling plugin to production-theorem, dual-host (`.claude-plugin/` + `.codex-plugin/` + shared `skills/`).
- **Scope**: all four provenance modes plus scenario compare plus shared cross-mode discipline.
- **Name**: `civic-atlas-design`.

## Open decisions for Rev 2

1. **Phase 1 scope**: scaffold the foundation skill + ALL six specialized skills now, or trim to foundation + the two highest-leverage per-mode skills first? Recommendation: **foundation + `historical-mode-register` + `future-mode-register` + `cross-mode-discipline`** first. This covers the active design tension (the SPEC's historical work and the colorblock future projection that is most visually different from current chrome) plus the universal rules, then add `actual`, `proposed`, and `scenario-compare-discipline` as you do real work in those modes.

2. **Visual reference handling**: copy the four attached images into the new plugin at `codex-plugins/civic-atlas-design/references/aesthetic-references/`, OR into the project at `Open-Flint-Atlas-main-release/docs/visual-evidence/aesthetic-references/` and have the plugin link them by path? The plugin-local option is portable across atlases (the plugin could be reused for a hypothetical Detroit-Atlas, etc.); the project-local option keeps the images near the implementation they describe and the project's existing `docs/visual-evidence/` already exists.

3. **Bridge to project CLAUDE.md rules**: does this plugin take ownership of any rules that currently live in the Open Flint Atlas CLAUDE.md (the "no fake UI" rule, the design-gate, the visual register lock), or does it stay strictly atlas-rendering-specific and let the project CLAUDE.md own the cross-project rules? Recommendation: **stay strictly atlas-rendering-specific.** Anything that applies project-wide (no mock data, no parallel demo routes, no frontend-held tokens, etc.) is the project CLAUDE.md's job. The plugin is purely about rendering and visual register.

4. **Codex-side authoring**: should the codex manifest expose the same skill set as the claude manifest, or scope down (e.g., codex users get foundation + cross-mode-discipline only because they are more likely to be doing implementation than rendering judgment)? Recommendation: **same surface in both manifests.** The dual-host pattern is cleaner when both hosts see the same skills.

## Risks and gotchas (additions over Rev 1)

- **Mode confusion in chrome**: if `actual` and `proposed` envelopes render with similar styling, residents will read proposals as actual conditions. The per-mode registers must be visually distinct at first glance, not just on the legend. The `proposed-mode-register` and `actual-mode-register` skills both need an explicit "how is this distinguishable from the other modes at a glance" section.
- **Scenario-compare visual budget**: two overlapping mode renders is already a lot of visual load; adding KPI deltas and parcel diffs on top risks chrome chaos. The compare skill needs an explicit layering/budget rule that says what gets dimmed, what stays full opacity, and what gets a separate panel rather than an overlay.
- **Future-vs-proposed boundary**: technically both can use the same envelope schema. The data distinguishes them via `provenance`. The registers need a visual distinction that is stronger than legend text. Probably edge treatment + saturation vs an entirely different palette (palettes are limited; edge treatments are not).
- **Per-mode SPEC drift**: each SPEC that lands needs to be reconciled into the relevant mode skill in the same PR. Concrete rule: any commit touching a register-relevant file in `src/lib/atlas/**` should also touch the corresponding skill body or reference if a rule changed.
- **Layer 0 weight in the harness**: adding seven skills to the harness sibling raises the always-loaded metadata footprint for any conversation where the plugin's triggers fire. Foundation's `description` field needs a tight trigger phrasing (atlas surface explicitly named) so it does not auto-fire on unrelated work.

## Build sequence (revised)

1. Confirm the four Rev 2 open decisions.
2. Scaffold `codex-plugins/civic-atlas-design/` with dual-host manifests, README, plugin.manifest.json, and empty skill folders.
3. Author `civic-atlas-foundations/SKILL.md` plus the five shared references (`codebase-map.md`, `provenance-taxonomy.md`, `form-and-fabric-catalog.md`, `color-register.md`, `aesthetic-references.md`). Install locally and verify load from both Claude Code and Codex.
4. Trial run from Claude: ask Claude to do a read-only audit of `scenario-model.ts` and `urban-design-model.ts` against `provenance-taxonomy.md` and `form-and-fabric-catalog.md`. Confirm the foundation is routing correctly and the references are reachable.
5. Author the four Phase-1 specialized skills: `historical-mode-register`, `future-mode-register`, `cross-mode-discipline`. Author their per-skill references.
6. Validate with `plugin-dev:plugin-validator`.
7. Phase-1 acceptance: run an end-to-end task in each mode (a historical SPEC change to verify the chipboard register fires; a future scenario edit to verify the colorblock register fires; a compare-view review to verify cross-mode discipline holds) and verify the plugin primes Claude/Codex correctly without re-prompting.
8. Phase 2 (separate session): add `actual-mode-register`, `proposed-mode-register`, `scenario-compare-discipline` and their references.
9. Phase 3 (optional, if useful): scope a parametric building configurator surface (css.gui-inspired) as a standalone follow-up plan.
