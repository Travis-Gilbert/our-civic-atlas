# PorchFest KMZ audit: Carriage Town Porch Fest 2026

Audit date: 2026-06-11.

## Source shape

The attached `Carriage Town Porch Fest 2026 (1).kmz` file is a Google My Maps
KMZ shortcut, not a self-contained feature archive. Its local `doc.kml` is a
single `NetworkLink` pointing to:

`https://www.google.com/maps/d/kml?mid=1EHXjQfBwtxD5yShqUopzW2g5d0Jo7dg`

Following that link returns the live Google My Maps payload. The live payload is
another KMZ containing a full `doc.kml` and icon assets.

## Live payload counts

| Folder | Features | Geometry |
|---|---:|---|
| Music | 17 | Point |
| Vendors | 44 | Point |
| Public Restrooms | 20 | Point |
| Trees and Landmarks | 8 | Point |
| Parking | 3 | Point |
| Requested Street Closures | 1 | LineString |
| Traffic Cones / Barriers | 8 | LineString |

Total: 101 placemarks, made of 92 point features and 9 line features. No
Polygon, MultiPolygon, or MultiGeometry features were present.

## Privacy scan

The live `doc.kml` has no `Data`, `SimpleData`, or `ExtendedData` blocks. A scan
for email, phone, contact, Venmo, Cash App, and address-like structured fields
found no obvious private-contact fields. The payload is still a public planning
map, so do not commit the raw KML/KMZ export unless the organizing team reviews
that choice.

## Current fixture delta

The checked-in `src/data/open-flint-atlas/fixtures/porchfest-2026.json` has 76
point placements:

| Category | Fixture count |
|---|---:|
| after_party | 1 |
| amenity | 8 |
| food_court | 2 |
| kid_zone | 1 |
| music | 14 |
| parking | 2 |
| rest_area | 2 |
| restroom | 1 |
| vendor | 45 |

Running the existing importer with the attached KMZ and `--follow-networklink`
produces 92 point placements and skips the 9 non-point features:

`amenity=8, music=17, parking=3, restroom=20, vendor=44; skipped 9 non-Point feature(s)`

This confirms the earlier consolidation doc: the live map disagrees with the
fixture and the planner must import/reconcile, not blindly replace.

## Implementation consequence

Feature 2 must support both:

1. Point import for the current planner/event placement path.
2. Non-point event features for closures and barrier runs.

The current import script intentionally skips non-point KML features. The
Feature 2 lane should preserve those 9 line features as GeoJSON `LineString`
objects and render them with a path/GeoJSON deck.gl layer before treating the
KMZ as fully ingested.
