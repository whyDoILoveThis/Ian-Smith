// ─────────────────────────────────────────────────────────────
// breadcrumb/store/sessionStore.ts — In-memory + localStorage session state
// ─────────────────────────────────────────────────────────────
// Maintains the canonical session object in memory.
// Persists snapshots to localStorage so partial data survives
// soft reloads within the same session.
// ─────────────────────────────────────────────────────────────

import type {
  BreadcrumbSession,
  PageVisit,
  HoverHesitation,
  ClickSignal,
  MicroInteraction,
  DeviceContext,
  StateSignal,
  BreadcrumbConfig,
} from "../types";
import { DEFAULT_CONFIG } from "../types";

const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes of inactivity = new session

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Read a value from localStorage, returning null on any failure */
function readStorage<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/** Write a value to localStorage, silently failing on quota errors */
function writeStorage(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full — degrade gracefully
  }
}

/**
 * SessionStore — Singleton-ish class that owns the session lifecycle.
 * Created once per BreadcrumbProvider mount.
 */
export class SessionStore {
  private session: BreadcrumbSession;
  private config: BreadcrumbConfig;
  private persistKey: string;

  constructor(config: Partial<BreadcrumbConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.persistKey = `${this.config.storagePrefix}session`;

    // Try to resume an existing session
    const existing = readStorage<BreadcrumbSession>(this.persistKey);
    if (existing && Date.now() - existing.lastActivityAt < SESSION_TTL_MS) {
      this.session = existing;
      this.session.lastActivityAt = Date.now();
      // Backfill arrays that may not exist in older persisted sessions
      if (!this.session.microInteractions) {
        this.session.microInteractions = [];
      }
    } else {
      this.session = this.createFreshSession();
    }
  }

  private createFreshSession(): BreadcrumbSession {
    return {
      sessionId: generateId(),
      startedAt: Date.now(),
      lastActivityAt: Date.now(),
      device: {} as DeviceContext, // filled by collector
      pageSequence: [],
      hoverHesitations: [],
      clickSignals: [],
      microInteractions: [],
      inferredStates: [],
      sessionNarrative: "",
    };
  }

  // ── Accessors ──────────────────────────────────────────────

  getSession(): Readonly<BreadcrumbSession> {
    return this.session;
  }

  getConfig(): Readonly<BreadcrumbConfig> {
    return this.config;
  }

  // ── Mutators ───────────────────────────────────────────────

  setDeviceContext(ctx: DeviceContext): void {
    this.session.device = ctx;
    this.touch();
  }

  addPageVisit(visit: PageVisit): void {
    this.session.pageSequence.push(visit);
    // Trim to max
    if (this.session.pageSequence.length > this.config.maxPageHistory) {
      this.session.pageSequence = this.session.pageSequence.slice(
        -this.config.maxPageHistory
      );
    }
    this.touch();
  }

  /** Update the most recent page visit (e.g. to fill in dwellMs) */
  updateLastPageVisit(updates: Partial<PageVisit>): void {
    const last = this.session.pageSequence[this.session.pageSequence.length - 1];
    if (last) {
      Object.assign(last, updates);
      this.touch();
    }
  }

  addHoverHesitation(h: HoverHesitation): void {
    this.session.hoverHesitations.push(h);
    if (this.session.hoverHesitations.length > this.config.maxHoverHistory) {
      this.session.hoverHesitations = this.session.hoverHesitations.slice(
        -this.config.maxHoverHistory
      );
    }
    this.touch();
  }

  addClickSignal(c: ClickSignal): void {
    this.session.clickSignals.push(c);
    this.touch();
  }

  addMicroInteraction(m: MicroInteraction): void {
    this.session.microInteractions.push(m);
    this.touch();
  }

  setInferredStates(states: StateSignal[]): void {
    this.session.inferredStates = states;
    this.touch();
  }

  setNarrative(narrative: string): void {
    this.session.sessionNarrative = narrative;
    this.touch();
  }

  // ── Persistence ────────────────────────────────────────────

  private touch(): void {
    this.session.lastActivityAt = Date.now();
    this.persist();
  }

  private persist(): void {
    writeStorage(this.persistKey, this.session);
  }

  /** Force-clear the session (useful for testing / opt-out) */
  destroy(): void {
    try {
      localStorage.removeItem(this.persistKey);
    } catch {
      // Ignore
    }
  }
}
