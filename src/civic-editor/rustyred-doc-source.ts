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
 */

import type { DocSource } from '@blocksuite/affine/sync';

const TAG_PULL = 0x00;
const TAG_PULL_REPLY = 0x01;
const TAG_UPDATE = 0x02;

const PULL_TIMEOUT_MS = 8000;
const RECONNECT_BASE_MS = 500;
const RECONNECT_MAX_MS = 8000;

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
      channel = { socket: null, opening: null, pendingPulls: [], attempts: 0 };
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

  async pull(
    docId: string,
    state: Uint8Array,
  ): Promise<{ data: Uint8Array; state?: Uint8Array } | null> {
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
    try {
      const socket = await this.socketFor(docId);
      socket.send(tagged(TAG_UPDATE, data));
    } catch {
      // Offline push: IndexedDB keeps the truth locally; the engine
      // re-pulls and re-pushes when the socket returns.
    }
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
