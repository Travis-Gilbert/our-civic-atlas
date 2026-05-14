# Contributing

Open Flint Atlas welcomes help that makes public civic information clearer,
safer, and easier to inspect.

## Good Contributions

- Source suggestions with public URLs and terms notes.
- Corrections to source metadata or freshness.
- Accessibility fixes.
- Data dictionary improvements.
- Prototype UI fixes that make sources and caveats more legible.
- Validator improvements.

## Do Not Submit

Do not submit private identifying information, rumors about named people,
photos of people without consent, license plates, interiors, private contact
details, or household-level accusations.

## Source Changes

Source changes should update:

- `docs/plans/open-flint-atlas/source-registry.json`
- `data/open-flint-atlas/source-probes/`
- Any affected data dictionary notes
- Any affected public read-model fixtures

Then run the source and read-model validators.

## Community Observations

Community observations use these states:

```text
submitted -> needs_review -> corroborated/conflicts_with_official_source/accepted/rejected/superseded
```

Submissions do not become public facts automatically. Public output must use
the field allowlist in `contribution-workflow.schema.json`.

## Code And Docs

Keep changes small, source-grounded, and validator-backed. Do not introduce
secrets, service credentials, or live submission storage into the fixture
package.
