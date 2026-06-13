import { CaptionedBlockComponent } from '@blocksuite/affine-components/caption';
import {
  type ViewExtensionContext,
  ViewExtensionProvider,
} from '@blocksuite/affine/ext-loader';
import { BlockViewExtension, FlavourExtension } from '@blocksuite/std';
import { css, html, nothing, type TemplateResult } from 'lit';
import { state } from 'lit/decorators.js';
import { literal } from 'lit/static-html.js';

import {
  CIVIC_EMAIL_FLAVOUR,
  type CivicEmailBlockModel,
  type CivicEmailDirection,
  type CivicEmailProps,
  type CivicEmailReplyState,
  effectiveReplyState,
  parseEmailMessages,
} from '../lib/civic/civic-email-schema';

const REPLY_STATES: readonly CivicEmailReplyState[] = [
  'needs_reply',
  'replied',
  'deferred',
  'no_reply_needed',
];

const REPLY_STATE_LABEL: Record<CivicEmailReplyState, string> = {
  needs_reply: 'Needs reply',
  replied: 'Replied',
  deferred: 'Deferred',
  no_reply_needed: 'No reply needed',
};

/**
 * Short "when" label for the most recent message. Today shows a clock time;
 * this week a weekday; older a month/day. Mirrors the civic:task friendly-date
 * idiom so email and tasks read alike. Browser-only (lit), so new Date() is OK.
 * Date-only ISO is parsed local to avoid the UTC-midnight day-early bug the
 * task formatter documents.
 */
function formatEmailWhen(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.exec(trimmed);
  const date = dateOnly
    ? new Date(
        Number(dateOnly[0].slice(0, 4)),
        Number(dateOnly[0].slice(5, 7)) - 1,
        Number(dateOnly[0].slice(8, 10)),
      )
    : new Date(trimmed);
  if (Number.isNaN(date.getTime())) return trimmed;
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const startOfDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();
  const diffDays = Math.round((startOfDate - startOfToday) / 86_400_000);
  if (diffDays === 0) {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  }
  if (diffDays === -1) return 'Yesterday';
  if (diffDays < 0 && diffDays > -7) {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Attribution string for one thread message (the mono micro-label line). */
function attribution(
  from: string,
  direction: CivicEmailDirection,
  sentAt: string,
): string {
  const who = direction === 'outbound' ? `${from} (organizer)` : from;
  const verb = direction === 'outbound' ? 'you replied' : 'they wrote';
  const when = formatEmailWhen(sentAt);
  return when ? `${who} · ${verb} · ${when}` : `${who} · ${verb}`;
}

/**
 * civic:email block view. Collapsed it is a sibling of the civic:task row (the
 * same 24px | 1fr | auto rhythm); the leading cell carries the unread dot, the
 * trailing the responded chip + time. It expands inline to a read-only thread
 * transcript. The reply composer is a later slice (EM-030); this view reads and
 * lets an organizer set the responded-state manually (EM-032).
 */
export class CivicEmailBlockComponent extends CaptionedBlockComponent<CivicEmailBlockModel> {
  static override styles = css`
    .civic-email {
      border: 1px solid transparent;
      border-radius: 7px;
      color: var(--affine-text-primary-color, #1c1c1c);
      transition:
        border-color 120ms ease,
        background 120ms ease,
        box-shadow 120ms ease;
    }
    .civic-email:hover,
    .civic-email:focus-within {
      border-color: var(--affine-border-color, #e2e2e2);
      background: var(--civic-task-hover, #fafafa);
    }
    .civic-email[data-expanded='true'] {
      border-color: var(--affine-border-color, #e2e2e2);
      border-radius: 8px;
      background: var(--affine-background-primary-color, #ffffff);
      box-shadow: var(--affine-shadow-1, 0 2px 8px -4px rgba(0, 0, 0, 0.12));
    }

    .civic-email-row {
      display: grid;
      grid-template-columns: 24px minmax(0, 1fr) auto;
      gap: 9px;
      align-items: start;
      padding: 7px 8px;
    }

    /*
     * Unread mark (leading cell). Navy disc when unread, hollow ring when read,
     * so the column is never empty and reads as a column (the rhyme of the task
     * checkbox cell). Unread is reinforced by the counterparty weight below, so
     * the dot is never the only unread signal.
     */
    .civic-email-unread {
      width: 8px;
      height: 8px;
      margin: 6px auto 0;
      border-radius: 9999px;
      box-sizing: border-box;
      background: transparent;
      border: 1.5px solid var(--civic-unread-read-ring, #d7dde2);
    }
    .civic-email-unread[data-unread='true'] {
      background: var(--civic-unread-disc, #005186);
      border-color: var(--civic-unread-disc, #005186);
    }

    /* Disclosure button: the click/keyboard target for expand. Reset to text. */
    .civic-email-disclose {
      display: block;
      width: 100%;
      min-width: 0;
      margin: 0;
      padding: 0;
      border: 0;
      background: transparent;
      color: inherit;
      font: inherit;
      text-align: left;
      cursor: pointer;
    }
    .civic-email-disclose:focus-visible {
      outline: 2px solid var(--civic-task-ring, #005186);
      outline-offset: 2px;
      border-radius: 4px;
    }

    .civic-email-line1 {
      display: flex;
      align-items: baseline;
      gap: 6px;
      min-width: 0;
    }
    .civic-email-who {
      flex: none;
      max-width: 45%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 14px;
      line-height: 20px;
      font-weight: 500;
    }
    .civic-email-who[data-unread='true'] {
      font-weight: 600;
    }
    .civic-email-subject {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 14px;
      line-height: 20px;
      color: var(--affine-text-secondary-color, #454545);
    }

    .civic-email-meta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 4px 10px;
      margin-top: 4px;
      color: var(--civic-meta-fg, #656565);
      font-size: 12px;
      line-height: 16px;
    }
    .civic-email-link {
      color: var(--civic-priority-normal, #005186);
      font-weight: 600;
      max-width: 180px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .civic-email-trailing {
      display: inline-flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 3px;
    }
    .civic-email-time {
      color: var(--civic-meta-fg, #656565);
      font-size: 11px;
      line-height: 1;
    }

    /*
     * Responded chip: the native select re-skinned as a state-tinted pill
     * (same technique as civic:task status). A visible label hugs the current
     * state; the real select is overlaid transparently for keyboard + SR.
     */
    .civic-email-state {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      height: 22px;
      padding: 0 10px;
      border-radius: 9999px;
      background: var(--civic-responded-neutral-bg, #f1f1f1);
      color: var(--civic-responded-neutral-fg, #656565);
      font-size: 11px;
      font-weight: 600;
      line-height: 1;
      white-space: nowrap;
    }
    .civic-email-state[data-state='needs_reply'] {
      background: var(--civic-responded-needs-bg, #f6e3df);
      color: var(--civic-responded-needs-fg, #a8463a);
    }
    .civic-email-state[data-state='replied'] {
      background: var(--civic-responded-replied-bg, #e4f0e6);
      color: var(--civic-responded-replied-fg, #2f6a3f);
    }
    .civic-email-state[data-state='no_reply_needed'] {
      opacity: 0.75;
    }
    .civic-email-state:focus-within {
      outline: 2px solid var(--civic-task-ring, #005186);
      outline-offset: 2px;
    }
    .civic-email-state-label {
      pointer-events: none;
    }
    .civic-email-state-native {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
      border: 0;
      background: transparent;
      color: transparent;
      font: inherit;
      opacity: 0;
      cursor: pointer;
      appearance: none;
      -webkit-appearance: none;
    }
    .civic-email-state-native:disabled {
      cursor: default;
    }
    .civic-email-state:has(.civic-email-state-native:disabled) {
      opacity: 0.7;
    }

    /* Expanded thread: an editorial transcript, oldest to newest. */
    .civic-email-thread {
      padding: 2px 14px 12px;
    }
    .civic-email-msg {
      margin-top: 16px;
    }
    .civic-email-msg:first-child {
      margin-top: 6px;
    }
    /* A hairline only where the conversation turns direction. */
    .civic-email-msg[data-turn='true'] {
      border-top: 1px solid var(--civic-email-turn-rule, #ececec);
      padding-top: 16px;
    }
    .civic-email-attr {
      color: var(--civic-meta-fg, #656565);
      font-size: 10.5px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
    .civic-email-latest {
      color: var(--civic-priority-normal, #005186);
      font-weight: 700;
    }
    .civic-email-body {
      margin-top: 4px;
      font-size: 14px;
      line-height: 21px;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      color: var(--affine-text-primary-color, #1c1c1c);
    }
    /* Outbound (organizer) sits on a faint fill; inbound is plain on white. */
    .civic-email-msg[data-direction='outbound'] .civic-email-body {
      background: var(--civic-email-outbound-fill, #f7f8f9);
      border-radius: 8px;
      padding: 8px 10px;
    }
    .civic-email-pending {
      margin-top: 8px;
      color: var(--civic-meta-fg, #656565);
      font-size: 12px;
    }

    @media (prefers-reduced-motion: reduce) {
      .civic-email {
        transition: none;
      }
    }
  `;

  @state()
  private accessor _expanded = false;

  private readonly _stopControlEvent = (event: Event) => {
    event.stopPropagation();
  };

  private readonly _toggleExpand = () => {
    this._expanded = !this._expanded;
    // Opening a thread is the team-level read signal (read-state is not
    // per-user; there are no accounts). A plain CRDT write, synced like any edit.
    if (this._expanded && this.model.props.unread$.value && !this.store.readonly) {
      this.store.captureSync();
      this.store.updateBlock(this.model, {
        unread: false,
      } satisfies Partial<CivicEmailProps>);
    }
  };

  private readonly _changeReplyState = (event: Event) => {
    event.stopPropagation();
    if (this.store.readonly) return;
    const value = (event.target as HTMLSelectElement)
      .value as CivicEmailReplyState;
    this.store.captureSync();
    // The chip writes the manual OVERRIDE (Yjs-authoritative), not a derived
    // value, so a later hydrate that flips lastMessageDirection cannot silently
    // undo the organizer's call.
    this.store.updateBlock(this.model, {
      replyStateOverride: value,
    } satisfies Partial<CivicEmailProps>);
  };

  override renderBlock(): TemplateResult<1> {
    const subject = this.model.props.text$.value.toString();
    const counterpartyName = this.model.props.counterpartyName$.value;
    const counterpartyEmail = this.model.props.counterpartyEmail$.value;
    const snippet = this.model.props.snippet$.value;
    const lastMessageAt = this.model.props.lastMessageAt$.value;
    const lastMessageDirection = this.model.props.lastMessageDirection$.value;
    const messageCount = this.model.props.messageCount$.value;
    const replyStateOverride = this.model.props.replyStateOverride$.value;
    const unread = this.model.props.unread$.value;
    const linkedCivicObjectId = this.model.props.linkedCivicObjectId$.value;
    const messages = parseEmailMessages(this.model.props.messagesJson$.value);

    const state = effectiveReplyState({
      replyStateOverride,
      lastMessageDirection,
    });
    const who = counterpartyName || counterpartyEmail || 'Unknown sender';
    const directionPhrase =
      lastMessageDirection === 'outbound' ? 'we replied' : 'they wrote';
    const when = formatEmailWhen(lastMessageAt);

    const metaParts: TemplateResult[] = [];
    if (messageCount > 0) {
      metaParts.push(
        html`<span
          >${messageCount} message${messageCount === 1 ? '' : 's'}</span
        >`,
      );
    }
    if (when) {
      metaParts.push(html`<span>${directionPhrase} ${when}</span>`);
    }
    if (linkedCivicObjectId) {
      metaParts.push(html`<span class="civic-email-link">linked</span>`);
    }

    let lastDirection: CivicEmailDirection | '' = '';

    return html`
      <div class="civic-email" data-state=${state} data-expanded=${this._expanded ? 'true' : 'false'}>
        <div class="civic-email-row">
          <span
            class="civic-email-unread"
            data-unread=${unread ? 'true' : 'false'}
            aria-hidden="true"
          ></span>
          <button
            class="civic-email-disclose"
            aria-expanded=${this._expanded ? 'true' : 'false'}
            aria-label=${`${REPLY_STATE_LABEL[state]}. ${unread ? 'Unread. ' : ''}${who}, ${subject || 'no subject'}.`}
            @click=${this._toggleExpand}
          >
            <span class="civic-email-line1">
              <span class="civic-email-who" data-unread=${unread ? 'true' : 'false'}
                >${who}</span
              >
              <span class="civic-email-subject"
                >${subject || (snippet ? snippet : 'No subject')}</span
              >
            </span>
            ${metaParts.length > 0
              ? html`<span class="civic-email-meta"
                  >${metaParts.map((part) => part)}</span
                >`
              : nothing}
          </button>
          <span class="civic-email-trailing">
            <span class="civic-email-state" data-state=${state}>
              <span class="civic-email-state-label">${REPLY_STATE_LABEL[state]}</span>
              <select
                class="civic-email-state-native"
                aria-label="Responded state"
                .value=${state}
                ?disabled=${this.store.readonly}
                @change=${this._changeReplyState}
                @click=${this._stopControlEvent}
                @pointerdown=${this._stopControlEvent}
              >
                ${REPLY_STATES.map(
                  (option) =>
                    html`<option value=${option}>
                      ${REPLY_STATE_LABEL[option]}
                    </option>`,
                )}
              </select>
            </span>
            ${when ? html`<span class="civic-email-time">${when}</span>` : nothing}
          </span>
        </div>
        ${this._expanded
          ? html`<div class="civic-email-thread">
              ${messages.length === 0
                ? html`<div class="civic-email-pending">
                    No messages loaded yet.
                  </div>`
                : messages.map((message, index) => {
                    const turn =
                      lastDirection !== '' &&
                      lastDirection !== message.direction;
                    lastDirection = message.direction;
                    const isLatest = index === messages.length - 1;
                    return html`<div
                      class="civic-email-msg"
                      data-direction=${message.direction}
                      data-turn=${turn ? 'true' : 'false'}
                    >
                      <div class="civic-email-attr">
                        ${attribution(
                          message.from,
                          message.direction,
                          message.sentAt,
                        )}${isLatest
                          ? html` · <span class="civic-email-latest">latest</span>`
                          : nothing}
                      </div>
                      <div class="civic-email-body">${message.bodyText}</div>
                    </div>`;
                  })}
            </div>`
          : nothing}
      </div>
    `;
  }

  override accessor blockContainerStyles = {
    margin: 'var(--affine-list-margin, 6px 0)',
  };
}

export function civicEmailEffects() {
  if (!customElements.get('civic-email')) {
    customElements.define('civic-email', CivicEmailBlockComponent);
  }
}

export class CivicEmailViewExtension extends ViewExtensionProvider {
  override name = 'civic-email-block';

  override effect() {
    super.effect();
    civicEmailEffects();
  }

  override setup(context: ViewExtensionContext) {
    super.setup(context);
    context.register([
      FlavourExtension(CIVIC_EMAIL_FLAVOUR),
      BlockViewExtension(CIVIC_EMAIL_FLAVOUR, literal`civic-email`),
    ]);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'civic-email': CivicEmailBlockComponent;
  }
}
