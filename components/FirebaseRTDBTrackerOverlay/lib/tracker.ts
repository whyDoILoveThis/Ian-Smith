/**
 * Firebase RTDB Tracker — WebSocket prototype interception.
 *
 * Patches WebSocket.prototype.send and WebSocket.prototype.addEventListener
 * to intercept ALL WebSocket traffic, then filters for Firebase RTDB
 * connections. This works regardless of when the WebSocket was created
 * (even if Firebase captured the WebSocket constructor before this runs).
 *
 * Completely client-side — adds zero network overhead.
 */
import type { RTDBEvent, RTDBMetrics } from "../types";

type Listener = (metrics: RTDBMetrics) => void;

/* ── Singleton state ──────────────────────────────────────────────── */

let installed = false;
const listeners = new Set<Listener>();
const events: RTDBEvent[] = [];
const MAX_EVENTS = 200;

let reads = 0;
let writes = 0;
let readBytes = 0;
let writeBytes = 0;
let activeListeners = 0;
const activeListenerPaths = new Map<string, number>(); // path → count

function snapshot(): RTDBMetrics {
  return { reads, writes, readBytes, writeBytes, listeners: activeListeners, listenerPaths: [...activeListenerPaths.keys()], events: [...events] };
}

function notify() {
  const m = snapshot();
  listeners.forEach((fn) => fn(m));
}

function record(evt: RTDBEvent) {
  events.push(evt);
  if (events.length > MAX_EVENTS) events.shift();
  if (evt.type === "read") {
    reads++;
    readBytes += evt.estimatedBytes;
  } else {
    writes++;
    writeBytes += evt.estimatedBytes;
  }
  notify();
}

/* ── Public API ───────────────────────────────────────────────────── */

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  fn(snapshot());
  return () => { listeners.delete(fn); };
}

export function resetMetrics() {
  reads = writes = readBytes = writeBytes = activeListeners = 0;
  activeListenerPaths.clear();
  events.length = 0;
  notify();
}

export function getMetrics(): RTDBMetrics {
  return snapshot();
}

/* ── Wire protocol parser ─────────────────────────────────────────── */

interface ParsedFrame {
  direction: "in" | "out";
  op: string;
  path: string;
}

function isFirebaseUrl(url: string): boolean {
  return url.includes("firebaseio.com") || url.includes("firebasedatabase.app");
}

function byteLen(data: unknown): number {
  if (typeof data === "string") return data.length;
  if (data instanceof ArrayBuffer) return data.byteLength;
  if (data instanceof Blob) return data.size;
  if (ArrayBuffer.isView(data)) return data.byteLength;
  return 0;
}

function parseFrame(raw: string, direction: "in" | "out"): ParsedFrame | null {
  let json = raw;
  const braceIdx = raw.indexOf("{");
  if (braceIdx > 0) {
    const prefix = raw.slice(0, braceIdx);
    if (/^\d+$/.test(prefix)) {
      json = raw.slice(braceIdx);
    }
  } else if (/^\d+$/.test(raw)) {
    return null;
  }

  try {
    const msg = JSON.parse(json);
    if (!msg || typeof msg !== "object") return null;

    if (msg.t === "c") return { direction, op: "control", path: "/" };
    if (msg.t !== "d" || !msg.d) return null;
    const d = msg.d;

    if (direction === "in") {
      const action = d.a;
      const path = d.b?.p ?? "/";
      if (action === "d") return { direction, op: "data", path };
      if (action === "ac") return { direction, op: "auth_ok", path: "/" };
      if (action === "sd") return { direction, op: "security_debug", path };
      if (d.r !== undefined && d.b?.s) return { direction, op: `ack:${d.b.s}`, path: "/" };
      return { direction, op: "server_msg", path };
    }

    const action = d.a;
    const path = d.b?.p ?? "/";
    if (action === "q") return { direction, op: "listen", path };
    if (action === "n") return { direction, op: "unlisten", path };
    if (action === "p") return { direction, op: "set", path };
    if (action === "m") return { direction, op: "update", path };
    if (action === "auth" || action === "gauth") return { direction, op: "auth", path: "/" };
    if (action === "unauth") return { direction, op: "unauth", path: "/" };
    if (action === "stats") return { direction, op: "stats", path: "/" };
    return { direction, op: action ?? "unknown", path };
  } catch {
    return null;
  }
}

/* ── Prototype-level interception ─────────────────────────────────── */

/**
 * We track which WebSocket instances are Firebase by checking their URL.
 * Since we can't reliably intercept the constructor (Firebase may have
 * captured the reference before us), we intercept at the prototype level
 * which affects ALL instances regardless of creation timing.
 */
const trackedSockets = new WeakSet<WebSocket>();
const firebaseSockets = new WeakSet<WebSocket>();

function checkAndTrackSocket(ws: WebSocket): boolean {
  if (trackedSockets.has(ws)) return firebaseSockets.has(ws);

  trackedSockets.add(ws);
  try {
    if (isFirebaseUrl(ws.url)) {
      firebaseSockets.add(ws);
      return true;
    }
  } catch {
    // url might throw if socket is in weird state
  }
  return false;
}

function installTracker() {
  if (installed) return;
  if (typeof globalThis === "undefined" || typeof WebSocket === "undefined") return;
  installed = true;

  const proto = WebSocket.prototype;

  /* ── Patch send() for outgoing data ──────────────────────────────── */
  const originalSend = proto.send;
  proto.send = function patchedSend(data: string | ArrayBufferLike | Blob | ArrayBufferView) {
    if (checkAndTrackSocket(this)) {
      const bytes = byteLen(data);
      const raw = typeof data === "string" ? data : null;
      const parsed = raw ? parseFrame(raw, "out") : null;

      if (parsed?.op === "listen") {
        activeListeners++;
        const p = parsed.path;
        activeListenerPaths.set(p, (activeListenerPaths.get(p) ?? 0) + 1);
        notify();
      } else if (parsed?.op === "unlisten") {
        activeListeners = Math.max(0, activeListeners - 1);
        const p = parsed.path;
        const cnt = (activeListenerPaths.get(p) ?? 1) - 1;
        if (cnt <= 0) activeListenerPaths.delete(p); else activeListenerPaths.set(p, cnt);
        notify();
      }

      const op = parsed?.op ?? "send";
      const path = parsed?.path ?? "/";

      if (bytes <= 1) {
        writeBytes += bytes;
        writes++;
        notify();
      } else {
        record({ type: "write", op, path, estimatedBytes: bytes, timestamp: Date.now() });
      }
    }
    return originalSend.call(this, data);
  };

  /* ── Patch addEventListener() for incoming data ──────────────────── */
  const originalAddEventListener = proto.addEventListener;
  proto.addEventListener = function patchedAddEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions,
  ) {
    if (type === "message" && listener && checkAndTrackSocket(this)) {
      const wrappedListener = (event: Event) => {
        const msgEvent = event as MessageEvent;
        const bytes = byteLen(msgEvent.data);
        const raw = typeof msgEvent.data === "string" ? msgEvent.data : null;
        const parsed = raw ? parseFrame(raw, "in") : null;

        const op = parsed?.op ?? "data";
        const path = parsed?.path ?? "/";

        if (!(bytes < 20 && (op === "control" || op.startsWith("ack")))) {
          record({ type: "read", op, path, estimatedBytes: bytes, timestamp: Date.now() });
        }

        // Call the original listener
        if (typeof listener === "function") {
          listener.call(this, event);
        } else if (listener && typeof listener === "object" && "handleEvent" in listener) {
          listener.handleEvent(event);
        }
      };
      return originalAddEventListener.call(this, type, wrappedListener, options);
    }
    return originalAddEventListener.call(this, type, listener!, options);
  };

  /* ── Patch onmessage property for incoming data ──────────────────── */
  const onmessageDesc = Object.getOwnPropertyDescriptor(proto, "onmessage");
  if (onmessageDesc && onmessageDesc.set) {
    const originalSet = onmessageDesc.set;
    Object.defineProperty(proto, "onmessage", {
      ...onmessageDesc,
      set(handler: ((ev: MessageEvent) => void) | null) {
        if (handler && checkAndTrackSocket(this)) {
          const ws = this;
          const wrappedHandler = (event: MessageEvent) => {
            const bytes = byteLen(event.data);
            const raw = typeof event.data === "string" ? event.data : null;
            const parsed = raw ? parseFrame(raw, "in") : null;

            const op = parsed?.op ?? "data";
            const path = parsed?.path ?? "/";

            if (!(bytes < 20 && (op === "control" || op.startsWith("ack")))) {
              record({ type: "read", op, path, estimatedBytes: bytes, timestamp: Date.now() });
            }
            handler.call(ws, event);
          };
          originalSet.call(this, wrappedHandler);
        } else {
          originalSet.call(this, handler);
        }
      },
    });
  }

  console.log("[RTDB Tracker] Installed — prototype-level WebSocket interception");
}

// Auto-install at module scope
installTracker();
