/**
 * Feature 2 acceptance, headless half:
 *
 *  1. File-kind detection from content + name (deliverable 1).
 *  2. CSV plan: legacy Formspree headers map through the alias path,
 *     per-category counts come out right, email dedup flags collisions
 *     against the store AND inside the file, nothing writes (deliverable
 *     2 + 3).
 *  3. Commit: new rows land in a REAL CRDT store; collision `update`
 *     writes intake fields only (organizer planning state survives);
 *     `skip` writes nothing (deliverable 4).
 *  4. Round trip: export -> re-import plans ZERO new records
 *     (acceptance 4), and the GeoJSON export carries placed objects with
 *     minimal, PII-free properties (acceptance 5's shape).
 *  5. The shared KML/GeoJSON category rules route folders + labels the
 *     way the proven build-time importer did (deliverable 5's brain; the
 *     DOM walk itself is browser-verified).
 *
 * Run: npm run validate:planner-import
 */

import {
  buildCsvImportPlan,
  commitCsvImportPlan,
  detectImportKind,
  parseGeoJsonEventFeatures,
} from '../src/lib/civic/planner-import';
import {
  civicRowsToCsv,
  placedCivicRowsToGeoJson,
} from '../src/lib/civic/civic-export';
import { categoryFor, parseKmlCoordinates } from '../src/lib/civic/kml-event-layer-rules';
import {
  createCivicCollection,
  ensureCivicDatabase,
  insertCivicObject,
  readCivicObjects,
  updateCivicObjectField,
} from '../src/lib/civic/civic-workspace';
import type { CivicFieldKey, CivicObjectFields } from '../src/lib/civic/civic-object-schema';

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

console.log('1. file-kind detection');
check('csv by extension', detectImportKind('apps.csv', 'a,b\n1,2') === 'csv');
check(
  'csv by header sniff',
  detectImportKind('export.txt', 'Name,Email,Applying as\nA,a@x.dev,Musician') === 'csv',
);
check('kml by marker', detectImportKind('map.xml', '<?xml version="1.0"?><kml xmlns="http://www.opengis.net/kml/2.2"></kml>') === 'kml');
check(
  'geojson by content',
  detectImportKind('layer.json', '{"type":"FeatureCollection","features":[]}') === 'geojson',
);
check('junk json is not geojson', detectImportKind('x.json', '{"a":1}') === null);

console.log('2. CSV plan from legacy headers');
const legacyCsv = [
  'Applying as,Full Name,Email Address,Band Name,Genre,Band Size,history,Music Link,Can do thirty,Business,What do you serve,Food Type,vendorHistory,Act Name,Act Type,Act Description,Organization,Proposal,City',
  'Musician,Sol Artist,SOLO@Example.com,Sol Solo,Folk,Solo,first,https://x.dev/sol,yes,,,,,,,,,,Flint',
  'Musician,Band Leader,band@example.com,The Six,Jazz,6+ members,returning,https://x.dev/six,yes,,,,,,,,,,Flint',
  'Vendor,Ray D,ray@example.com,,,,,,,Coney Ray,Flint coneys,Coney / Hot Dogs,yes,,,,,,Flint',
  'Entertainer,Dee Mover,dee@example.com,,,,,,,,,,,Dee Moves,Dance,Street dance sets,,,Flint',
  'Community organization,Org Lead,org@example.com,,,,,,,,,,,,,,Helping Org,Table at the park,Flint',
  'Musician,Sol Artist,solo@example.com,Sol Solo,Folk,Solo,first,https://x.dev/sol,yes,,,,,,,,,,Flint',
].join('\r\n');

const emptyPlan = buildCsvImportPlan(legacyCsv, []);
check('record count = 6', emptyPlan.recordCount === 6, emptyPlan.recordCount);
check(
  'per-category split 2/1/1/1 + duplicate musician counted',
  emptyPlan.perCategory.musician === 3 &&
    emptyPlan.perCategory.vendor === 1 &&
    emptyPlan.perCategory.entertainer === 1 &&
    emptyPlan.perCategory.other === 1,
  emptyPlan.perCategory,
);
check(
  'in-file duplicate email flagged as collision (case-insensitive)',
  emptyPlan.collisions.length === 1 &&
    emptyPlan.collisions[0].existingRowId.startsWith('pending:'),
  emptyPlan.collisions.map((c) => c.existingRowId),
);
check('five new candidates', emptyPlan.newCandidates.length === 5);
check(
  'alias mapping landed (history -> porchfestHistory, Band Name -> artistName)',
  emptyPlan.newCandidates[0].civicObject.porchfestHistory === 'first' &&
    emptyPlan.newCandidates[0].civicObject.artistName === 'Sol Solo',
  emptyPlan.newCandidates[0].civicObject,
);

console.log('3. commit into a real CRDT store');
const collection = createCivicCollection({ id: 'validate-planner-import' });
const handles = ensureCivicDatabase(collection);
const storeWriter = {
  insert: (fields: CivicObjectFields) => insertCivicObject(handles, fields),
  update: (rowId: string, key: string, value: unknown) =>
    updateCivicObjectField(handles, rowId, key as CivicFieldKey, value),
};
const listRows = () =>
  readCivicObjects(handles).map((row) => ({
    rowId: row.rowId,
    title: row.title,
    fields: row.fields,
  }));

const commit1 = commitCsvImportPlan(storeWriter, emptyPlan);
check(
  'commit inserted 5, skipped the in-file duplicate',
  commit1.inserted === 5 && commit1.skipped === 1 && commit1.updated === 0,
  commit1,
);
check('store holds 5 rows', listRows().length === 5);

console.log('4. organizer state survives a collision update');
const soloRow = listRows().find((r) => r.fields.email === 'solo@example.com');
check('solo row present', Boolean(soloRow));
if (soloRow) {
  updateCivicObjectField(handles, soloRow.rowId, 'status', 'accepted');
  updateCivicObjectField(
    handles,
    soloRow.rowId,
    'location',
    '{"lng":-83.7,"lat":43.02}',
  );
  updateCivicObjectField(handles, soloRow.rowId, 'figureKey', 'musician-dj');
}
const updateCsv = [
  'Applying as,Full Name,Email Address,Band Name,Genre,Band Size,Music Link,Phone',
  'Musician,Sol Artist,solo@example.com,Sol Solo Updated,Folk Rock,Solo,https://x.dev/sol2,(810) 555-0000',
].join('\r\n');
const updatePlan = buildCsvImportPlan(updateCsv, listRows());
check('re-import of known email is a collision', updatePlan.collisions.length === 1 && updatePlan.newCandidates.length === 0);
const commit2 = commitCsvImportPlan(
  storeWriter,
  updatePlan,
  new Map([[updatePlan.collisions[0].existingRowId, 'update' as const]]),
);
check('collision resolved as update', commit2.updated === 1 && commit2.inserted === 0);
const updatedSolo = listRows().find((r) => r.fields.email === 'solo@example.com');
check(
  'intake fields updated (artistName, genre, phone)',
  updatedSolo?.fields.artistName === 'Sol Solo Updated' &&
    updatedSolo?.fields.genre === 'Folk Rock' &&
    updatedSolo?.fields.phone === '(810) 555-0000',
  updatedSolo?.fields,
);
check(
  'planning fields untouched (status, location, figureKey)',
  updatedSolo?.fields.status === 'accepted' &&
    updatedSolo?.fields.location === '{"lng":-83.7,"lat":43.02}' &&
    updatedSolo?.fields.figureKey === 'musician-dj',
  {
    status: updatedSolo?.fields.status,
    location: updatedSolo?.fields.location,
    figureKey: updatedSolo?.fields.figureKey,
  },
);

console.log('5. export -> re-import round trip is lossless on shared fields');
const exportedCsv = civicRowsToCsv(listRows());
check('export header uses schema keys', exportedCsv.startsWith('category,name,email,'));
const roundTripPlan = buildCsvImportPlan(exportedCsv, listRows());
check(
  'round trip plans ZERO new records (acceptance 4)',
  roundTripPlan.newCandidates.length === 0 &&
    roundTripPlan.collisions.length === listRows().length,
  {
    new: roundTripPlan.newCandidates.length,
    collisions: roundTripPlan.collisions.length,
  },
);

console.log('6. GeoJSON export: placed only, minimal properties');
const geo = placedCivicRowsToGeoJson(listRows());
check('one placed feature', geo.features.length === 1);
const feature = geo.features[0];
check(
  'coordinates + category + figure key present',
  feature?.geometry.coordinates[0] === -83.7 &&
    feature?.geometry.coordinates[1] === 43.02 &&
    feature?.properties.category === 'musician' &&
    feature?.properties.figureKey === 'musician-dj',
  feature,
);
check(
  'no PII keys in GeoJSON properties',
  feature !== undefined &&
    !('email' in feature.properties) &&
    !('phone' in feature.properties),
);

console.log('7. shared category rules (KML/GeoJSON brain)');
check('Music folder -> music', categoryFor(['Music'], 'Stage 3').category === 'music');
check('Vendors folder -> vendor', categoryFor(['Vendors'], 'Glass 4est').category === 'vendor');
check(
  'mixed folder + After Party label -> after_party',
  categoryFor(['Amenties & Misc'], 'After Party at the hall').category === 'after_party',
);
check(
  'Traffic Cones / Barriers folder -> amenity',
  categoryFor(['Traffic Cones / Barriers'], 'Cone run 3').category === 'amenity',
);
check(
  'no rule -> vendor + review note',
  (() => {
    const result = categoryFor(['Mystery'], 'Unlabeled');
    return result.category === 'vendor' && Boolean(result.note);
  })(),
);
check(
  'kml coordinates parse drops altitude',
  JSON.stringify(parseKmlCoordinates('-83.70,43.01,0 -83.71,43.02,0')) ===
    '[[-83.7,43.01],[-83.71,43.02]]',
);
const lineFeatures = parseGeoJsonEventFeatures(
  JSON.stringify({
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { name: 'Requested closure', category: 'amenity' },
        geometry: { type: 'LineString', coordinates: [[-83.7, 43.01], [-83.71, 43.02]] },
      },
      {
        type: 'Feature',
        properties: { name: 'Stage 1' },
        geometry: { type: 'Point', coordinates: [-83.705, 43.015] },
      },
    ],
  }),
);
check(
  'GeoJSON line features preserved with declared category',
  lineFeatures.length === 2 &&
    lineFeatures[0].geometry.type === 'LineString' &&
    lineFeatures[0].category === 'amenity' &&
    lineFeatures[1].category === 'music',
  lineFeatures.map((f) => ({ type: f.geometry.type, category: f.category })),
);

if (failures > 0) {
  console.error(`\nvalidate-planner-import: ${failures} failure(s)`);
  process.exit(1);
}
console.log('\nvalidate-planner-import: all checks passed');
process.exit(0);
