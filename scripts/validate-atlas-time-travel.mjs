#!/usr/bin/env node

const timeUrl = new URL(
  "../src/lib/atlas/atlas-time.ts",
  import.meta.url,
);
const reconstructionsUrl = new URL(
  "../src/lib/atlas/historical-reconstruction.ts",
  import.meta.url,
);

const {
  osmBuildingExistsInYear,
  parseAtlasYear,
  reconstructionExistsInYear,
} = await import(timeUrl);
const { FLINT_LOST_RECONSTRUCTIONS } = await import(reconstructionsUrl);

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

assert(parseAtlasYear("1925") === 1925, "bare 4-digit year should parse");
assert(parseAtlasYear(" 1925 ") === 1925, "trimmed year should parse");
assert(parseAtlasYear("ward 4") === null, "non-year query should not parse");
assert(parseAtlasYear("1799") === null, "year below atlas floor should not parse");

assert(
  osmBuildingExistsInYear({ year_built: "1898" }, 1925),
  "older OSM building should remain visible",
);
assert(
  !osmBuildingExistsInYear({ year_built: "1930" }, 1925),
  "future OSM building should be filtered",
);
assert(
  osmBuildingExistsInYear({ year_built: null }, 1925),
  "undated OSM building should preserve spatial context",
);

const visibleIn1925 = FLINT_LOST_RECONSTRUCTIONS.filter((item) =>
  reconstructionExistsInYear(item, 1925),
);
const visibleIn1970 = FLINT_LOST_RECONSTRUCTIONS.filter((item) =>
  reconstructionExistsInYear(item, 1970),
);

assert(
  visibleIn1925.length === 5,
  `expected 5 Carriage Town reconstructions in 1925, got ${visibleIn1925.length}`,
);
assert(
  visibleIn1970.length === 2,
  `expected 2 Carriage Town reconstructions in 1970, got ${visibleIn1970.length}`,
);

console.log(
  `validated atlas time travel: ${visibleIn1925.length}/5 reconstructions visible in 1925`,
);
