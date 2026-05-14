# Methodology

Open Flint Atlas starts with source accountability, not map decoration. The
method is intentionally inspectable so residents, journalists, organizers,
students, and public servants can see where each claim came from.

## 1. Source Registry

`docs/plans/open-flint-atlas/source-registry.json` is the first control point.
Each source records ownership, source type, trust tier, use notes, privacy
notes, update expectations, and candidate layers.

Sources are not treated as equally strong. Official, academic, public-health,
census, crash, map, and property-adjacent records can all be useful, but each
must carry its own caveats.

## 2. Source Probes

`data/open-flint-atlas/source-probes/*.json` stores the first inspection of each
source: public URLs, export/API paths, terms notes, freshness signals, and
initial layer inventory.

These probes are evidence of availability, not permission to scrape or publish
everything. They are reviewed before a source enters a public read model.

## 3. Public Read Model

`docs/plans/open-flint-atlas/public-read-model.schema.json` defines the public
fixture shape. The first fixtures under `fixtures/read-model/` avoid raw parcel
records and household-level implications.

The read model is deliberately static for v0.1. Static fixtures make the
project cheap to host, easy to audit, and safer to review before any live
submission or ingestion service exists.

## 4. Provenance Graph

`docs/plans/open-flint-atlas/provenance-graph-contract.md` defines the graph
contract. The fixture graph maps:

```text
Source -> Dataset -> Record -> Claim -> Place
```

It reserves explicit `SUPPORTS` and `CONFLICTS_WITH` semantics so disagreement
is visible rather than flattened into a single answer.

## 5. Confidence

Confidence cards explain why a place, metric, or claim is shown. They should
include source freshness, source type, caveats, and conflict notes. Confidence
is not an ML score pretending to be truth.

## 6. Community Observations

Community submissions are observations, not automatic facts. The contribution
workflow requires review, public field allowlisting, private moderation fields,
and safe summaries before anything can affect the public atlas.

## 7. Forecasting Deferral

Timeseries and spacetime graph models remain later experiments. They require
clean historical series, target variables, public labels, and prediction
caveats before they belong in a civic map.
