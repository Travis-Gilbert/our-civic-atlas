/**
 * RustyRedYjsProvider: a plain-`Y.Doc` sync provider over the rustyred-server
 * WebSocket endpoint `/v1/tenants/:tenant_id/sync/yjs/:doc_id`.
 *
 * This is the Next-side sibling of the bundle's `RustyRedDocSource`
 * (`src/civic-editor/rustyred-doc-source.ts`), which speaks the same wire
 * protocol but implements BlockSuite's `DocSource` interface against the
 * sealed editor bundle. The geo-task store (`geo-task-store.ts`) needs the
 * identical transport for an ordinary `Y.Doc` that Next owns directly, so
 * BlockNote can bind to a `Y.XmlFragment` inside it. Rather than import
 * BlockSuite (forbidden from Next code, see `civic-editor-loader.ts`), this
 * re-expresses the protocol against a bare `Y.Doc`.
 *
 * Wire protocol (binary frames tagged by first byte, per SCHEMA-CONTRACT.md):
 *
 *   C->S 0x00 <state-vector>  pull handshake
 *   S->C 0x01 <update>        pull reply (diff since that vector)
 *   C->S 0x02 <update>        push (server applies + broadcasts)
 *   S->C 0x02 <update>        peer update delivery
 *
 * One WebSocket per doc id. On open we (a) push our full local state so the
 * server merges any offline edits, then (b) pull so we receive whatever the
 * server has that we do not. Ongoing local updates batch into one merged 0x02
 * frame after 300ms of quiet (or 64KB pending), mirroring the DocSource's
 * write-amplification guard. IndexedDB (`y-indexeddb`) stays the local source
 * of truth; this provider is the cross-browser transport only.
 */

import * as Y from "yjs";

const TAG_PULL = 0x00;
const TAG_PULL_REPLY = 0x01;
const TAG_UPDATE = 0x02;

const RECONNECT_BASE_MS = 500;
const RECONNECT_MAX_MS = 8000;
const FLUSH_QUIET_MS = 300;
const FLUSH_MAX_PENDING_BYTES = 64 * 1024;

function tagged(tag: number, payload: Uint8Array): Uint8Array {
  const frame = new Uint8Array(payload.length + 1);
  frame[0] = tag;
  frame.set(payload, 1);
  return frame;
}

export class RustyRedYjsProvider {
  private readonly url: string;
  private socket: WebSocket | null = null;
  private opening = false;
  private attempts = 0;
  private destroyed = false;
  private pendingUpdates: Uint8Array[] = [];
  private pendingBytes = 0;
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly onUpdate: (update: Uint8Array, origin: unknown) => void;

  /**
   * @param baseUrl ws(s) endpoint up to `/sync/yjs`, e.g.
   *   `wss://host/v1/tenants/flint/sync/yjs`
   * @param docId   the shared document id, e.g. `geo-tasks:porchfest-2026`
   * @param doc     the `Y.Doc` to keep in sync
   */
  constructor(
    baseUrl: string,
    private readonly docId: string,
    private readonly doc: Y.Doc,
  ) {
    this.url = `${baseUrl.replace(/\/$/, "")}/${encodeURIComponent(docId)}`;
    // Local edits (origin !== this provider) queue for push to the server.
    this.onUpdate = (update, origin) => {
      if (origin === this) return;
      this.queuePush(update);
    };
    this.doc.on("update", this.onUpdate);
    if (typeof window !== "undefined" && "WebSocket" in window) {
      this.connect();
    }
  }

  private connect(): void {
    if (this.destroyed || this.opening) return;
    if (this.socket && this.socket.readyState === WebSocket.OPEN) return;
    this.opening = true;

    const socket = new WebSocket(this.url);
    socket.binaryType = "arraybuffer";

    socket.onopen = () => {
      this.opening = false;
      this.attempts = 0;
      this.socket = socket;
      // (a) Hand the server our full state so it merges offline edits, then
      // (b) ask for whatever the server has that we are missing.
      socket.send(tagged(TAG_UPDATE, Y.encodeStateAsUpdate(this.doc)));
      socket.send(tagged(TAG_PULL, Y.encodeStateVector(this.doc)));
      // Drain anything that queued while the socket was opening.
      this.flushPendingUpdates();
    };

    socket.onmessage = (event: MessageEvent) => {
      const frame = new Uint8Array(event.data as ArrayBuffer);
      if (frame.length === 0) return;
      const payload = frame.subarray(1);
      if (frame[0] === TAG_PULL_REPLY || frame[0] === TAG_UPDATE) {
        // Apply with `this` as origin so our own update listener does not
        // echo a server-sourced update back to the server.
        Y.applyUpdate(this.doc, payload, this);
      }
    };

    socket.onerror = () => {
      // `close` fires next; reconnection is scheduled there.
    };

    socket.onclose = () => {
      if (this.socket === socket) this.socket = null;
      this.opening = false;
      if (this.destroyed) return;
      this.attempts += 1;
      const backoff = Math.min(
        RECONNECT_BASE_MS * 2 ** this.attempts,
        RECONNECT_MAX_MS,
      );
      if (this.reconnectTimer !== null) clearTimeout(this.reconnectTimer);
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null;
        this.connect();
      }, backoff);
    };
  }

  private queuePush(update: Uint8Array): void {
    this.pendingUpdates.push(update);
    this.pendingBytes += update.byteLength;
    if (this.pendingBytes > FLUSH_MAX_PENDING_BYTES) {
      this.flushPendingUpdates();
      return;
    }
    if (this.flushTimer !== null) clearTimeout(this.flushTimer);
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      this.flushPendingUpdates();
    }, FLUSH_QUIET_MS);
  }

  private flushPendingUpdates(): void {
    if (this.flushTimer !== null) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    if (this.pendingUpdates.length === 0) return;
    const socket = this.socket;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      // Stay queued until reconnect rather than dropping (offline edits
      // survive; IndexedDB remains the local source of truth).
      return;
    }
    const batch = this.pendingUpdates.splice(0);
    this.pendingBytes = 0;
    const merged = batch.length === 1 ? batch[0] : Y.mergeUpdates(batch);
    socket.send(tagged(TAG_UPDATE, merged));
  }

  destroy(): void {
    this.destroyed = true;
    this.doc.off("update", this.onUpdate);
    if (this.flushTimer !== null) clearTimeout(this.flushTimer);
    if (this.reconnectTimer !== null) clearTimeout(this.reconnectTimer);
    this.flushTimer = null;
    this.reconnectTimer = null;
    if (this.socket) {
      try {
        this.socket.close();
      } catch {
        // ignore
      }
      this.socket = null;
    }
  }
}
