/**
 * Phase 2 acceptance: "a civic object created in the database persists in
 * the Yjs store and reopens with all fields, including the empty planning
 * fields."
 *
 * Proves it at the CRDT layer, no browser required:
 *  1. Collection A: bootstrap the civic database, insert a musician and a
 *     vendor with the real form field shapes.
 *  2. Encode A's doc as a Yjs update (the exact bytes a DocSource ships) and
 *     apply it into a fresh collection B. ensureCivicDatabase must ADOPT the
 *     synced database, not reseed it.
 *  3. B reads both rows back with every field intact, selects and
 *     multi-selects decoded to their human values, planning fields present
 *     (status=submitted) and money/location empty.
 *  4. Concurrent-edit convergence: A and B edit different planning fields,
 *     exchange updates both directions, and agree on the merged record.
 *
 * Run: npm run validate:civic-store
 */

import * as Y from 'yjs';

import {
  CIVIC_OBJECT_COLUMNS,
  type CivicObjectFields,
} from '../src/lib/civic/civic-object-schema';
import {
  CIVIC_EVENT_DOC_ID,
  createCivicCollection,
  ensureCivicDatabase,
  insertCivicObject,
  readCivicObjects,
  updateCivicObjectField,
} from '../src/lib/civic/civic-workspace';
import {
  createCivicTaskListDoc,
  listCivicWorkspaceDocs,
} from '../src/lib/civic/civic-task-docs';
import { CIVIC_TASK_FLAVOUR } from '../src/lib/civic/civic-task-schema';

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
  phone: '(810) 555-0142',
  city: 'Flint, MI',
  bio: 'Two-piece porch-folk act with a fiddle.',
  flintBased: 'yes',
  accessNeeds: 'Ground-level stage',
  artistName: 'The Mason Street Two',
  genre: 'Folk',
  musicLink: 'https://example.com/mason-street-two',
  musicLink2: 'https://example.com/live-set',
  bandSize: 'Duo',
  porchfestHistory: 'returning',
  canDoThirty: 'yes',
  equipment: ['Power outlet', 'Extra chairs'],
  ownPA: 'no',
};

const vendor: CivicObjectFields = {
  category: 'vendor',
  name: 'Ray Delgado',
  email: 'ray@example.com',
  businessName: 'Coney Ray',
  foodDescription: 'Flint-style coneys and loose burgers.',
  foodType: ['Coney / Hot Dogs', 'Burgers / Fries'],
  vendorLink: 'https://example.com/coney-ray',
  footprint: '10x10 tent',
  vendorNeeds: ['Power outlet', 'Waste disposal'],
  vendedBefore: 'yes',
};

function fieldsEqual(
  label: string,
  actual: Partial<CivicObjectFields>,
  expected: CivicObjectFields,
) {
  for (const [key, want] of Object.entries(expected)) {
    const got = actual[key as keyof CivicObjectFields];
    const equal = Array.isArray(want)
      ? Array.isArray(got) &&
        want.length === got.length &&
        want.every((v, i) => got[i] === v)
      : got === want;
    check(`${label}.${key} round-trips`, equal, { want, got });
  }
}

async function main() {
  console.log('1. bootstrap collection A and insert civic objects');
  const a = createCivicCollection({ id: 'validate-a' });
  const handlesA = ensureCivicDatabase(a);
  check(
    'all schema columns created',
    handlesA.columnIds.size === CIVIC_OBJECT_COLUMNS.length,
    {
      want: CIVIC_OBJECT_COLUMNS.length,
      got: handlesA.columnIds.size,
    },
  );
  check(
    'civic task block schema registered',
    handlesA.store.schema.flavourSchemaMap.has(CIVIC_TASK_FLAVOUR),
  );
  const taskDocId = createCivicTaskListDoc(
    a,
    'civic:todo:validate',
    'Validation tasks',
    [{ text: 'Confirm the task schema is first-class', priority: 'high' }],
  );
  const taskDoc = a.getDoc(taskDocId);
  const taskStore = taskDoc?.getStore({ id: taskDocId });
  const taskModels = taskStore?.getModelsByFlavour(CIVIC_TASK_FLAVOUR) ?? [];
  check('task-list doc appears in workspace docs', Boolean(taskDoc));
  check(
    'task-list doc is kinded separately from notes',
    listCivicWorkspaceDocs(a, CIVIC_EVENT_DOC_ID).find((doc) => doc.id === taskDocId)
      ?.kind === 'todo-list',
  );
  check('task-list doc contains civic:task blocks', taskModels.length === 1, {
    got: taskModels.length,
  });
  check(
    'civic:task block keeps registry-backed fields',
    taskModels[0]?.props.priority === 'high' &&
      taskModels[0]?.props.status === 'todo' &&
      taskModels[0]?.props.text.toString() ===
        'Confirm the task schema is first-class',
  );
  const musicianRowId = insertCivicObject(handlesA, musician);
  insertCivicObject(handlesA, vendor);

  const rowsA = readCivicObjects(handlesA);
  check('two rows in A', rowsA.length === 2, rowsA.length);
  const musicianA = rowsA.find((r) => r.fields.email === musician.email);
  const vendorA = rowsA.find((r) => r.fields.email === vendor.email);
  check('musician row found in A', Boolean(musicianA));
  check('vendor row found in A', Boolean(vendorA));
  if (musicianA) fieldsEqual('A.musician', musicianA.fields, musician);
  if (vendorA) fieldsEqual('A.vendor', vendorA.fields, vendor);
  check(
    'planning status defaults to submitted',
    musicianA?.fields.status === 'submitted',
    musicianA?.fields.status,
  );
  check(
    'submittedAt stamped at intake',
    typeof musicianA?.fields.submittedAt === 'string',
    musicianA?.fields.submittedAt,
  );
  check(
    'planning money fields empty at creation',
    musicianA?.fields.feePaid === undefined &&
      musicianA?.fields.paymentToBand === undefined,
  );
  check(
    'location empty at creation (unplaced, never hidden)',
    musicianA?.fields.location === undefined,
  );
  check(
    'row title is the public act name',
    musicianA?.title === 'The Mason Street Two',
    musicianA?.title,
  );

  console.log('2. persist: ship A\'s doc as a Yjs update into fresh B');
  const update = Y.encodeStateAsUpdate(handlesA.store.spaceDoc);
  const b = createCivicCollection({ id: 'validate-b' });
  b.meta.initialize();
  const docB = b.createDoc(CIVIC_EVENT_DOC_ID);
  const storeB = docB.getStore({ id: CIVIC_EVENT_DOC_ID });
  Y.applyUpdate(storeB.spaceDoc, update);
  const handlesB = ensureCivicDatabase(b);

  check(
    'B adopted the synced database (no reseed)',
    handlesB.model.props.columns.length === CIVIC_OBJECT_COLUMNS.length,
    handlesB.model.props.columns.length,
  );
  const rowsB = readCivicObjects(handlesB);
  check('two rows in B after sync', rowsB.length === 2, rowsB.length);
  const musicianB = rowsB.find((r) => r.fields.email === musician.email);
  const vendorB = rowsB.find((r) => r.fields.email === vendor.email);
  if (musicianB) fieldsEqual('B.musician', musicianB.fields, musician);
  if (vendorB) fieldsEqual('B.vendor', vendorB.fields, vendor);

  console.log('3. concurrent organizer edits converge across A and B');
  const musicianRowB = musicianB?.rowId;
  check('musician row id stable across sync', musicianRowB === musicianRowId, {
    a: musicianRowId,
    b: musicianRowB,
  });
  // A accepts and places; B assigns the set time. Different fields, same row.
  updateCivicObjectField(handlesA, musicianRowId, 'accepted', true);
  updateCivicObjectField(handlesA, musicianRowId, 'status', 'accepted');
  updateCivicObjectField(
    handlesA,
    musicianRowId,
    'location',
    '{"lng":-83.7062,"lat":43.0153}',
  );
  if (musicianRowB) {
    updateCivicObjectField(handlesB, musicianRowB, 'setTime', '14:00-14:45');
  }
  // Exchange updates both directions (what RustyRed will relay live).
  Y.applyUpdate(storeB.spaceDoc, Y.encodeStateAsUpdate(handlesA.store.spaceDoc));
  Y.applyUpdate(
    handlesA.store.spaceDoc,
    Y.encodeStateAsUpdate(storeB.spaceDoc),
  );

  const mergedA = readCivicObjects(handlesA).find(
    (r) => r.fields.email === musician.email,
  );
  const mergedB = readCivicObjects(handlesB).find(
    (r) => r.fields.email === musician.email,
  );
  for (const [side, merged] of [
    ['A', mergedA],
    ['B', mergedB],
  ] as const) {
    check(`${side} sees accepted=true`, merged?.fields.accepted === true);
    check(
      `${side} sees status=accepted`,
      merged?.fields.status === 'accepted',
      merged?.fields.status,
    );
    check(
      `${side} sees the placed location`,
      merged?.fields.location === '{"lng":-83.7062,"lat":43.0153}',
      merged?.fields.location,
    );
    check(
      `${side} sees setTime from the other organizer`,
      merged?.fields.setTime === '14:00-14:45',
      merged?.fields.setTime,
    );
  }

  console.log('5. column backfill: a contract column added after doc creation');
  // Simulate a doc created before the `figureKey` column existed: remove
  // the Figure column from the block. The key map keeps its (now stale)
  // entry, which is the exact state a live doc presents after a schema
  // addition plus a UI-side column delete. ensureCivicDatabase must discard
  // the stale mapping, recreate the column, and leave the field writable.
  const figureColumnId = handlesA.columnIds.get('figureKey');
  check('figure column resolved on the fresh doc', Boolean(figureColumnId));
  const columnsA = handlesA.model.props.columns as unknown as Array<{
    id: string;
  }>;
  const figureIndex = columnsA.findIndex((c) => c.id === figureColumnId);
  check('figure column present on the block before removal', figureIndex >= 0);
  handlesA.model.store.transact(() => {
    columnsA.splice(figureIndex, 1);
  });
  const healed = ensureCivicDatabase(a);
  const healedId = healed.columnIds.get('figureKey');
  check(
    'backfill created a replacement column id',
    Boolean(healedId) && healedId !== figureColumnId,
    { before: figureColumnId, after: healedId },
  );
  check(
    'backfilled column exists on the block',
    columnsA.some((c) => c.id === healedId),
  );
  updateCivicObjectField(healed, musicianRowId, 'figureKey', 'musician-solo');
  const healedRow = readCivicObjects(healed).find(
    (r) => r.fields.email === musician.email,
  );
  check(
    'figureKey writes and reads through the backfilled column',
    healedRow?.fields.figureKey === 'musician-solo',
    healedRow?.fields.figureKey,
  );

  if (failures > 0) {
    console.error(`\nvalidate-civic-store: ${failures} failure(s)`);
    process.exit(1);
  }
  console.log('\nvalidate-civic-store: all checks passed');
  // The workspace sync/awareness engines hold timers open; exit explicitly.
  process.exit(0);
}

main().catch((error) => {
  console.error('validate-civic-store crashed:', error);
  process.exit(1);
});
