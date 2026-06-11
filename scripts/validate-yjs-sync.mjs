/**
 * Phase 1 acceptance: "two BlockSuite clients edit one document synced
 * through RustyRed and converge with no lost write."
 *
 * Proves it with two real Yjs clients speaking the RustyRedDocSource wire
 * protocol (0x00 pull / 0x01 reply / 0x02 push+broadcast) against a running
 * rustyred-server. Start one locally first:
 *
 *   cd RustyRed-Graph-Database
 *   RUSTY_RED_MODE=memory RUSTY_RED_PORT=6464 cargo run -p rustyred-server
 *
 * Run: npm run validate:yjs-sync
 * Override the endpoint with RUSTYRED_SYNC_URL (ws://.../sync/yjs).
 */

import * as Y from 'yjs';

const BASE =
  process.env.RUSTYRED_SYNC_URL ??
  'ws://127.0.0.1:6464/v1/tenants/validate/sync/yjs';
const DOC_ID = `validate-${process.pid}-${Math.random().toString(16).slice(2, 8)}`;

const TAG_PULL = 0x00;
const TAG_PULL_REPLY = 0x01;
const TAG_UPDATE = 0x02;

let failures = 0;
function check(label, ok, detail) {
  if (ok) {
    console.log(`  ok  ${label}`);
  } else {
    failures += 1;
    console.error(`FAIL  ${label}`);
    if (detail !== undefined) console.error(`      ${JSON.stringify(detail)}`);
  }
}

function tagged(tag, payload) {
  const frame = new Uint8Array(payload.length + 1);
  frame[0] = tag;
  frame.set(payload, 1);
  return frame;
}

class SyncClient {
  constructor(name) {
    this.name = name;
    this.doc = new Y.Doc();
    this.received = [];
    this.pendingPulls = [];
  }

  text() {
    return this.doc.getText('t').toString();
  }

  connect() {
    return new Promise((resolve, reject) => {
      const url = `${BASE}/${encodeURIComponent(DOC_ID)}`;
      this.ws = new WebSocket(url);
      this.ws.binaryType = 'arraybuffer';
      const timeout = setTimeout(
        () => reject(new Error(`${this.name}: connect timeout to ${url}`)),
        5000,
      );
      this.ws.onopen = () => {
        clearTimeout(timeout);
        resolve();
      };
      this.ws.onerror = () => {
        clearTimeout(timeout);
        reject(new Error(`${this.name}: socket error connecting ${url}`));
      };
      this.ws.onmessage = (event) => {
        const frame = new Uint8Array(event.data);
        const payload = frame.slice(1);
        if (frame[0] === TAG_PULL_REPLY) {
          const pending = this.pendingPulls.shift();
          pending?.(payload);
        } else if (frame[0] === TAG_UPDATE) {
          this.received.push(payload);
          Y.applyUpdate(this.doc, payload);
        }
      };
    });
  }

  pull() {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`${this.name}: pull timeout`)),
        5000,
      );
      this.pendingPulls.push((payload) => {
        clearTimeout(timer);
        Y.applyUpdate(this.doc, payload);
        resolve(payload);
      });
      this.ws.send(tagged(TAG_PULL, Y.encodeStateVector(this.doc)));
    });
  }

  pushAll() {
    const update = Y.encodeStateAsUpdate(this.doc);
    this.ws.send(tagged(TAG_UPDATE, update));
  }

  insert(content) {
    this.doc.getText('t').insert(this.doc.getText('t').length, content);
  }

  close() {
    this.ws?.close();
  }
}

function settle(ms = 400) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log(`doc: ${DOC_ID}\nendpoint: ${BASE}\n`);

  console.log('1. A pushes; B pulls and converges');
  const a = new SyncClient('A');
  const b = new SyncClient('B');
  await a.connect();
  a.insert('porch ');
  a.pushAll();
  await settle();
  await b.connect();
  await b.pull();
  check('B sees A content after pull', b.text() === 'porch ', b.text());

  console.log('2. B pushes; broadcast reaches A live');
  b.insert('fest');
  b.pushAll();
  await settle();
  check('A received a broadcast frame', a.received.length > 0);
  check('A converged to merged text', a.text() === 'porch fest', a.text());
  check('B text matches A', b.text() === a.text(), { a: a.text(), b: b.text() });

  console.log('3. concurrent writes from both clients converge');
  a.insert(' on');
  b.insert(' carriage');
  a.pushAll();
  b.pushAll();
  await settle(700);
  check(
    'A and B agree after concurrent pushes',
    a.text() === b.text() && a.text().includes('on') && a.text().includes('carriage'),
    { a: a.text(), b: b.text() },
  );

  console.log('4. a fresh client pulls the full merged state');
  const c = new SyncClient('C');
  await c.connect();
  await c.pull();
  check('C matches the converged text', c.text() === a.text(), {
    a: a.text(),
    c: c.text(),
  });

  console.log('5. incremental pull with a current state vector is clean');
  const before = c.text();
  await c.pull();
  check('second pull is a no-op diff', c.text() === before, c.text());

  a.close();
  b.close();
  c.close();

  if (failures > 0) {
    console.error(`\nvalidate-yjs-sync: ${failures} failure(s)`);
    process.exit(1);
  }
  console.log('\nvalidate-yjs-sync: all checks passed');
  process.exit(0);
}

main().catch((error) => {
  console.error('validate-yjs-sync crashed:', error.message);
  console.error(
    'Is rustyred-server running? RUSTY_RED_MODE=memory RUSTY_RED_PORT=6464 cargo run -p rustyred-server',
  );
  process.exit(1);
});
