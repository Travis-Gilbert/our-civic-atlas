/**
 * Acceptance guard for the Phase 5 data seam:
 * civic-object rows -> existing PorchFest map placement contract.
 *
 * Run: npm run validate:civic-map-binding
 */

import {
  bindCivicRowsToMap,
  pointGeometryToCivicLocation,
} from '../src/lib/civic/civic-map-binding';
import {
  createCivicCollection,
  ensureCivicDatabase,
  insertCivicObject,
  readCivicObjects,
  updateCivicObjectField,
} from '../src/lib/civic/civic-workspace';
import type { CivicObjectFields } from '../src/lib/civic/civic-object-schema';

let failures = 0;

function check(label: string, ok: boolean, detail?: unknown) {
  if (ok) {
    console.log(`  ok  ${label}`);
  } else {
    failures += 1;
    console.error(`FAIL  ${label}`);
    if (detail !== undefined) {
      console.error(`      ${JSON.stringify(detail)}`);
    }
  }
}

const musician: CivicObjectFields = {
  category: 'musician',
  name: 'Tess Harmon',
  email: 'tess@example.com',
  city: 'Flint, MI',
  accessNeeds: 'Ground-level setup',
  sourceId: 'public:musician:tess@example.com',
  artistName: 'The Mason Street Two',
  genre: 'Folk',
  musicLink: 'https://example.com/mason-street-two',
  porchfestHistory: 'returning',
  canDoThirty: 'yes',
  location: '{"lng":-83.7062,"lat":43.0153}',
  setTime: '14:00-14:45',
  status: 'accepted',
};

const vendor: CivicObjectFields = {
  category: 'vendor',
  name: 'Ray Delgado',
  email: 'ray@example.com',
  sourceId: 'public:vendor:ray@example.com',
  businessName: 'Coney Ray',
  foodDescription: 'Flint-style coneys and loose burgers.',
  vendorNeeds: ['Power outlet'],
  status: 'submitted',
};

const entertainer: CivicObjectFields = {
  category: 'entertainer',
  name: 'Maya Brooks',
  email: 'maya@example.com',
  sourceId: 'public:entertainer:maya@example.com',
  actName: 'Maya Moves',
  actDescription: 'Interactive movement workshop for families.',
  location: '{"lng":-83.701,"lat":43.019}',
  status: 'in-review',
};

async function main() {
  console.log('1. seed civic workspace rows');
  const collection = createCivicCollection({ id: 'validate-civic-map-binding' });
  const handles = ensureCivicDatabase(collection);
  const musicianRowId = insertCivicObject(handles, musician);
  insertCivicObject(handles, vendor);
  insertCivicObject(handles, entertainer);

  console.log('2. adapt civic rows to map placements');
  const result = bindCivicRowsToMap(readCivicObjects(handles));
  check('two placed civic objects', result.placed.length === 2, {
    placed: result.placed.map((p) => p.id),
  });
  check('one unplaced civic object remains listed', result.unplaced.length === 1, {
    unplaced: result.unplaced.map((r) => r.fields.sourceId),
  });

  const musicPlacement = result.placed.find(
    (placement) => placement.id === musician.sourceId,
  );
  check('musician maps to music placement category', musicPlacement?.category === 'music', {
    got: musicPlacement?.category,
  });
  check('musician label uses civic object title', musicPlacement?.label === musician.artistName, {
    got: musicPlacement?.label,
  });
  check(
    'musician sublabel carries status and set time',
    musicPlacement?.sublabel === 'accepted · 14:00-14:45',
    { got: musicPlacement?.sublabel },
  );
  check(
    'musician point geometry uses civic location',
    musicPlacement?.geometry.coordinates[0] === -83.7062 &&
      musicPlacement.geometry.coordinates[1] === 43.0153,
    musicPlacement?.geometry,
  );
  check(
    'musician notes carry city and access needs',
    musicPlacement?.notes === 'Flint, MI | Access: Ground-level setup',
    { got: musicPlacement?.notes },
  );

  const entertainerPlacement = result.placed.find(
    (placement) => placement.id === entertainer.sourceId,
  );
  check(
    'entertainer falls back to amenity placement category',
    entertainerPlacement?.category === 'amenity',
    { got: entertainerPlacement?.category },
  );

  const unplacedVendor = result.unplaced[0];
  check(
    'unplaced vendor is not dropped',
    unplacedVendor?.fields.sourceId === vendor.sourceId,
    unplacedVendor?.fields,
  );

  console.log('3. map drag geometry serializes back to the civic field');
  const movedLocation = pointGeometryToCivicLocation({
    type: 'Point',
    coordinates: [-83.704, 43.016],
  });
  check(
    'point geometry serializes to civic location JSON',
    movedLocation === '{"lng":-83.704,"lat":43.016}',
    movedLocation,
  );
  if (movedLocation) {
    updateCivicObjectField(handles, musicianRowId, 'location', movedLocation);
    const movedRows = bindCivicRowsToMap(readCivicObjects(handles));
    const movedMusic = movedRows.placed.find(
      (placement) => placement.id === musician.sourceId,
    );
    check(
      'workspace location update moves the mapped placement',
      movedMusic?.geometry.coordinates[0] === -83.704 &&
        movedMusic.geometry.coordinates[1] === 43.016,
      movedMusic?.geometry,
    );
  }

  check(
    'invalid point geometry is rejected',
    pointGeometryToCivicLocation({ type: 'LineString', coordinates: [] }) === null,
  );

  if (failures > 0) {
    console.error(`\nvalidate-civic-map-binding: ${failures} failure(s)`);
    process.exit(1);
  }
  console.log('\nvalidate-civic-map-binding: all checks passed');
  process.exit(0);
}

main().catch((error) => {
  console.error('validate-civic-map-binding crashed:', error);
  process.exit(1);
});
