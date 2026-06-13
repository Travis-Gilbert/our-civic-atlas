/**
 * EM-010/EM-011 acceptance: a civic:email block persists in the Yjs store,
 * reopens with every field, survives sync into a fresh peer, and honors the
 * field-authority rule (a manual responded override outlives a hydrate that
 * flips the last-message direction).
 *
 * Proves it at the CRDT layer, no browser required:
 *  1. Register the civic:email flavour, create an inbox doc, add an email block
 *     with a full thread, and read every field back.
 *  2. Exercise the pure helpers: effectiveReplyState (derive vs override) and
 *     parseEmailMessages (defensive parse).
 *  3. Ship the doc as a Yjs update into a fresh collection B; the email block
 *     and its serialized thread survive.
 *  4. Field authority: set a manual override, then simulate a backend hydrate
 *     that flips lastMessageDirection; the displayed state stays the override.
 *
 * Run: npm run validate:civic-email-store
 */

import * as Y from 'yjs';
import { Text } from '@blocksuite/affine/store';

import {
  CIVIC_EMAIL_FLAVOUR,
  type CivicEmailBlockModel,
  type CivicEmailMessage,
  type CivicEmailProps,
  effectiveReplyState,
  parseEmailMessages,
} from '../src/lib/civic/civic-email-schema';
import { createCivicCollection } from '../src/lib/civic/civic-workspace';
import type { Workspace } from '@blocksuite/affine/store';

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

const INBOX_DOC_ID = 'civic:inbox:validate';

function makeInboxDoc(collection: Workspace, title: string) {
  // A fresh collection has not run ensureCivicDatabase (which inits meta in
  // the shipping path), so initialize the doc meta before createDoc, the same
  // way validate-civic-store seeds its fresh peer.
  collection.meta.initialize();
  const doc = collection.createDoc(INBOX_DOC_ID);
  const store = doc.getStore({ id: INBOX_DOC_ID });
  if (!doc.loaded) doc.load();
  const rootId = store.addBlock('affine:page', { title: new Text(title) });
  store.addBlock('affine:surface', {}, rootId);
  const noteId = store.addBlock('affine:note', {}, rootId);
  collection.meta.setDocMeta(INBOX_DOC_ID, { title });
  return { store, noteId };
}

const messages: CivicEmailMessage[] = [
  {
    id: 'm1',
    direction: 'inbound',
    from: "Maya's Trio",
    sentAt: '2026-06-12T13:02:00Z',
    bodyText: 'Is the Saturday afternoon block still open?',
  },
  {
    id: 'm2',
    direction: 'outbound',
    from: 'Devon',
    sentAt: '2026-06-12T15:15:00Z',
    bodyText: 'Yes, the 2 to 4 block is open. Send a one-line bio?',
  },
  {
    id: 'm3',
    direction: 'inbound',
    from: "Maya's Trio",
    sentAt: '2026-06-12T18:40:00Z',
    bodyText: 'Great, count us in.',
  },
];

async function main() {
  console.log('1. register the flavour, create an inbox doc, add an email block');
  const a = createCivicCollection({ id: 'validate-email-a' });
  const { store, noteId } = makeInboxDoc(a, 'Inbox');
  check(
    'civic:email schema registered',
    store.schema.flavourSchemaMap.has(CIVIC_EMAIL_FLAVOUR),
  );

  const seed: Partial<CivicEmailProps> = {
    text: new Text('Re: Can my band still apply?'),
    counterpartyName: "Maya's Trio",
    counterpartyEmail: 'maya@example.com',
    snippet: 'Great, count us in.',
    lastMessageAt: '2026-06-12T18:40:00Z',
    lastMessageDirection: 'inbound',
    messageCount: 3,
    messagesJson: JSON.stringify(messages),
    deliveryState: 'DELIVERED',
    replyStateOverride: '',
    unread: true,
    linkedCivicObjectId: '',
    location: '',
    address: '',
    notes: '',
    threadId: 'thread-1',
    sourceId: 'public:email:maya@example.com',
  };
  store.addBlock(CIVIC_EMAIL_FLAVOUR, seed, noteId);

  const model = store.getModelsByFlavour(
    CIVIC_EMAIL_FLAVOUR,
  )[0] as CivicEmailBlockModel | undefined;
  check('email block created', Boolean(model));
  check(
    'subject round-trips',
    model?.props.text.toString() === 'Re: Can my band still apply?',
    model?.props.text.toString(),
  );
  check(
    'counterparty round-trips',
    model?.props.counterpartyName === "Maya's Trio",
  );
  check('messageCount round-trips', model?.props.messageCount === 3);
  check('threadId round-trips', model?.props.threadId === 'thread-1');
  check('unread defaults true on this seed', model?.props.unread === true);

  console.log('2. pure helpers: derived vs override, defensive parse');
  check(
    'inbound + no override derives needs_reply',
    effectiveReplyState({
      replyStateOverride: '',
      lastMessageDirection: 'inbound',
    }) === 'needs_reply',
  );
  check(
    'outbound + no override derives replied',
    effectiveReplyState({
      replyStateOverride: '',
      lastMessageDirection: 'outbound',
    }) === 'replied',
  );
  check(
    'override wins over derivation',
    effectiveReplyState({
      replyStateOverride: 'deferred',
      lastMessageDirection: 'inbound',
    }) === 'deferred',
  );
  const parsed = parseEmailMessages(model?.props.messagesJson ?? '');
  check('thread parses three messages', parsed.length === 3, parsed.length);
  check(
    'message direction + body preserved',
    parsed[1]?.direction === 'outbound' &&
      parsed[1]?.bodyText.startsWith('Yes, the 2 to 4'),
  );
  check('malformed messagesJson yields empty', parseEmailMessages('{not json').length === 0);
  check('non-array messagesJson yields empty', parseEmailMessages('"a"').length === 0);

  console.log("3. persist: ship A's doc as a Yjs update into fresh B");
  const update = Y.encodeStateAsUpdate(store.spaceDoc);
  const b = createCivicCollection({ id: 'validate-email-b' });
  b.meta.initialize();
  const docB = b.createDoc(INBOX_DOC_ID);
  const storeB = docB.getStore({ id: INBOX_DOC_ID });
  Y.applyUpdate(storeB.spaceDoc, update);
  const modelB = storeB.getModelsByFlavour(
    CIVIC_EMAIL_FLAVOUR,
  )[0] as CivicEmailBlockModel | undefined;
  check('email block survives sync into B', Boolean(modelB));
  check(
    'B subject intact',
    modelB?.props.text.toString() === 'Re: Can my band still apply?',
  );
  check(
    'B thread intact after sync',
    parseEmailMessages(modelB?.props.messagesJson ?? '').length === 3,
  );

  console.log('4. field authority: manual override outlives a hydrate');
  if (model) {
    store.updateBlock(model, {
      replyStateOverride: 'no_reply_needed',
    } satisfies Partial<CivicEmailProps>);
    // Simulate a backend hydrate that would otherwise derive 'replied'.
    store.updateBlock(model, {
      lastMessageDirection: 'outbound',
      messageCount: 4,
    } satisfies Partial<CivicEmailProps>);
    check(
      'manual override survives the hydrate',
      effectiveReplyState({
        replyStateOverride: model.props.replyStateOverride,
        lastMessageDirection: model.props.lastMessageDirection,
      }) === 'no_reply_needed',
      model.props.replyStateOverride,
    );
    check(
      'backend-authoritative field still updated by hydrate',
      model.props.messageCount === 4,
      model.props.messageCount,
    );
  }

  if (failures > 0) {
    console.error(`\nvalidate-civic-email-store: ${failures} failure(s)`);
    process.exit(1);
  }
  console.log('\nvalidate-civic-email-store: all checks passed');
  process.exit(0);
}

main().catch((error) => {
  console.error('validate-civic-email-store crashed:', error);
  process.exit(1);
});
