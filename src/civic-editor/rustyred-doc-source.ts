/**
 * RustyRedDocSource: the client half of Phase 1 (RustyRed speaks Yjs).
 *
 * Implements BlockSuite's DocSource over the rustyred-server WebSocket
 * endpoint /v1/tenants/:tenant_id/sync/yjs/:doc_id (yrs on the server, per
 * the y-crdt correction). Wire protocol, binary frames tagged by first
 * byte, recorded in SCHEMA-CONTRACT.md:
 *
 *   C->S 0x00 <state-vector>  pull handshake
 *   S->C 0x01 <update>        pull reply (diff since that vector)
 *   C->S 0x02 <update>        push (server applies + broadcasts)
 *   S->C 0x02 <update>        peer update delivery
 *
 * One lazy WebSocket per doc. On close, subscribers get the disconnect
 * callback (the sync engine re-pulls on reconnect) and the next pull/push
 * reopens the socket with capped exponential backoff.
 *
 * Push batching: the sync engine calls push() once per Yjs update, which
 * amplifies every keystroke into a WebSocket frame plus a server-side
 * persistence write. To cut that write amplification, pushes accumulate
 * per doc and flush as ONE Y.mergeUpdates frame after 300ms of quiet or
 * past 64KB pending, whichever comes first. Yjs updates merge
 * associatively, so the server sees an ordinary 0x02 update frame that is
 * semantically identical to the original sequence. Invariant: pull()
 * flushes the pending batch before sending its 0x00 handshake, so a pull
 * reply can never be computed against a server state that is missing our
 * own queued local updates. On socket loss the pending batch stays queued
 * and re-sends after reconnect rather than being dropped.
 */

import type { DocSource } from '@blocksuite/affine/sync';
import * as Y from 'yjs';

const TAG_PULL = 0x00;
const TAG_PULL_REPLY = 0x01;
const TAG_UPDATE = 0x02;

const PULL_TIMEOUT_MS = 8000;
const RECONNECT_BASE_MS = 500;
const RECONNECT_MAX_MS = 8000;

/** Quiet window before a pending batch flushes; resets on each push. */
const FLUSH_QUIET_MS = 300;
/** Pending-byte ceiling that forces an immediate flush mid-burst. */
const FLUSH_MAX_PENDING_BYTES = 64 * 1024;

interface PendingPull {
  resolve: (data: Uint8Array | null) => void;
  timer: ReturnType<typeof setTimeout>;
}

interface DocChannel {
  socket: WebSocket | null;
  opening: Promise<WebSocket> | null;
  /** FIFO of outstanding pull handshakes awaiting 0x01 replies. */
  pendingPulls: PendingPull[];
  attempts: number;
  /** Unsent local updates awaiting the next batch flush, oldest first. */
  pendingUpdates: Uint8Array[];
  /** Running byte total of pendingUpdates, checked against the ceiling. */
  pendingBytes: number;
  /** Quiet-window timer; null whenever no flush is scheduled. */
  flushTimer: ReturnType<typeof setTimeout> | null;
}

function tagged(tag: number, payload: Uint8Array): Uint8Array {
  const frame = new Uint8Array(payload.length + 1);
  frame[0] = tag;
  frame.set(payload, 1);
  return frame;
}

export class RustyRedDocSource implements DocSource {
  name = 'rustyred';

  private channels = new Map<string, DocChannel>();
  private updateListeners = new Set<(docId: string, data: Uint8Array) => void>();
  private disconnectListeners = new Set<(reason: string) => void>();

  /**
   * @param baseUrl ws(s) endpoint up to /sync/yjs, e.g.
   *   wss://host/v1/tenants/flint/sync/yjs
   */
  constructor(private readonly baseUrl: string) {}

  private channel(docId: string): DocChannel {
    let channel = this.channels.get(docId);
    if (!channel) {
      channel = {
        socket: null,
        opening: null,
        pendingPulls: [],
        attempts: 0,
        pendingUpdates: [],
        pendingBytes: 0,
        flushTimer: null,
      };
      this.channels.set(docId, channel);
    }
    return channel;
  }

  private async socketFor(docId: string): Promise<WebSocket> {
    const channel = this.channel(docId);
    if (channel.socket && channel.socket.readyState === WebSocket.OPEN) {
      return channel.socket;
    }
    if (channel.opening) return channel.opening;

    const url = `${this.baseUrl.replace(/\/$/, '')}/${encodeURIComponent(docId)}`;
    channel.opening = new Promise<WebSocket>((resolve, reject) => {
      const backoff = Math.min(
        RECONNECT_BASE_MS * 2 ** channel.attempts,
        RECONNECT_MAX_MS,
      );
      const delay = channel.attempts === 0 ? 0 : backoff;
      setTimeout(() => {
        const socket = new WebSocket(url);
        socket.binaryType = 'arraybuffer';
        socket.onopen = () => {
          channel.attempts = 0;
          channel.socket = socket;
          channel.opening = null;
          resolve(socket);
        };
        socket.onmessage = (event: MessageEvent) => {
          const frame = new Uint8Array(event.data as ArrayBuffer);
          if (frame.length === 0) return;
          const payload = frame.subarray(1);
          if (frame[0] === TAG_PULL_REPLY) {
            const pending = channel.pendingPulls.shift();
            if (pending) {
              clearTimeout(pending.timer);
              pending.resolve(payload.slice());
            }
          } else if (frame[0] === TAG_UPDATE) {
            for (const listener of this.updateListeners) {
              listener(docId, payload.slice());
            }
          }
        };
        socket.onerror = () => {
          // close fires next; reconnection happens lazily on next use.
        };
        socket.onclose = () => {
          if (channel.socket === socket) channel.socket = null;
          channel.opening = null;
          channel.attempts += 1;
          for (const pending of channel.pendingPulls.splice(0)) {
            clearTimeout(pending.timer);
            pending.resolve(null);
          }
          for (const listener of this.disconnectListeners) {
            listener('rustyred-socket-closed');
          }
          reject(new Error('rustyred sync socket closed before open'));
        };
      }, delay);
    });
    return channel.opening;
  }

  /**
   * Sends the pending batch as one merged 0x02 frame. Failure keeps the
   * batch queued (offline pushes must survive until reconnect, not drop);
   * IndexedDB remains the local source of truth either way.
   */
  private async flushPendingUpdates(docId: string): Promise<void> {
    const channel = this.channel(docId);
    if (channel.flushTimer !== null) {
      clearTimeout(channel.flushTimer);
      channel.flushTimer = null;
    }
    if (channel.pendingUpdates.length === 0) return;

    let socket: WebSocket;
    try {
      socket = await this.socketFor(docId);
    } catch {
      return;
    }
    // A push during the connect await may have re-armed the quiet timer
    // for updates this flush is about to drain; disarm it again.
    if (channel.flushTimer !== null) {
      clearTimeout(channel.flushTimer);
      channel.flushTimer = null;
    }
    const batch = channel.pendingUpdates.splice(0);
    channel.pendingBytes = 0;
    if (batch.length === 0) return;
    const merged = batch.length === 1 ? batch[0] : Y.mergeUpdates(batch);
    if (socket.readyState !== WebSocket.OPEN) {
      // Closed between connect and send: browsers discard frames sent on
      // a closing socket silently, so re-queue instead of sending.
      channel.pendingUpdates.unshift(merged);
      channel.pendingBytes += merged.byteLength;
      return;
    }
    socket.send(tagged(TAG_UPDATE, merged));
  }

  async pull(
    docId: string,
    state: Uint8Array,
  ): Promise<{ data: Uint8Array; state?: Uint8Array } | null> {
    // Flush-before-pull invariant: the merged 0x02 frame must reach the
    // server ahead of the 0x00 handshake, otherwise the diff it computes
    // against our state vector omits our own queued local updates.
    await this.flushPendingUpdates(docId);
    try {
      const socket = await this.socketFor(docId);
      const channel = this.channel(docId);
      const reply = await new Promise<Uint8Array | null>((resolve) => {
        const timer = setTimeout(() => {
          const index = channel.pendingPulls.findIndex(
            (p) => p.resolve === resolve,
          );
          if (index >= 0) channel.pendingPulls.splice(index, 1);
          resolve(null);
        }, PULL_TIMEOUT_MS);
        channel.pendingPulls.push({ resolve, timer });
        socket.send(tagged(TAG_PULL, state));
      });
      return reply ? { data: reply } : null;
    } catch {
      return null;
    }
  }

  async push(docId: string, data: Uint8Array): Promise<void> {
    const channel = this.channel(docId);
    channel.pendingUpdates.push(data);
    channel.pendingBytes += data.byteLength;
    if (channel.pendingBytes > FLUSH_MAX_PENDING_BYTES) {
      await this.flushPendingUpdates(docId);
      return;
    }
    if (channel.flushTimer !== null) clearTimeout(channel.flushTimer);
    channel.flushTimer = setTimeout(() => {
      channel.flushTimer = null;
      void this.flushPendingUpdates(docId);
    }, FLUSH_QUIET_MS);
  }

  subscribe(
    cb: (docId: string, data: Uint8Array) => void,
    disconnect: (reason: string) => void,
  ): () => void {
    this.updateListeners.add(cb);
    this.disconnectListeners.add(disconnect);
    return () => {
      this.updateListeners.delete(cb);
      this.disconnectListeners.delete(disconnect);
    };
  }
}
