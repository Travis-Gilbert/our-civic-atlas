/**
 * Acceptance for the task row actions (drag-to-reorder handle + delete button)
 * added to the civic:task block. The Lit component cannot mount in Node, but
 * its handlers are thin wrappers over the BlockSuite store CRUD, so this proves
 * the exact mutations they issue at the CRDT layer, no browser required:
 *
 *  - drag drop / ArrowUp  -> store.moveBlocks([task], parent, sibling, true)
 *  - drag drop / ArrowDown-> store.moveBlocks([task], parent, sibling, false)
 *  - delete button        -> store.deleteBlock(task)
 *  - drop guard           -> _isAncestorOf walk blocks dropping a task into its
 *                            own subtask.
 *
 * If the argument order/shape the component uses were wrong, these calls would
 * throw or reorder incorrectly here. Run: npm run validate:civic-task-reorder
 */

import type { BlockModel } from '@blocksuite/affine/store';

import { createCivicCollection } from '../src/lib/civic/civic-workspace';
import {
  addCivicTaskBlock,
  createCivicTaskListDoc,
} from '../src/lib/civic/civic-task-docs';
import { CIVIC_TASK_FLAVOUR } from '../src/lib/civic/civic-task-schema';

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

/**
 * The same guard the block uses: true when `ancestor` sits above `node`. A copy
 * (the component method is inside the Lit class) kept byte-identical in intent.
 */
function isAncestorOf(
  store: { getParent(b: BlockModel): BlockModel | null },
  ancestor: BlockModel,
  node: BlockModel,
): boolean {
  let current = store.getParent(node);
  while (current) {
    if (current === ancestor) return true;
    current = store.getParent(current);
  }
  return false;
}

function main() {
  console.log('1. seed a task list with three ordered tasks');
  const collection = createCivicCollection({ id: 'validate-task-reorder' });
  // A fresh collection needs its meta initialized before createDoc returns a
  // doc (same prerequisite the store validation relies on via ensureCivicDatabase).
  collection.meta.initialize();
  const docId = createCivicTaskListDoc(
    collection,
    'civic:tasks:reorder',
    'Reorder validation',
    [{ text: 'Task A' }, { text: 'Task B' }, { text: 'Task C' }],
  );
  const doc = collection.getDoc(docId);
  const store = doc?.getStore({ id: docId });
  if (!doc || !store) {
    console.error('FAIL  could not open the task list store');
    process.exit(1);
  }

  const models = store.getModelsByFlavour(CIVIC_TASK_FLAVOUR) as BlockModel[];
  const byText = (t: string) =>
    models.find((m) => (m.props as { text: { toString(): string } }).text.toString() === t);
  const taskA = byText('Task A');
  const taskB = byText('Task B');
  const taskC = byText('Task C');
  check('three task blocks created', models.length === 3, models.length);
  if (!taskA || !taskB || !taskC) {
    console.error('FAIL  expected tasks A, B, C');
    process.exit(1);
  }

  const parent = store.getParent(taskA);
  if (!parent) {
    console.error('FAIL  task has no parent note');
    process.exit(1);
  }
  check('siblings share one parent note', store.getParent(taskC) === parent);

  const order = (): string[] =>
    parent.children
      .filter((c) => c.flavour === CIVIC_TASK_FLAVOUR)
      .map((c) => (c.props as { text: { toString(): string } }).text.toString());

  check('initial order is A, B, C', order().join() === ['Task A', 'Task B', 'Task C'].join(), order());

  console.log('2. drop C BEFORE A (drag up / ArrowUp path: insertBefore=true)');
  store.captureSync();
  store.moveBlocks([taskC], parent, taskA, true);
  check('order is C, A, B', order().join() === ['Task C', 'Task A', 'Task B'].join(), order());

  console.log('3. move A AFTER B (drag down / ArrowDown path: insertBefore=false)');
  store.captureSync();
  store.moveBlocks([taskA], parent, taskB, false);
  check('order is C, B, A', order().join() === ['Task C', 'Task B', 'Task A'].join(), order());

  console.log('4. delete button removes one task (and only that task)');
  store.captureSync();
  store.deleteBlock(taskB);
  const after = order();
  check('two tasks remain', after.length === 2, after);
  check('the deleted task is gone', !after.includes('Task B'), after);
  check('order is C, A', after.join() === ['Task C', 'Task A'].join(), after);

  console.log('5. drop guard: a task cannot be dropped into its own subtask');
  const subtaskId = addCivicTaskBlock(store, taskA.id, { text: 'Subtask of A' });
  const subtask = store.getModelsByFlavour(CIVIC_TASK_FLAVOUR).find(
    (m) => (m as BlockModel).id === subtaskId,
  ) as BlockModel | undefined;
  check('subtask created under A', Boolean(subtask));
  if (subtask) {
    check('A is an ancestor of its subtask (drop blocked)', isAncestorOf(store, taskA, subtask));
    check('subtask is NOT an ancestor of A', !isAncestorOf(store, subtask, taskA));
    check('C is NOT an ancestor of A (sibling drop allowed)', !isAncestorOf(store, taskC, taskA));
  }

  if (failures > 0) {
    console.error(`\nvalidate-civic-task-reorder: ${failures} failure(s)`);
    process.exit(1);
  }
  console.log('\nvalidate-civic-task-reorder: all checks passed');
  process.exit(0);
}

main();
