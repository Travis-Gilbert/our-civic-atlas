# Creator Flow

This document describes how a city, neighborhood group, journalist, or civic
organization can start their own atlas node using the Our Civic Atlas package.

Flint Atlas is the first city node. The creator flow exists so that future
nodes do not have to copy Flint's specifics by hand.

## Who This Is For

- A city resident who wants to map their own place with the same source-first
  posture.
- A journalist who wants a public-good civic map alongside reporting.
- A neighborhood organization that wants visible source trails for the places
  they cover.
- A student or research group running a course project that should remain
  public.

This is not a one-click hosted product. It is a repository starting point.

## What A New Atlas Node Includes

Each node needs:

- A `source-registry.json` describing the sources that will appear publicly.
- Source probes for each source, recording what was inspected and when.
- A public read-model fixture set that follows
  `civic-object.schema.json`.
- Scene and node manifests that describe how the place is shown.
- Privacy and contribution settings that match the new node's policy.
- Plain-language governance and methodology pages adapted to that node.

The standalone repo's existing Flint files are the reference shape. A new node
should copy the shape and replace the contents, not copy the data.

## Step Sequence

1. **Fork the repository or vendor the public package.** Either keep the full
   app shell or take only `docs/public-package/`, `src/lib/atlas/`, and the
   relevant `src/data/open-flint-atlas/` paths.
2. **Rename the city node.** Replace `flint` slugs and paths with the new
   city slug. Keep the `open-flint-atlas` historical name only if you are
   continuing the Flint node.
3. **Replace the source registry.** Drop Flint sources and add the new node's
   sources. Each source needs a name, type, ownership, trust tier, terms
   note, privacy note, freshness expectation, and candidate layers.
4. **Run source probes.** For each new source, record public URLs, terms,
   export/API options, freshness signals, and any access caveats.
5. **Rebuild the public read model.** Replace the Flint fixtures under
   `src/data/open-flint-atlas/fixtures/static-package/data/` with read-model
   fixtures generated from the new sources.
6. **Adapt the scene and node manifests.** Update bounds, layers, scenes, and
   atlas-node metadata to match the new city.
7. **Adapt the governance and methodology pages.** Update roles, decision
   rules, and update cadence to match the new node's reality.
8. **Adapt the privacy and contribution pages.** Confirm that the field
   allowlist, redaction rules, and reviewer roles are correct for the new
   node.
9. **Run validators.** `npm run typecheck`, `npm run lint`,
   `npm run validate:atlas`, and any read-model or schema validators.
10. **Publish a static read-only node first.** Do not enable contribution
    intake until governance and moderation are real.

## What Stays Shared

- The `CivicObject`, `AtlasNode`, `SceneManifest`, and `ScenarioManifest`
  contracts.
- The dispute lifecycle and review states.
- The privacy field allowlist pattern.
- The release checklist gate names (runtime, product, vision).
- The plain-language public-good framing.

The shared contracts are what make multiple nodes feel like one civic atlas
infrastructure instead of disconnected maps.

## What Each Node Owns

- Source choices and trust tiers.
- Scene composition and camera modes.
- Local language and accessibility decisions.
- Local governance group and review cadence.
- The decision of whether to enable contribution intake at all.

## Anti-Goals

A new node should not:

- Present itself as the official local-government website.
- Publish raw contributor submissions without review.
- Treat ML or forecast outputs as truth without source-grounded records.
- Hide sources behind a logo, badge, or unsourced confidence number.

## Where The Tooling Lives

The starter tooling that turns a registry into a runnable node lives in
`scripts/generate-atlas-starter.mjs`. The package script alias is
`npm run atlas:starter`.

Quick reference:

```bash
# Print a sample config JSON.
npm run atlas:starter -- --sample-config

# Generate a starter from a config file.
npm run atlas:starter -- --config ./detroit-config.json --output-dir ./detroit-starter

# Dry-run to preview what would be written.
npm run atlas:starter -- --config ./detroit-config.json --output-dir ./detroit-starter --dry-run

# Validate an existing starter directory's shape.
npm run atlas:starter -- --validate-only --output-dir ./detroit-starter

# Show full usage.
npm run atlas:starter -- --help
```

The generated starter is intentionally minimal: it has no sources, no civic
objects, and no basemap. You must replace the source registry, add reviewed
civic objects, and provide a basemap before publishing.

## Related Documents

- `GOVERNANCE.md` for roles and decision rules.
- `METHODOLOGY.md` for the source-first posture.
- `CONTRIBUTING.md` for the contribution and review pattern.
- `PRIVACY.md` for private fields.
- `RELEASE-CHECKLIST.md` for the unified runtime/product/vision gates.
