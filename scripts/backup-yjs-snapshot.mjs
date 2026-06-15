/**
 * Full backup of the porchfest civic workspace from the RustyRed sync server.
 *
 * Pulls the collection root doc, enumerates every sub-doc (applications, the
 * tasks database, every to-do/task list incl. block-style ones like Sponsors,
 * organizer notes, the email inbox), and writes each doc's full Yjs state as a
 * restorable base64 update plus a manifest. Restore = Y.applyUpdate a blank
 * Y.Doc with the saved update.
 *
 *   node scripts/backup-yjs-snapshot.mjs
 *   RUSTYRED_SYNC_URL=wss://.../sync/yjs node scripts/backup-yjs-snapshot.mjs
 */

import * as Y from 'yjs';
import { writeFileSync, mkdirSync } from 'node:fs';

const BASE =
  process.env.RUSTYRED_SYNC_URL ??
  'wss://rustyred-production-fc07.up.railway.app/v1/tenants/flint/sync/yjs';
const ROOT_ID = process.env.ROOT_DOC_ID ?? 'civic-atlas-event-planning';
const KNOWN = [
  'civic:porchfest-2026',
  'civic:tasks:porchfest-2026',
  'civic:notes:porchfest-2026',
];

const TAG_PULL = 0x00;
const TAG_PULL_REPLY = 0x01;

function tagged(tag, payload) {
  const frame = new Uint8Array(payload.length + 1);
  frame[0] = tag;
  frame.set(payload, 1);
  return frame;
}

function pullDoc(docId) {
  return new Promise((resolve, reject) => {
    const doc = new Y.Doc();
    const url = `${BASE}/${encodeURIComponent(docId)}`;
    const ws = new WebSocket(url);
    ws.binaryType = 'arraybuffer';
    const to = setTimeout(() => {
      try {
        ws.close();
      } catch {}
      reject(new Error(`timeout ${docId}`));
    }, 20000);
    ws.onerror = () => {
      clearTimeout(to);
      reject(new Error(`ws error ${docId}`));
    };
    ws.onmessage = (ev) => {
      const frame = new Uint8Array(ev.data);
      if (frame[0] === TAG_PULL_REPLY) {
        clearTimeout(to);
        try {
          Y.applyUpdate(doc, frame.slice(1));
        } catch {}
        ws.close();
        resolve(doc);
      }
    };
    ws.onopen = () => ws.send(tagged(TAG_PULL, Y.encodeStateVector(doc)));
  });
}

function docIdsFromRoot(root) {
  const ids = new Set();
  try {
    const pages = root.getMap('meta').get('pages');
    if (pages && pages.toArray) {
      for (const p of pages.toArray()) {
        const id = p && p.get ? p.get('id') : p && p.id;
        if (id) ids.add(id);
      }
    }
  } catch {}
  for (const name of ['spaces', 'docs']) {
    try {
      root.getMap(name).forEach((_v, k) => ids.add(k));
    } catch {}
  }
  try {
    root.getSubdocs().forEach((d) => d.guid && ids.add(d.guid));
  } catch {}
  return [...ids];
}

async function main() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dir = `backup/yjs-snapshot-${stamp}`;
  mkdirSync(dir, { recursive: true });
  const manifest = [];

  const root = await pullDoc(ROOT_ID);
  const rootState = Y.encodeStateAsUpdate(root);
  writeFileSync(
    `${dir}/__root__.b64`,
    Buffer.from(rootState).toString('base64'),
  );
  manifest.push({ docId: ROOT_ID, file: '__root__.b64', bytes: rootState.length });

  const ids = new Set([...docIdsFromRoot(root), ...KNOWN]);
  ids.delete(ROOT_ID);
  console.log(`endpoint: ${BASE}`);
  console.log(`root ${ROOT_ID}: ${rootState.length} bytes`);
  console.log(`discovered ${ids.size} sub-docs:`, [...ids]);

  for (const id of ids) {
    try {
      const d = await pullDoc(id);
      const state = Y.encodeStateAsUpdate(d);
      const safe = id.replace(/[^a-zA-Z0-9_.-]/g, '_');
      writeFileSync(`${dir}/${safe}.b64`, Buffer.from(state).toString('base64'));
      manifest.push({ docId: id, file: `${safe}.b64`, bytes: state.length });
      console.log(`  pulled ${id}: ${state.length} bytes`);
    } catch (e) {
      manifest.push({ docId: id, error: e.message });
      console.error(`  FAIL ${id}: ${e.message}`);
    }
  }

  writeFileSync(
    `${dir}/manifest.json`,
    JSON.stringify(
      { createdAt: new Date().toISOString(), endpoint: BASE, docs: manifest },
      null,
      2,
    ),
  );
  const ok = manifest.filter((m) => !m.error).length;
  console.log(`\nbackup written to ${dir} (${ok}/${manifest.length} docs saved)`);
  process.exit(0);
}

main().catch((e) => {
  console.error('snapshot crashed:', e.message);
  process.exit(1);
});
