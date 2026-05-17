# Release Checklist

One repeatable checklist for every release of Our Civic Atlas. Use it when
shipping a new node, a new scene, a new public read model, a renderer change,
or a new public surface.

This checklist is the contract for what "complete" means. It separates three
labels that must not be collapsed.

## The Three Completion Labels

- **Runtime complete**: the code path works and passes focused checks.
- **Product complete**: the enabled public surface is equal-or-better than the
  baseline and passes visual gates.
- **Vision complete**: the result reaches the stated ambition. If it does not,
  the remaining gap is named explicitly.

A release can ship at Runtime complete only if the Product complete and Vision
complete labels are addressed in the release notes, not silently deferred.

## Preflight

- [ ] `git status` is clean or the unstaged changes are intentional.
- [ ] The current branch is the intended delivery branch.
- [ ] The plan id and checklist ids in the release notes match the plan file.
- [ ] No new secrets, credentials, raw uploads, or private contributor data
      have been added.
- [ ] No `evidence`, `provenance`, or `epistemic` jargon has been added to
      public-facing copy.

## Static And Type Checks

- [ ] `npm run typecheck` passes.
- [ ] `npm run lint` passes.
- [ ] `npm run build` succeeds.
- [ ] JSON Schema validators pass for any changed schema.
- [ ] Markdown links in updated public-package docs resolve.

## Atlas Validators

- [ ] `npm run validate:atlas` passes.
- [ ] `npm run validate:dossier` passes if dossier types changed.
- [ ] `npm run validate:dossier:live` passes when a local server is running
      and dossier behavior changed.
- [ ] `npm run validate:routes:live` passes when a local server is running
      and route shape changed.
- [ ] Scene packet, read model, and source probe fixtures match their
      contracts.

## Runtime Complete Gate

- [ ] Affected routes load locally without console errors.
- [ ] Affected workers start, return, and fail in expected categories.
- [ ] Renderer mode for each touched route is the intended one (`deck`, `r3f`,
      `leaflet_fallback`, or `static`).
- [ ] Packet and read-model load paths fall back to JSON cleanly when the
      binary path is unavailable.

## Product Complete Gate

- [ ] Before screenshot exists for every replaced public surface.
- [ ] After screenshot exists for every replaced public surface.
- [ ] Target screenshot or reference exists when the change has a stated
      target.
- [ ] The Do Not Downgrade review concluded equal-or-better for the
      replaced surface, or the change was reverted.
- [ ] Mobile (390 x 844) and desktop are both reviewed.
- [ ] Reduced motion is respected on any animation change.
- [ ] Touch targets, dossier sheets, and search-first flows are reviewed on
      mobile.

## Vision Complete Gate

- [ ] The Vision Delta from the plan is updated.
- [ ] The release notes name what the change does not yet make true.
- [ ] If the release reduces scope, the deferral is listed in
      `Explicit Non-Goals and Deferrals` and not buried in commit text.

## Baseline And Reversibility

- [ ] The previous deck route, mobile fallback, and scene route are preserved
      until the new path passes Product complete.
- [ ] A rollback path exists (revert commit, feature flag, route fallback, or
      mode boundary).
- [ ] Removed code paths are removed in a separate commit after the new path
      has shipped at Product complete.

## Public Trust And Privacy

- [ ] The page or fixture still shows source names, freshness, and caveats.
- [ ] No public read model carries a private field listed in `PRIVACY.md`.
- [ ] Disputes referenced in the change have a public note or an explicit
      `unresolvable` label.
- [ ] Public copy does not claim official-city authority.

## Observability

- [ ] Events listed in `OBSERVABILITY.md` are emitted for the affected
      lifecycle stages.
- [ ] No event payload added a private field.
- [ ] Renderer fallback events fire when fallback engages.

## Documentation

- [ ] Changed contracts have updated comments or schema descriptions.
- [ ] `CHANGELOG.md` lists the change with a plain-language summary.
- [ ] Any new validator has a one-line description in `README.md` or this
      checklist.
- [ ] Stale doc paths (file moves, domain changes) are corrected in the same
      release that introduces the move.

## Final Reconciliation

- [ ] Every checklist item in the originating plan reconciles to `done`,
      `partial`, `blocked`, `skipped`, or `failed`. No items are renamed to
      hide work.
- [ ] Failing validators are reported as evidence, not softened to prose.
- [ ] The release notes link the plan, the change set, the screenshots, and
      the validator outputs.

## Related Documents

- `GOVERNANCE.md` for who can approve a release.
- `METHODOLOGY.md` for the source-first posture.
- `PRIVACY.md` for the private-field allowlist.
- `DISPUTES.md` for dispute state at release time.
- `OBSERVABILITY.md` for event names referenced above.
- `CREATOR-FLOW.md` for the release version of a new node.
