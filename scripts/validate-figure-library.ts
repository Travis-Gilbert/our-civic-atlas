/**
 * Feature 1 acceptance, library + render-planning half:
 *
 *  1. Every figure key has a library entry whose procedural geometry is
 *     well-formed: triangle indices in range, positions inside the unit
 *     form [-0.5, +0.5], base reaching z = -0.5 (the consumer translates
 *     by height/2, so a floating base would hover every instance).
 *  2. Geometry instances are cached: SimpleMeshLayer uploads per pointer,
 *     so re-renders must receive the identical object.
 *  3. The bucket planner routes placements correctly: no figureKey ->
 *     plain category bucket (GraphQL placements render exactly as
 *     before); a valid figureKey -> per-figure bucket with the library
 *     entry; a GLB entry -> a bucket whose kind is glb, which the builder
 *     maps to ScenegraphLayer with NO layer-code change (acceptance 3's
 *     mechanism); junk keys and non-Point geometry never plan a figure.
 *
 * Run: npm run validate:figure-library
 */

import { CIVIC_FIGURE_KEYS } from '../src/lib/civic/civic-object-schema';
import {
  FIGURE_LIBRARY,
  getFigureGeometry,
  _resetFigureGeometryCacheForTest,
  type FigureLibraryEntry,
} from '../src/lib/atlas/porchfest-figure-library';
import {
  planAffordanceBuckets,
} from '../src/components/atlas/PorchfestAffordanceMeshLayer';
import type { AtlasEventPlannerPlacement } from '../src/components/atlas/AtlasEventPlannerLayer';

let failures = 0;
function check(label: string, ok: boolean, detail?: unknown) {
  if (ok) {
    console.log(`  ok  ${label}`);
  } else {
    failures += 1;
    console.error(`FAIL  ${label}`);
    if (detail !== undefined) console.error(`      ${JSON.stringify(detail)}`);
  }
}

function attributeArray(value: unknown): Float32Array | null {
  if (value instanceof Float32Array) return value;
  if (
    value &&
    typeof value === 'object' &&
    (value as { value?: unknown }).value instanceof Float32Array
  ) {
    return (value as { value: Float32Array }).value;
  }
  return null;
}

console.log('1. every figure key resolves to well-formed unit geometry');
_resetFigureGeometryCacheForTest();
for (const key of CIVIC_FIGURE_KEYS) {
  const entry = FIGURE_LIBRARY[key];
  check(`${key} has a library entry`, Boolean(entry));
  const [w, d, h] = entry.sizeM;
  check(`${key} size is positive`, w > 0 && d > 0 && h > 0, entry.sizeM);
  if (entry.kind !== 'procedural') continue;
  const geometry = getFigureGeometry(key);
  check(`${key} builds geometry`, Boolean(geometry));
  if (!geometry) continue;
  const attrs = (geometry as unknown as {
    attributes: Record<string, unknown>;
  }).attributes;
  const positions = attributeArray(attrs.POSITION);
  const normals = attributeArray(attrs.NORMAL);
  const indices = (geometry as unknown as {
    indices?: { value?: Uint32Array } | Uint32Array;
  }).indices;
  const indexArray =
    indices instanceof Uint32Array ? indices : indices?.value ?? null;
  check(`${key} has positions + normals`, Boolean(positions && normals));
  if (!positions || !normals || !indexArray) continue;
  check(
    `${key} normals match positions`,
    normals.length === positions.length,
    { positions: positions.length, normals: normals.length },
  );
  check(
    `${key} triangle indices complete`,
    indexArray.length % 3 === 0,
    indexArray.length,
  );
  const vertexCount = positions.length / 3;
  let indicesInRange = true;
  for (const index of indexArray) {
    if (index >= vertexCount) {
      indicesInRange = false;
      break;
    }
  }
  check(`${key} indices in range`, indicesInRange, { vertexCount });
  let minZ = Infinity;
  let outOfBounds = false;
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i];
    const y = positions[i + 1];
    const z = positions[i + 2];
    if (z < minZ) minZ = z;
    if (
      x < -0.5 || x > 0.5 ||
      y < -0.5 || y > 0.5 ||
      z < -0.5 || z > 0.5
    ) {
      outOfBounds = true;
    }
  }
  check(`${key} stays inside the unit form`, !outOfBounds);
  check(`${key} base reaches z=-0.5`, Math.abs(minZ - -0.5) < 1e-6, minZ);
}

console.log('2. geometry instances are cached per key');
const first = getFigureGeometry('musician-solo');
const second = getFigureGeometry('musician-solo');
check('same Geometry pointer across calls', Boolean(first) && first === second);

console.log('3. bucket planner routing');
function placement(
  overrides: Partial<AtlasEventPlannerPlacement>,
): AtlasEventPlannerPlacement {
  return {
    id: overrides.id ?? 'p1',
    eventLayerId: 'civic:porchfest-2026',
    category: overrides.category ?? 'music',
    sublabel: null,
    label: overrides.label ?? 'Test placement',
    geometry: overrides.geometry ?? {
      type: 'Point',
      coordinates: [-83.7, 43.02],
    },
    status: 'submitted',
    notes: null,
    ...overrides,
  };
}

const buckets = planAffordanceBuckets([
  placement({ id: 'graphql-1', category: 'music' }),
  placement({ id: 'civic-solo', category: 'music', figureKey: 'musician-solo' }),
  placement({ id: 'civic-band', category: 'music', figureKey: 'musician-band' }),
  placement({ id: 'civic-junk', category: 'music', figureKey: 'sasquatch' }),
  placement({
    id: 'line-1',
    category: 'music',
    geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] },
  }),
]);
const byId = new Map(buckets.map((b) => [b.id, b]));
check(
  'plain category bucket holds graphql + junk-key placements',
  byId.get('cat:music')?.placements.map((p) => p.id).sort().join(',') ===
    'civic-junk,graphql-1',
  byId.get('cat:music')?.placements.map((p) => p.id),
);
check(
  'solo figure bucket planned with procedural entry',
  byId.get('fig:music:musician-solo')?.entry?.kind === 'procedural',
);
check(
  'band figure bucket planned separately',
  byId.get('fig:music:musician-band')?.placements.length === 1,
);
check(
  'non-Point geometry never plans a bucket',
  ![...byId.values()].some((b) => b.placements.some((p) => p.id === 'line-1')),
);
check('bucket ids are sorted + stable', buckets.map((b) => b.id).join('|') ===
  [...buckets.map((b) => b.id)].sort().join('|'));

console.log('4. a GLB registry entry plans a glb bucket (acceptance 3)');
const glbLibrary: Record<string, FigureLibraryEntry> = {
  ...FIGURE_LIBRARY,
  'musician-solo': {
    kind: 'glb',
    url: '/figures/solo-performer.glb',
    sizeM: [2.2, 2.2, 2.0],
  },
};
const glbBuckets = planAffordanceBuckets(
  [placement({ id: 'civic-solo', category: 'music', figureKey: 'musician-solo' })],
  glbLibrary as typeof FIGURE_LIBRARY,
);
check(
  'figure bucket carries the glb entry',
  glbBuckets[0]?.entry?.kind === 'glb' &&
    (glbBuckets[0].entry as { url?: string }).url === '/figures/solo-performer.glb',
  glbBuckets[0]?.entry,
);

if (failures > 0) {
  console.error(`\nvalidate-figure-library: ${failures} failure(s)`);
  process.exit(1);
}
console.log('\nvalidate-figure-library: all checks passed');
