export interface RTDBEvent {
  type: "read" | "write";
  op: string; // onValue, set, update, push, remove, get, onChildAdded, etc.
  path: string;
  estimatedBytes: number;
  timestamp: number;
}

export interface RTDBMetrics {
  reads: number;
  writes: number;
  readBytes: number;
  writeBytes: number;
  listeners: number; // active onValue / onChild* subscriptions
  listenerPaths: string[]; // paths currently being listened to
  events: RTDBEvent[];
}

export interface RTDBTrackerOverlayProps {
  enabled?: boolean;
}
