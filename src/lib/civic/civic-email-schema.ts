import {
  type StoreExtensionContext,
  StoreExtensionProvider,
} from '@blocksuite/affine/ext-loader';
import {
  BlockModel,
  BlockSchemaExtension,
  defineBlockSchema,
  type Text,
} from '@blocksuite/affine/store';

/**
 * The civic:email block: a first-class email thread in the shared Inbox,
 * sibling of civic:task. Design: docs/design/civic-email-object-proposal.md.
 *
 * Authority is field-scoped (the reconciliation contract). The backend owns
 * the message bodies, delivery state, and detected replies; a hydrate writes
 * those props wholesale. The organizer's planning facets (manual responded
 * override, placement, link, private note, team read-state) are Yjs-authoritative
 * and survive a hydrate. The displayed responded-state is DERIVED, never stored
 * as truth: manual override if set, else the last message's direction.
 */
export const CIVIC_EMAIL_FLAVOUR = 'civic:email';

/**
 * Organizer-facing triage state. needs_reply / replied are derivable from the
 * last message direction; deferred / no_reply_needed are manual only. These are
 * the UI vocabulary; the GraphQL boundary maps them onto EventEmailReplyState
 * (NOT_REPLIED | REPLIED | DEFERRED | MANUAL) in the resolver, never here.
 */
export type CivicEmailReplyState =
  | 'needs_reply'
  | 'replied'
  | 'deferred'
  | 'no_reply_needed';

export type CivicEmailDirection = 'inbound' | 'outbound';

/**
 * One message in a thread. The thread is stored serialized in `messagesJson`
 * (backend-authoritative on hydrate); the view parses it for the expanded
 * read. A serialized array (not child blocks) keeps message bodies out of the
 * block-tree caret model and lets a hydrate replace the whole thread without
 * reconciling child blocks one by one.
 */
export interface CivicEmailMessage {
  id: string;
  direction: CivicEmailDirection;
  /** Display name or address of the sender. */
  from: string;
  /** ISO timestamp. */
  sentAt: string;
  bodyText: string;
}

export interface CivicEmailProps {
  /** The subject, kept as the block's primary text (sibling of civic:task). */
  text: Text;
  counterpartyName: string;
  counterpartyEmail: string;
  /** Collapsed-card summary (backend-authoritative on hydrate). */
  snippet: string;
  /** ISO timestamp of the most recent message. */
  lastMessageAt: string;
  lastMessageDirection: '' | CivicEmailDirection;
  messageCount: number;
  /** Serialized CivicEmailMessage[] (backend-authoritative on hydrate). */
  messagesJson: string;
  /** Last outbound delivery state from Resend, display only. */
  deliveryState: string;
  /**
   * Manual responded-state override (Yjs-authoritative, survives hydrate).
   * Empty means "derive from lastMessageDirection".
   */
  replyStateOverride: '' | CivicEmailReplyState;
  /** Team read-state (not per-user): cleared when any organizer opens it. */
  unread: boolean;
  /** Linkage + placement facet (the shared civic spine; EM-040 reads location). */
  linkedCivicObjectId: string;
  /** JSON {"lng":..,"lat":..} or '' (unplaced, never hidden). */
  location: string;
  address: string;
  /** Organizer private note (Yjs-authoritative). */
  notes: string;
  /** Backend thread id: the hydrate dedup key. */
  threadId: string;
  sourceId: string;
  'meta:createdAt'?: string;
  'meta:createdBy'?: string;
  'meta:updatedAt'?: string;
  'meta:updatedBy'?: string;
}

export class CivicEmailBlockModel extends BlockModel<CivicEmailProps> {
  override isEmpty(): boolean {
    // An email block is hydrated, never an empty editable placeholder; it is
    // never auto-removed the way an empty paragraph is.
    return false;
  }
}

export const CivicEmailBlockSchema = defineBlockSchema({
  flavour: CIVIC_EMAIL_FLAVOUR,
  props: (internal): CivicEmailProps => ({
    text: internal.Text(),
    counterpartyName: '',
    counterpartyEmail: '',
    snippet: '',
    lastMessageAt: '',
    lastMessageDirection: '',
    messageCount: 0,
    messagesJson: '',
    deliveryState: '',
    replyStateOverride: '',
    unread: false,
    linkedCivicObjectId: '',
    location: '',
    address: '',
    notes: '',
    threadId: '',
    sourceId: '',
    'meta:createdAt': undefined,
    'meta:createdBy': undefined,
    'meta:updatedAt': undefined,
    'meta:updatedBy': undefined,
  }),
  metadata: {
    version: 1,
    role: 'content',
    parent: ['affine:note'],
    children: [],
  },
  toModel: () => new CivicEmailBlockModel(),
});

export const CivicEmailBlockSchemaExtension =
  BlockSchemaExtension(CivicEmailBlockSchema);

export class CivicEmailStoreExtension extends StoreExtensionProvider {
  override name = 'civic-email-block';

  override setup(context: StoreExtensionContext) {
    super.setup(context);
    context.register(CivicEmailBlockSchemaExtension);
  }
}

/**
 * Effective responded-state. The one reconciliation rule: a manual override
 * wins; otherwise derive from the last message direction (an organizer reply
 * makes the thread `replied`, an unanswered inbound makes it `needs_reply`).
 * Pure, so the view and the validator agree.
 */
export function effectiveReplyState(
  props: Pick<CivicEmailProps, 'replyStateOverride' | 'lastMessageDirection'>,
): CivicEmailReplyState {
  if (props.replyStateOverride) return props.replyStateOverride;
  return props.lastMessageDirection === 'outbound' ? 'replied' : 'needs_reply';
}

/**
 * Parse messagesJson defensively. The backend writes it on hydrate, so the
 * view must never trust the shape: a malformed payload yields an empty thread,
 * not a thrown render.
 */
export function parseEmailMessages(messagesJson: string): CivicEmailMessage[] {
  if (!messagesJson) return [];
  try {
    const parsed: unknown = JSON.parse(messagesJson);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (m): m is CivicEmailMessage =>
        Boolean(m) &&
        typeof m === 'object' &&
        typeof (m as CivicEmailMessage).bodyText === 'string' &&
        ((m as CivicEmailMessage).direction === 'inbound' ||
          (m as CivicEmailMessage).direction === 'outbound'),
    );
  } catch {
    return [];
  }
}
