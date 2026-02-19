// ─────────────────────────────────────────────────────────────
// breadcrumb/store/returnVisitor.ts — Return visit detection
// ─────────────────────────────────────────────────────────────
// Uses localStorage to track visit count and last-visit timestamp.
// No cookies, no fingerprinting, no cross-site tracking.
// ─────────────────────────────────────────────────────────────

const VISITOR_KEY = "bc_visitor";

interface VisitorRecord {
  visitCount: number;
  lastVisitAt: number; // epoch ms
}

function read(): VisitorRecord | null {
  try {
    const raw = localStorage.getItem(VISITOR_KEY);
    return raw ? (JSON.parse(raw) as VisitorRecord) : null;
  } catch {
    return null;
  }
}

function write(record: VisitorRecord): void {
  try {
    localStorage.setItem(VISITOR_KEY, JSON.stringify(record));
  } catch {
    // quota exceeded — degrade silently
  }
}

/**
 * Record a new visit and return context about visit history.
 * Called once per session initialization.
 */
export function recordVisit(): {
  isReturnVisitor: boolean;
  visitCount: number;
  daysSinceLastVisit: number | null;
} {
  const existing = read();
  const now = Date.now();

  if (!existing) {
    write({ visitCount: 1, lastVisitAt: now });
    return { isReturnVisitor: false, visitCount: 1, daysSinceLastVisit: null };
  }

  const daysSince = Math.floor(
    (now - existing.lastVisitAt) / (1000 * 60 * 60 * 24)
  );

  const updated: VisitorRecord = {
    visitCount: existing.visitCount + 1,
    lastVisitAt: now,
  };
  write(updated);

  return {
    isReturnVisitor: true,
    visitCount: updated.visitCount,
    daysSinceLastVisit: daysSince,
  };
}

/** Clear visitor data (for opt-out) */
export function clearVisitorData(): void {
  try {
    localStorage.removeItem(VISITOR_KEY);
  } catch {
    // Ignore
  }
}
