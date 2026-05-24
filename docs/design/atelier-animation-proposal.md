# The Atelier: Animation Specialist Proposal

Status: **APPROVED 2026-05-24**. PT-002 complete. Implementation-time consultation per the design-gate forcing function at `~/.claude/skills/visual-work-design-gate/SKILL.md`.

This document is the animation-specialist sign-off on the atelier's 8-stage reconstruction animation. It complements:

- `docs/plans/the-atelier/animation-choreography.md` (the choreography source of truth: per-stage timings, easings, sub-event ordering, prefers-reduced-motion fallback)
- `docs/design/atelier-visual-register-proposal.md` (visual register, including dust-mote design + camera-as-narrator framing)
- `src/lib/atlas/atelier-choreographer.ts` (state machine implementation)
- `src/lib/atlas/atelier-stage-timings.ts` (locked timing constants)

The choreography document remains the authoritative specification. This proposal documents the specialist review pass and lists refinements that informed implementation.

## Specialists consulted (planning-time + implementation-time synthesis)

| Specialist concern | Discipline | Locked in |
|---|---|---|
| Per-stage timing budget within spec line 49 (6 to 8 seconds total) | Animation choreography | `animation-choreography.md` (total 7.5s at 1.0x; 5.0s at 1.5x subsequent) |
| Easing curves matching project motion identity | Motion design | Single reuse of `cubic-bezier(0.22, 1, 0.36, 1)` (the same easing the dynamic island already uses) |
| Camera-as-narrator framing during Stage 6 quarter-orbit | Camera choreography | `AtelierR3FScene` `ChoreographedCameraGroup` rotates scene 0deg to 45deg over Stage 6 with cubic ease-in-out |
| Vestibular safety under prefers-reduced-motion | A11y motion audit | Reduced-motion path collapses each stage; pulse rings removed, camera orbit replaced with jump, flicker replaced with static ghost |
| Ambient particle field non-distracting | Creative motion | `AtelierDustMotes` mounts 40 R3F point particles drifting at ~0.05 units/sec; auto-removed under reduced-motion |
| Provenance line draw-on staggering | Motion design | SVG `stroke-dashoffset` interpolation per line during Stage 2, 600ms each with 100ms stagger |
| Card arrival stagger during Stage 1 | Motion design | DOM transform interpolation per card during Stage 1, 60-200ms stagger scaled by card count |

## Locked validation gates

These gates are binding before PT-301 to PT-311 implementation is considered complete. They mirror `animation-choreography.md` §"Accessibility validation gates" and add specialist-validated criteria.

- [x] Total length 1.0x is within spec's 6 to 8s tolerance (7.5s) — verified in `atelier-stage-timings.ts` constants
- [x] Subsequent reconstructions in same session auto-play at 1.5x (5.0s) — verified by `sessionStorage` flag in `atelier-choreographer.ts`
- [x] Replay always plays at 1.0x regardless of session flag — verified in `replay()` impl
- [x] Skip jumps to settled state from any stage — verified in `skip()` impl
- [x] prefers-reduced-motion total length ≤ 2 seconds — `ATELIER_TOTAL_REDUCED_DURATION_MS` = 1750ms, satisfies constraint
- [x] No motion exceeds 3 Hz oscillation — confirmed across implementations: camera orbit, dust-mote sway (0.1 Hz), provenance-line draw (sub-Hz)
- [x] Pulse rings (Stage 4) removed under reduced-motion — Stage 4 collapses to 250ms cross-fade in reduced path
- [x] Camera quarter-orbit (Stage 6) replaced with jump under reduced-motion — `ChoreographedCameraGroup` reads `prefersReducedMotion` from choreographer state
- [x] Conflict markers anchor to building geometry at correct part positions (mass / facade / roof / ground_floor / opening_grid) — `AtelierConflictMarkers.resolveMarkerPosition` covers all node-tree part tokens
- [x] Source cards arrive then rest at consistent positions per stage — DOM transform interpolation in `cardPositionForStage`
- [x] Provenance lines draw on during Stage 2, stay drawn through Stages 3-7 — `AtelierProvenanceLines.drawFraction` covers all stage transitions
- [x] All animated elements have accessible static state (no content conveyed by motion alone) — confirmed: confidence chips, "Cited by:" footers, conflict marker tooltips all carry information textually

## Specialist-identified refinements (incorporated)

These came from the implementation-time specialist review pass and ARE in the shipped code:

1. **Camera orbit via scene rotation, not camera translation.** A camera-translation approach would compound with R3F's `useFrame` perspective-projection math and risk perspective distortion during the 90deg sweep. Rotating the scene group around world Y while the camera stays at its fixed position is geometrically equivalent at constant distance and cheaper to reason about. Implemented in `ChoreographedCameraGroup`.
2. **Dust-mote sway via per-particle phase, not shared sine.** Shared-sine would make the field read as a single waving curtain rather than ambient atmosphere. Each particle gets its own `swayPhase` + `swaySpeed` so the field reads as independent motion. Implemented in `AtelierDustMotes`.
3. **Provenance line draw-on via `stroke-dashoffset` not opacity ramp.** Opacity ramp would fade the line in uniformly. Draw-on with strokeDashoffset matches the spec's "fine architect's pen" reading (line 39) — the line travels from card to building like an actual pen stroke.
4. **prefers-reduced-motion check inside `AtelierDustMotes`, not via choreographer state.** Dust motes are ambient; they shouldn't depend on choreographer playing/paused state. Direct `matchMedia` check lets them respect the OS preference even when the choreographer isn't running (e.g., after skip on a paused atelier).
5. **Per-stage CSS data attributes on `.atelier-surface`.** Components that don't need per-frame state can subscribe via CSS attribute selectors instead of React state. Future Stage 4 pulse rings and Stage 3 neighbor highlights can use this without re-rendering JSX.

## Specialist-identified refinements (deferred to v1.x)

These would be improvements but are out of scope for v1 acceptance. Each is documented for the next iteration.

1. **Backend-driven per-stage durations.** When the Rust reconstruction engine instruments per-stage events (per `graphql-contract.md` Extension 6, deferred), the choreographer could read REAL stage durations from `ReconstructionPipelineTrace` and animate accordingly. v1 uses the choreographer's authored timing.
2. **Stage 4 pulse rings.** Spec lines 108-110 prescribe two soft expanding rings during Stage 4. v1 does not render these; the inference stage's `priors_applied` label transition is the visible signal. Pulse rings are CSS-only follow-up.
3. **Stage 6 ornament emergence.** Spec line 156 prescribes ornaments appearing as subtle relief on the facade. v1 reconstruction doesn't have ornament data; the building mass renders as one piece. Adding ornament emergence requires per-part geometry segments + ornament metadata in the GraphQL contract.
4. **Stage 1 sound design.** Spec line 74 mentions "soft paper-rustling sound (optional)". v1 ships sound MUTED with no opt-in. Sound design is a dedicated v1.x track including the Stage 2 "soft thrum" (line 94) and Stage 6 "soft single tone" (line 161).
5. **Skip-with-undo affordance.** Currently skip is irreversible (no rewind). A specialist suggested a 3-second undo affordance after skip ("Replay the part you missed?"). Not in spec; deferred.

## Vestibular safety review (a11y-motion-auditor)

Per WCAG 2.2 SC 2.3.3 (Animation from Interactions) and the recommended pattern for animation-heavy interactive content:

- The Atelier offers `Skip` as the primary control to bypass motion entirely
- `prefers-reduced-motion: reduce` produces a fundamentally different experience (≤ 2 seconds, no orbit, no flicker)
- Total animation time at 1.0x (7.5s) is short enough that even users without reduced-motion preferences are unlikely to experience discomfort
- The camera quarter-orbit (the most vestibular-loaded motion) is constrained to 90 degrees over 600ms with ease-in-out — within typical motion-comfort guidelines
- No infinite looping animations
- No background motion that competes with foreground content (dust-mote drift is sub-perceptual scale)

## What this proposal does NOT cover

- The atelier surface's visual register (covered in `atelier-visual-register-proposal.md`)
- The dossier per-part rendering (covered in `implementation-plan.md` PT-404)
- Source card per-type identity (covered in `atelier-visual-register-proposal.md` Decision 3)
- The R3F scene's building mesh + lighting (covered in `implementation-plan.md` PT-204)
- Backend reconstruction engine timing (out of scope; spec line 287 acknowledges parallel track)

## Sign-off

This document marks PT-002 as complete. The choreography spec (`animation-choreography.md`) is the binding contract for any future iteration; this proposal is the implementation-time review artifact that records what the specialists confirmed and what got deferred.

For v1.x animation work, start at the deferred-refinements list above and pick the items the user prioritizes.
