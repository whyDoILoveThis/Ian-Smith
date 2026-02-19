// ─────────────────────────────────────────────────────────────
// breadcrumb/collectors/deviceCollector.ts — One-shot device & environment capture
// ─────────────────────────────────────────────────────────────
// Captures static environment context once per session initialization.
// All data comes from standard browser APIs — no fingerprinting.
// ─────────────────────────────────────────────────────────────

import type { DeviceContext } from "../types";
import type { SessionStore } from "../store/sessionStore";
import { recordVisit } from "../store/returnVisitor";

/**
 * Classify device type from viewport width using common breakpoints.
 * This is intentionally simple — we're inferring browsing posture, not hardware.
 */
function classifyDevice(width: number): "mobile" | "tablet" | "desktop" {
  if (width < 768) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

/**
 * Capture the device and environment context.
 * Called once when the breadcrumb system initializes.
 */
export function collectDeviceContext(store: SessionStore): void {
  const now = new Date();
  const visitor = recordVisit();

  const ctx: DeviceContext = {
    deviceType: classifyDevice(window.innerWidth),
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    localHour: now.getHours(),
    localDayOfWeek: now.getDay(),
    referrer: document.referrer || "direct",
    isReturnVisitor: visitor.isReturnVisitor,
    visitCount: visitor.visitCount,
    daysSinceLastVisit: visitor.daysSinceLastVisit,
  };

  store.setDeviceContext(ctx);
}
