/**
 * Acceptance guard for the public PorchFest application bridge.
 *
 * Proves that the form state used by /porchfest/apply can become BOTH:
 *  1. the GraphQL submit input accepted by the intake mutation, and
 *  2. the civic-object row stored in the shared BlockSuite/YCRDT workspace.
 *
 * Run: npm run validate:civic-apply-bridge
 */

import {
  civicObjectTitle,
  missingRequiredFields,
  type CivicObjectFields,
} from '../src/lib/civic/civic-object-schema';
import {
  createCivicCollection,
  ensureCivicDatabase,
  insertCivicObject,
  readCivicObjects,
} from '../src/lib/civic/civic-workspace';
import {
  INITIAL_PORCHFEST_APPLICATION_STATE,
  PORCHFEST_EVENT_SLUG,
  porchfestApplicationSourceKey,
  porchfestApplicationSubmitInput,
  porchfestApplicationToCivicObject,
  type PorchfestApplicationFormState,
} from '../src/lib/civic/porchfest-application';

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

function formState(
  overrides: Partial<PorchfestApplicationFormState>,
): PorchfestApplicationFormState {
  return {
    ...INITIAL_PORCHFEST_APPLICATION_STATE,
    ...overrides,
  };
}

function sameArray(actual: unknown, expected: string[]): boolean {
  return (
    Array.isArray(actual) &&
    actual.length === expected.length &&
    expected.every((value, index) => actual[index] === value)
  );
}

const samples = [
  formState({
    category: 'musician',
    name: 'Tess Harmon',
    email: 'TESS@example.com',
    phone: '(810) 555-0142',
    city: 'Flint, MI',
    bio: 'Two-piece porch-folk act with fiddle.',
    flintConnection: 'yes',
    accessNeeds: 'Ground-level setup',
    artistName: 'The Mason Street Two',
    bandSize: 'Duo',
    genre: 'Folk',
    setLength: '30 minutes',
    canDoThirty: 'yes',
    equipment: 'Power outlet, Extra chairs',
    ownPA: 'no',
    musicLink: 'https://example.com/mason-street-two',
    musicLink2: 'https://example.com/live-set',
    porchfestHistory: 'returning',
  }),
  formState({
    category: 'vendor',
    name: 'Ray Delgado',
    email: 'ray@example.com',
    city: 'Flint, MI',
    flintConnection: 'nearby',
    businessName: 'Coney Ray',
    foodDescription: 'Flint-style coneys and loose burgers.',
    foodType: 'Coney / Hot Dogs, Burgers / Fries',
    vendorLink: 'https://example.com/coney-ray',
    footprint: '10x10 tent',
    vendorNeeds: 'Power outlet, Waste disposal',
    vendedBefore: 'yes',
  }),
  formState({
    category: 'entertainer',
    name: 'Maya Brooks',
    email: 'maya@example.com',
    city: 'Flint, MI',
    flintConnection: 'yes',
    actName: 'Maya Moves',
    actType: 'Dance, Other',
    actDescription: 'Interactive movement workshop for families.',
    workLink: 'https://example.com/maya-moves',
  }),
  formState({
    category: 'other',
    name: 'Jordan Lee',
    email: 'jordan@example.com',
    city: 'Flint, MI',
    flintConnection: 'outside',
    orgName: 'Neighborhood Poetry Table',
    proposal: 'A table where residents write short poems for their block.',
    workLink: 'https://example.com/poetry-table',
    otherLinks: 'https://instagram.com/poetry-table',
    history: 'Piloted at a neighborhood cleanup.',
  }),
] satisfies PorchfestApplicationFormState[];

function checkGraphQlBridge(
  state: PorchfestApplicationFormState,
  civicObject: CivicObjectFields,
) {
  const input = porchfestApplicationSubmitInput(state);
  const sourceKey = porchfestApplicationSourceKey(state);
  check(`${state.category} event slug`, input.eventSlug === PORCHFEST_EVENT_SLUG);
  check(`${state.category} category`, input.category === state.category);
  check(`${state.category} source key`, input.sourceKey === sourceKey);
  check(
    `${state.category} source key matches civic sourceId`,
    input.sourceKey === civicObject.sourceId,
  );
  check(
    `${state.category} email lower-cased`,
    input.contactEmail === civicObject.email,
    { input: input.contactEmail, civic: civicObject.email },
  );
  check(
    `${state.category} display name matches workspace title`,
    input.displayName === civicObjectTitle(civicObject),
    { input: input.displayName, title: civicObjectTitle(civicObject) },
  );

  if (state.category === 'musician') {
    check(
      'musician payload splits equipment',
      sameArray(input.categoryPayload?.equipment, [
        'Power outlet',
        'Extra chairs',
      ]),
      input.categoryPayload,
    );
    check(
      'musician payload uses select strings for yes/no fields',
      input.categoryPayload?.canDoThirty === 'yes' &&
        input.categoryPayload?.ownPA === 'no',
      input.categoryPayload,
    );
  }

  if (state.category === 'vendor') {
    check(
      'vendor payload splits food types',
      sameArray(input.categoryPayload?.foodType, [
        'Coney / Hot Dogs',
        'Burgers / Fries',
      ]),
      input.categoryPayload,
    );
  }

  if (state.category === 'entertainer') {
    check(
      'entertainer payload splits act types',
      sameArray(input.categoryPayload?.actType, ['Dance', 'Other']),
      input.categoryPayload,
    );
  }

  if (state.category === 'other') {
    check(
      'other payload keeps link field as a planner link value',
      input.categoryPayload?.otherLinks === state.otherLinks,
      input.categoryPayload,
    );
  }
}

function checkRoundTrip(
  expected: CivicObjectFields,
  actual: Partial<CivicObjectFields> | undefined,
) {
  check(`${expected.category} row found by sourceId`, Boolean(actual));
  if (!actual) return;
  for (const [key, want] of Object.entries(expected)) {
    const got = actual[key as keyof CivicObjectFields];
    const equal = Array.isArray(want)
      ? sameArray(got, want)
      : got === want;
    check(`${expected.category}.${key} round-trips`, equal, { want, got });
  }
  check(
    `${expected.category} starts as submitted`,
    actual.status === 'submitted',
    actual.status,
  );
  check(
    `${expected.category} submittedAt is stamped`,
    typeof actual.submittedAt === 'string',
    actual.submittedAt,
  );
}

async function main() {
  console.log('1. map public application state to GraphQL + civic objects');
  const civicObjects = samples.map((state) => {
    const civicObject = porchfestApplicationToCivicObject(state);
    checkGraphQlBridge(state, civicObject);
    const missing = missingRequiredFields(civicObject);
    check(`${state.category} required fields present`, missing.length === 0, {
      missing,
    });
    return civicObject;
  });

  console.log('2. insert mapped objects into the shared civic workspace');
  const collection = createCivicCollection({ id: 'validate-apply-bridge' });
  const handles = ensureCivicDatabase(collection);
  for (const civicObject of civicObjects) {
    insertCivicObject(handles, civicObject);
  }

  const rows = readCivicObjects(handles);
  check('four application rows inserted', rows.length === 4, rows.length);

  for (const civicObject of civicObjects) {
    const row = rows.find((candidate) => {
      return candidate.fields.sourceId === civicObject.sourceId;
    });
    check(
      `${civicObject.category} row title is public display name`,
      row?.title === civicObjectTitle(civicObject),
      row?.title,
    );
    checkRoundTrip(civicObject, row?.fields);
  }

  if (failures > 0) {
    console.error(`\nvalidate-civic-apply-bridge: ${failures} failure(s)`);
    process.exit(1);
  }
  console.log('\nvalidate-civic-apply-bridge: all checks passed');
  process.exit(0);
}

main().catch((error) => {
  console.error('validate-civic-apply-bridge crashed:', error);
  process.exit(1);
});
