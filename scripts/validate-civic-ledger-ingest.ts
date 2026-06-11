/**
 * Acceptance guard for SCHEMA-CONTRACT.md:
 * capture ledger -> planning store reconciliation.
 *
 * Proves EventApplications rows from the Postgres intake ledger map into
 * CivicObjectFields, insert into the BlockSuite/YCRDT planning store, and
 * remain idempotent by `sourceKey == sourceId`.
 *
 * Run: npm run validate:civic-ledger-ingest
 */

import {
  createCivicCollection,
  ensureCivicDatabase,
  ingestCivicObjectsBySourceId,
  readCivicObjects,
  updateCivicObjectField,
} from '../src/lib/civic/civic-workspace';
import {
  mapEventApplicationToCivicFields,
  type EventApplicationLedgerRow,
} from '../src/lib/civic/civic-ledger-ingest';
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

function sameArray(actual: unknown, expected: string[]): boolean {
  return (
    Array.isArray(actual) &&
    actual.length === expected.length &&
    expected.every((value, index) => actual[index] === value)
  );
}

function ledgerRow(
  overrides: Partial<EventApplicationLedgerRow>,
): EventApplicationLedgerRow {
  return {
    id: 'ledger-default',
    category: 'musician',
    displayName: 'Default Display',
    contactName: 'Default Contact',
    contactEmail: 'default@example.com',
    contactPhone: null,
    city: null,
    bio: null,
    flintBased: false,
    accessNeeds: null,
    categoryPayload: {},
    planningPayload: {},
    status: 'submitted',
    location: null,
    setTime: null,
    sourceKey: 'public:musician:default@example.com',
    createdAt: '2026-06-11T12:00:00.000Z',
    ...overrides,
  };
}

const musicianLedger = ledgerRow({
  id: 'ledger-musician-1',
  category: 'musician',
  displayName: 'The Mason Street Two',
  contactName: 'Tess Harmon',
  contactEmail: 'tess@example.com',
  contactPhone: '(810) 555-0142',
  city: 'Flint, MI',
  bio: 'Two-piece porch-folk act with fiddle.',
  flintBased: true,
  accessNeeds: 'Ground-level setup',
  categoryPayload: {
    flintConnection: 'yes',
    artistName: 'The Mason Street Two',
    genre: 'Folk',
    musicLink: 'https://example.com/mason-street-two',
    musicLink2: 'https://example.com/live-set',
    bandSize: 'Duo',
    porchfestHistory: 'returning',
    canDoThirty: 'yes',
    equipment: ['Power outlet', 'Extra chairs'],
    ownPA: 'no',
    unknownMusicKey: 'kept in ledger only',
  },
  planningPayload: {
    accepted: true,
    contacted: true,
    fee: 35,
    payment_to_band: 100,
    set_time: '14:00-14:45',
  },
  status: 'accepted',
  location: { type: 'Point', coordinates: [-83.7062, 43.0153] },
  sourceKey: 'public:musician:tess@example.com',
});

const vendorLedger = ledgerRow({
  id: 'ledger-vendor-1',
  category: 'vendor',
  displayName: 'Coney Ray',
  contactName: 'Ray Delgado',
  contactEmail: 'ray@example.com',
  flintBased: false,
  categoryPayload: {
    flintConnection: 'nearby',
    businessName: 'Coney Ray',
    foodDescription: 'Flint-style coneys and loose burgers.',
    foodType: 'Coney / Hot Dogs, Burgers / Fries',
    vendorNeeds: 'Power outlet, Waste disposal',
    vendorHistory: 'yes',
  },
  sourceKey: 'public:vendor:ray@example.com',
});

const fallbackCategoryLedger = ledgerRow({
  id: 'ledger-unknown-1',
  category: 'organization',
  displayName: 'Neighborhood Poetry Table',
  contactName: null,
  contactEmail: 'poetry@example.com',
  categoryPayload: {
    orgName: 'Neighborhood Poetry Table',
    proposal: 'A table where residents write short poems for their block.',
    otherLinks: 'https://example.com/poetry-table',
  },
  sourceKey: 'public:other:poetry@example.com',
});

function expectFields(
  label: string,
  actual: Partial<CivicObjectFields> | undefined,
  expected: Partial<CivicObjectFields>,
) {
  check(`${label} row exists`, Boolean(actual));
  if (!actual) return;
  for (const [key, want] of Object.entries(expected)) {
    const got = actual[key as keyof CivicObjectFields];
    const equal = Array.isArray(want)
      ? sameArray(got, want)
      : got === want;
    check(`${label}.${key}`, equal, { want, got });
  }
}

async function main() {
  console.log('1. map ledger rows to civic-object fields');
  const mapped = [musicianLedger, vendorLedger, fallbackCategoryLedger].map(
    (row) => mapEventApplicationToCivicFields(row),
  );
  const [musician, vendor, fallback] = mapped;

  check(
    'unknown categoryPayload key is reported',
    musician?.droppedKeys.includes('unknownMusicKey') === true,
    musician?.droppedKeys,
  );
  check(
    'vendor legacy alias maps vendorHistory -> vendedBefore',
    vendor?.fields.vendedBefore === 'yes',
    vendor?.fields,
  );
  check(
    'flint boolean false preserves raw tri-state from payload',
    vendor?.fields.flintBased === 'nearby',
    vendor?.fields.flintBased,
  );
  check(
    'unknown category falls back to other',
    fallback?.fields.category === 'other',
    fallback?.fields.category,
  );

  console.log('2. ingest into BlockSuite/YCRDT planning store idempotently');
  const collection = createCivicCollection({ id: 'validate-ledger-ingest' });
  const handles = ensureCivicDatabase(collection);
  const addedFirst = ingestCivicObjectsBySourceId(
    handles,
    mapped.map((entry) => entry.fields),
  );
  const addedSecond = ingestCivicObjectsBySourceId(
    handles,
    mapped.map((entry) => entry.fields),
  );

  check('first ingestion inserts three rows', addedFirst === 3, addedFirst);
  check('second ingestion skips existing sourceIds', addedSecond === 0, addedSecond);

  const rows = readCivicObjects(handles);
  check('planning store has three rows', rows.length === 3, rows.length);

  const musicianRow = rows.find(
    (row) => row.fields.sourceId === musicianLedger.sourceKey,
  );
  expectFields('musician', musicianRow?.fields, {
    category: 'musician',
    sourceId: musicianLedger.sourceKey,
    name: 'Tess Harmon',
    email: 'tess@example.com',
    flintBased: 'yes',
    artistName: 'The Mason Street Two',
    equipment: ['Power outlet', 'Extra chairs'],
    accepted: true,
    contacted: true,
    feePaid: 35,
    paymentToBand: 100,
    setTime: '14:00-14:45',
    status: 'accepted',
    location: '{"lng":-83.7062,"lat":43.0153}',
  });

  const vendorRow = rows.find(
    (row) => row.fields.sourceId === vendorLedger.sourceKey,
  );
  expectFields('vendor', vendorRow?.fields, {
    category: 'vendor',
    sourceId: vendorLedger.sourceKey,
    name: 'Ray Delgado',
    email: 'ray@example.com',
    flintBased: 'nearby',
    businessName: 'Coney Ray',
    foodType: ['Coney / Hot Dogs', 'Burgers / Fries'],
    vendorNeeds: ['Power outlet', 'Waste disposal'],
    vendedBefore: 'yes',
    status: 'submitted',
  });

  const fallbackRow = rows.find(
    (row) => row.fields.sourceId === fallbackCategoryLedger.sourceKey,
  );
  expectFields('fallback', fallbackRow?.fields, {
    category: 'other',
    sourceId: fallbackCategoryLedger.sourceKey,
    name: 'Neighborhood Poetry Table',
    email: 'poetry@example.com',
    orgName: 'Neighborhood Poetry Table',
    proposal: 'A table where residents write short poems for their block.',
  });

  console.log('3. existing workspace edits win over later ledger replays');
  if (musicianRow) {
    updateCivicObjectField(handles, musicianRow.rowId, 'status', 'declined');
    const replayed = ingestCivicObjectsBySourceId(handles, [musician.fields]);
    const afterReplay = readCivicObjects(handles).find(
      (row) => row.fields.sourceId === musicianLedger.sourceKey,
    );
    check('replay still skips existing edited row', replayed === 0, replayed);
    check(
      'organizer-edited CRDT status is not overwritten by ledger replay',
      afterReplay?.fields.status === 'declined',
      afterReplay?.fields.status,
    );
  }

  if (failures > 0) {
    console.error(`\nvalidate-civic-ledger-ingest: ${failures} failure(s)`);
    process.exit(1);
  }
  console.log('\nvalidate-civic-ledger-ingest: all checks passed');
  process.exit(0);
}

main().catch((error) => {
  console.error('validate-civic-ledger-ingest crashed:', error);
  process.exit(1);
});
