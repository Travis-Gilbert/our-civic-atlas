#!/usr/bin/env node
/**
 * SPIKE: server-side projection of the civic planning store.
 *
 * The auto-organizer plan (geo-plugin theorem, approved 2026-06-11) rests on
 * one technical unknown: can a server-side process decode the live
 * `civic:porchfest-2026` yjs doc (BlockSuite database block) into plain
 * civic-object rows WITHOUT BlockSuite, using only the CRDT layer? If yes,
 * the yrs (Rust) port inside RustyRed is mechanical and the projection job
 * is proven; if no, the engine falls back to batch projection from CSV
 * exports.
 *
 * This decoder speaks raw yjs structures:
 *   - spaceDoc map `civic:column-ids`: fieldKey -> columnId (the contract
 *     key map civic-workspace.ts maintains)
 *   - map `blocks`: blockId -> Y.Map with sys:flavour / sys:children /
 *     prop:columns / prop:cells / prop:text
 *   - select and multi-select cells hold option IDs resolved through the
 *     column's data.options list
 *
 * Run: node scripts/spike-civic-doc-projection.mjs
 *      [RUSTYRED_SYNC_URL=wss://.../sync/yjs] (defaults to production)
 */

import * as Y from 'yjs';

const BASE =
  process.env.RUSTYRED_SYNC_URL ??
  'wss://rustyred-production-fc07.up.railway.app/v1/tenants/flint/sync/yjs';
const DOC_ID = 'civic:porchfest-2026';

function pullDoc(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    ws.binaryType = 'arraybuffer';
    const doc = new Y.Doc();
    const timer = setTimeout(() => reject(new Error('pull timeout')), 20000);
    ws.onopen = () => {
      const sv = Y.encodeStateVector(doc);
      const frame = new Uint8Array(1 + sv.length);
      frame[0] = 0x00;
      frame.set(sv, 1);
      ws.send(frame);
    };
    ws.onmessage = (event) => {
      const data = new Uint8Array(event.data);
      if (data[0] !== 0x01) return;
      if (data.length > 1) Y.applyUpdate(doc, data.subarray(1));
      clearTimeout(timer);
      ws.close();
      resolve(doc);
    };
    ws.onerror = () => reject(new Error('websocket error'));
  });
}

function decodeCivicRows(doc) {
  const columnIdMap = doc.getMap('civic:column-ids').toJSON();
  const fieldKeyByColumnId = Object.fromEntries(
    Object.entries(columnIdMap).map(([fieldKey, columnId]) => [columnId, fieldKey]),
  );

  const blocks = doc.getMap('blocks');
  let database = null;
  for (const [, block] of blocks) {
    if (block.get('sys:flavour') === 'affine:database') {
      database = block;
      break;
    }
  }
  if (!database) throw new Error('no affine:database block in the doc');

  const columns = database.get('prop:columns').toJSON();
  const optionValueByColumnId = {};
  for (const column of columns) {
    const options = column?.data?.options;
    if (Array.isArray(options)) {
      optionValueByColumnId[column.id] = Object.fromEntries(
        options.map((option) => [option.id, option.value]),
      );
    }
  }

  const cells = database.get('prop:cells').toJSON();
  const rowIds = database.get('sys:children').toArray();

  const rows = [];
  for (const rowId of rowIds) {
    const rowBlock = blocks.get(rowId);
    const title = rowBlock?.get('prop:text')?.toString() ?? '';
    const rowCells = cells[rowId] ?? {};
    const fields = {};
    for (const [columnId, cell] of Object.entries(rowCells)) {
      const fieldKey = fieldKeyByColumnId[columnId];
      if (!fieldKey) continue;
      let value = cell?.value;
      if (value === null || value === undefined) continue;
      const optionMap = optionValueByColumnId[columnId];
      if (optionMap) {
        value = Array.isArray(value)
          ? value.map((id) => optionMap[id]).filter(Boolean)
          : optionMap[value] ?? value;
      }
      fields[fieldKey] = value;
    }
    rows.push({ rowId, title, fields });
  }
  return rows;
}

const doc = await pullDoc(`${BASE}/${encodeURIComponent(DOC_ID)}`);
const rows = decodeCivicRows(doc);

const categories = {};
let placed = 0;
let withEmail = 0;
for (const row of rows) {
  const category = row.fields.category ?? 'undecoded';
  categories[category] = (categories[category] ?? 0) + 1;
  if (row.fields.location) placed += 1;
  if (row.fields.email) withEmail += 1;
}

console.log(
  JSON.stringify(
    {
      rows: rows.length,
      categories,
      placed,
      withEmail,
      samples: rows.slice(0, 3).map((row) => ({
        title: row.title,
        category: row.fields.category,
        email: row.fields.email,
        bandSize: row.fields.bandSize ?? null,
        status: row.fields.status ?? null,
        location: row.fields.location ?? null,
        figureKey: row.fields.figureKey ?? null,
      })),
    },
    null,
    2,
  ),
);

const undecoded = categories.undecoded ?? 0;
if (rows.length === 0 || undecoded > 0) {
  console.error(`SPIKE FAILED: ${rows.length} rows, ${undecoded} undecoded`);
  process.exit(1);
}
console.log('SPIKE PASSED: yjs-level decoding works; the yrs port is mechanical.');
