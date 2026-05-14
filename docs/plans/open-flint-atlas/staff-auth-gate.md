# Open Flint Atlas Staff Auth Gate

Open Flint Atlas keeps the public map readable while making capture and review
operations explicitly operator-gated.

## Boundary

Public surfaces:

- `GET /api/v2/theseus/open-flint-atlas/manifest/`
- `GET /api/v2/theseus/open-flint-atlas/sources/`
- `GET /api/v2/theseus/open-flint-atlas/places/`
- `GET /api/v2/theseus/open-flint-atlas/places/{place_id}/`
- `GET /api/v2/theseus/open-flint-atlas/events/`
- `GET /api/v2/theseus/open-flint-atlas/provenance/`
- `GET /api/v2/theseus/open-flint-atlas/search/`

Staff-only surfaces:

- `GET /api/v2/theseus/open-flint-atlas/capture/sources/`
- `POST /api/v2/theseus/open-flint-atlas/capture/plan/`
- `POST /api/v2/theseus/open-flint-atlas/capture/jobs/`
- `GET /api/v2/theseus/open-flint-atlas/capture/jobs/{job_id}/`
- `GET /api/v2/theseus/open-flint-atlas/capture/artifacts/`
- `POST /api/v2/theseus/open-flint-atlas/review/promote/`

## Gate

The staff-only lane is closed unless both conditions are true:

1. `OPEN_FLINT_ATLAS_CAPTURE_ENABLED=true` is set on the Django API.
2. The request user is authenticated and has `is_staff` or `is_superuser`.

When the flag is off, capture endpoints return a disabled response instead of
planning crawls or exposing raw-artifact data.

The Next admin route has a separate build-time display switch:

`NEXT_PUBLIC_OPEN_FLINT_ATLAS_ADMIN_CONSOLE_ENABLED=true`

That switch does not grant permission. It only renders the console shell. The
API remains the authority for staff access and capture availability.

## Product Rationale

Open Flint Atlas is a public-interest civic atlas, not an official City of
Flint website and not a public crawler. Residents should be able to read source
cards, place dossiers, and confidence explanations without creating an account.

Capture is different. Crawl planning, raw artifacts, promotion stubs, and later
review queues can expose terms, privacy, household-level, or contributor-risk
details. Those operations stay staff-only until moderation, retention, abuse
handling, and reviewer permissions are fully implemented.

## Future Work

- Replace the frontend build-time switch with real route protection once
  Context Theorem frontend auth is enabled.
- Add role-specific permissions for reviewer, data steward, and privacy reviewer
  instead of a single staff gate.
- Keep public contribution UX separate from staff capture controls. Public
  reports should enter the observation review workflow, not the crawl lane.
