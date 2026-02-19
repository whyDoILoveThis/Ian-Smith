// ─────────────────────────────────────────────────────────────
// breadcrumb/inference/inferenceEngine.ts — Behavioral state inference
// ─────────────────────────────────────────────────────────────
//
// This is the heart of the system. It takes raw behavioral signals
// from the session and infers abstract psychological states using
// probabilistic weighting and explainable heuristics.
//
// DESIGN PRINCIPLES:
// 1. No explicit emotional labels ("depressed", "anxious", etc.)
// 2. All states are described as *orientations* or *stances*
// 3. Every inference carries the evidence that produced it
// 4. Weights are 0–1 probabilities, not certainties
// 5. Heuristics are visible, tunable, and auditable
//
// ─────────────────────────────────────────────────────────────

import type { BreadcrumbSession, StateSignal } from "../types";

// ── Helper: clamp weight to [0, 1] ──────────────────────────
function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

// ── Helper: average of numbers ──────────────────────────────
function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

/**
 * Run all inference heuristics against the current session.
 * Returns a sorted array of StateSignals (highest weight first).
 */
export function inferStates(session: BreadcrumbSession): StateSignal[] {
  const signals: StateSignal[] = [];
  const { pageSequence, hoverHesitations, clickSignals, device } = session;

  // ════════════════════════════════════════════════════════════
  // 1. EXPLORATION DEPTH — Are they browsing widely or focused?
  // ════════════════════════════════════════════════════════════
  //
  // Many distinct pages visited → exploratory posture
  // Few pages, long dwell → focused / deliberate
  {
    const uniquePages = new Set(pageSequence.map((p) => p.path)).size;
    const totalPages = pageSequence.length;

    if (totalPages >= 2) {
      // Exploration: more unique pages relative to total = more exploratory
      const explorationRatio = uniquePages / totalPages;
      const avgDwell = avg(pageSequence.map((p) => p.dwellMs).filter((d) => d > 0));

      if (explorationRatio > 0.7 && totalPages >= 3) {
        signals.push({
          key: "exploratory-browsing",
          weight: clamp01(0.4 + explorationRatio * 0.4),
          evidence: [
            `${uniquePages} unique pages out of ${totalPages} visited`,
            `exploration ratio: ${(explorationRatio * 100).toFixed(0)}%`,
          ],
        });
      }

      if (avgDwell > 15000 && uniquePages <= 3) {
        signals.push({
          key: "deep-focus",
          weight: clamp01(0.3 + Math.min(avgDwell / 60000, 0.5)),
          evidence: [
            `average dwell time: ${(avgDwell / 1000).toFixed(1)}s`,
            `only ${uniquePages} unique pages visited`,
          ],
        });
      }
    }
  }

  // ════════════════════════════════════════════════════════════
  // 2. READING POSTURE — Scroll depth + velocity indicate reading style
  // ════════════════════════════════════════════════════════════
  //
  // Deep scroll + low velocity → thorough reading ("seeking clarity")
  // Shallow scroll + high velocity → scanning ("evaluating options")
  // Deep scroll + high velocity → skimming ("already decided, confirming")
  {
    const scrolledPages = pageSequence.filter((p) => p.scrollDepth > 0.1);
    if (scrolledPages.length > 0) {
      const avgDepth = avg(scrolledPages.map((p) => p.scrollDepth));
      const avgVelocity = avg(scrolledPages.map((p) => p.scrollVelocity));

      if (avgDepth > 0.6 && avgVelocity < 300) {
        signals.push({
          key: "seeking-clarity",
          weight: clamp01(0.3 + avgDepth * 0.4),
          evidence: [
            `average scroll depth: ${(avgDepth * 100).toFixed(0)}%`,
            `average scroll velocity: ${avgVelocity.toFixed(0)} px/s (slow, deliberate)`,
          ],
        });
      }

      if (avgDepth < 0.4 && avgVelocity > 500) {
        signals.push({
          key: "scanning-evaluating",
          weight: clamp01(0.3 + (avgVelocity / 2000) * 0.4),
          evidence: [
            `average scroll depth: ${(avgDepth * 100).toFixed(0)}% (shallow)`,
            `average scroll velocity: ${avgVelocity.toFixed(0)} px/s (fast)`,
          ],
        });
      }

      if (avgDepth > 0.7 && avgVelocity > 500) {
        signals.push({
          key: "confirming-expectations",
          weight: clamp01(0.25 + avgDepth * 0.2 + Math.min(avgVelocity / 2000, 0.3)),
          evidence: [
            `scrolled deeply (${(avgDepth * 100).toFixed(0)}%) but quickly (${avgVelocity.toFixed(0)} px/s)`,
            `suggests looking for something specific`,
          ],
        });
      }
    }
  }

  // ════════════════════════════════════════════════════════════
  // 3. HESITATION PATTERN — Hover without clicking signals deliberation
  // ════════════════════════════════════════════════════════════
  //
  // Many hovers without clicks → evaluating, cautious, weighing options
  // Hovers that lead to clicks → decisive but careful
  {
    if (hoverHesitations.length > 0) {
      const uncommittedHovers = hoverHesitations.filter((h) => !h.didClick);
      const committedHovers = hoverHesitations.filter((h) => h.didClick);
      const avgHoverDuration = avg(hoverHesitations.map((h) => h.durationMs));

      if (uncommittedHovers.length >= 2) {
        const ratio = uncommittedHovers.length / hoverHesitations.length;
        signals.push({
          key: "weighing-options",
          weight: clamp01(0.3 + ratio * 0.4),
          evidence: [
            `${uncommittedHovers.length}/${hoverHesitations.length} hovers without clicking`,
            `average hover duration: ${(avgHoverDuration / 1000).toFixed(1)}s`,
          ],
        });
      }

      if (committedHovers.length >= 2 && avgHoverDuration > 1000) {
        signals.push({
          key: "careful-decisive",
          weight: clamp01(0.3 + (committedHovers.length / hoverHesitations.length) * 0.3),
          evidence: [
            `${committedHovers.length} hover-then-click patterns`,
            `takes time to decide but follows through`,
          ],
        });
      }
    }
  }

  // ════════════════════════════════════════════════════════════
  // 4. SESSION TEMPO — Overall pacing signals urgency vs reflection
  // ════════════════════════════════════════════════════════════
  //
  // Short session + many pages → high urgency, goal-oriented
  // Long session + few pages → reflective, low urgency
  {
    const sessionDurationMs = session.lastActivityAt - session.startedAt;
    const sessionMinutes = sessionDurationMs / 60000;
    const totalPages = pageSequence.length;

    if (sessionMinutes > 0.5) {
      const pagesPerMinute = totalPages / sessionMinutes;

      if (pagesPerMinute > 2 && sessionMinutes < 3) {
        signals.push({
          key: "high-urgency",
          weight: clamp01(0.3 + Math.min(pagesPerMinute / 10, 0.4)),
          evidence: [
            `${pagesPerMinute.toFixed(1)} pages/min over ${sessionMinutes.toFixed(1)} minutes`,
            `rapid navigation suggests goal-oriented behavior`,
          ],
        });
      }

      if (pagesPerMinute < 0.5 && sessionMinutes > 2) {
        signals.push({
          key: "reflective-pace",
          weight: clamp01(0.3 + Math.min(sessionMinutes / 15, 0.4)),
          evidence: [
            `${pagesPerMinute.toFixed(1)} pages/min over ${sessionMinutes.toFixed(1)} minutes`,
            `unhurried pacing suggests contemplative engagement`,
          ],
        });
      }
    }
  }

  // ════════════════════════════════════════════════════════════
  // 5. RETURN VISITOR POSTURE — Returning implies unfinished business
  // ════════════════════════════════════════════════════════════
  {
    if (device.isReturnVisitor) {
      const recentReturn = device.daysSinceLastVisit !== null && device.daysSinceLastVisit <= 3;
      const frequentVisitor = device.visitCount >= 3;

      if (recentReturn) {
        signals.push({
          key: "reconsidering",
          weight: clamp01(0.4 + Math.min(device.visitCount / 10, 0.3)),
          evidence: [
            `returned after ${device.daysSinceLastVisit} day(s)`,
            `visit #${device.visitCount} — recent return suggests active consideration`,
          ],
        });
      }

      if (frequentVisitor && !recentReturn) {
        signals.push({
          key: "ongoing-interest",
          weight: clamp01(0.3 + Math.min(device.visitCount / 15, 0.3)),
          evidence: [
            `visit #${device.visitCount}`,
            device.daysSinceLastVisit !== null
              ? `last visit ${device.daysSinceLastVisit} days ago`
              : `return timing unknown`,
          ],
        });
      }
    }
  }

  // ════════════════════════════════════════════════════════════
  // 6. TIME-OF-DAY CONTEXT — Late night / early morning visits
  // ════════════════════════════════════════════════════════════
  //
  // Late-night browsing (11pm–4am) with slow pacing → contemplative
  // Weekend browsing → personal time, possibly more receptive
  {
    const hour = device.localHour;
    const isLateNight = hour >= 23 || hour <= 4;
    const isWeekend = device.localDayOfWeek === 0 || device.localDayOfWeek === 6;

    if (isLateNight) {
      signals.push({
        key: "late-night-contemplation",
        weight: 0.35,
        evidence: [
          `browsing at ${hour}:00 local time`,
          `late-night sessions often correlate with reflective or restless states`,
        ],
      });
    }

    if (isWeekend) {
      signals.push({
        key: "personal-time-browsing",
        weight: 0.25,
        evidence: [
          `visiting on a ${device.localDayOfWeek === 0 ? "Sunday" : "Saturday"}`,
          `weekend visits suggest personal interest rather than professional obligation`,
        ],
      });
    }
  }

  // ════════════════════════════════════════════════════════════
  // 7. ENTRY CONTEXT — How they got here colors the visit
  // ════════════════════════════════════════════════════════════
  {
    const ref = device.referrer;
    if (ref && ref !== "direct") {
      try {
        const refHost = new URL(ref).hostname;

        if (refHost.includes("linkedin")) {
          signals.push({
            key: "professional-evaluation",
            weight: 0.45,
            evidence: [`referred from LinkedIn (${refHost})`],
          });
        } else if (refHost.includes("github")) {
          signals.push({
            key: "technical-evaluation",
            weight: 0.45,
            evidence: [`referred from GitHub (${refHost})`],
          });
        } else if (refHost.includes("google") || refHost.includes("bing") || refHost.includes("duckduckgo")) {
          signals.push({
            key: "search-driven-discovery",
            weight: 0.35,
            evidence: [`arrived via search engine (${refHost})`],
          });
        }
      } catch {
        // Invalid URL — skip
      }
    }

    if (ref === "direct" && !device.isReturnVisitor) {
      signals.push({
        key: "intentional-visit",
        weight: 0.3,
        evidence: [
          `direct navigation (no referrer)`,
          `first visit — someone shared the URL or they typed it`,
        ],
      });
    }
  }

  // ── Sort by weight descending and return ───────────────────
  // ════════════════════════════════════════════════════════════
  // 8. MICRO-INTERACTION SIGNALS — Direct user input from breadcrumb probes
  // ════════════════════════════════════════════════════════════
  //
  // These carry high confidence because the user explicitly chose.
  // We translate their choices into inference-compatible state signals.
  {
    const micros = (session as { microInteractions?: { probe: string; value: string }[] }).microInteractions ?? [];

    for (const m of micros) {
      if (m.probe === "intent") {
        const intentMap: Record<string, { key: string; weight: number }> = {
          "hiring": { key: "professional-evaluation", weight: 0.8 },
          "exploring": { key: "exploratory-browsing", weight: 0.75 },
          "curious": { key: "seeking-clarity", weight: 0.65 },
          "passing-through": { key: "low-commitment-browse", weight: 0.5 },
        };
        const mapped = intentMap[m.value];
        if (mapped) {
          signals.push({
            key: mapped.key,
            weight: mapped.weight,
            evidence: [`user self-reported intent: "${m.value}"`],
          });
        }
      }

      if (m.probe === "resonance") {
        const resMap: Record<string, { key: string; weight: number }> = {
          "impressed": { key: "positive-resonance", weight: 0.7 },
          "thinking": { key: "weighing-options", weight: 0.65 },
          "excited": { key: "high-engagement", weight: 0.75 },
        };
        const mapped = resMap[m.value];
        if (mapped) {
          signals.push({
            key: mapped.key,
            weight: mapped.weight,
            evidence: [`user expressed resonance: "${m.value}"`],
          });
        }
      }

      if (m.probe === "curiosity") {
        if (m.value === "engaged") {
          signals.push({
            key: "curious-engaged",
            weight: 0.6,
            evidence: ["clicked the curiosity dot — willing to explore hidden elements"],
          });
        } else if (m.value === "ignored") {
          signals.push({
            key: "focused-ignoring-distractions",
            weight: 0.45,
            evidence: ["ignored the curiosity dot — task-oriented or uninterested in tangents"],
          });
        }
      }

      if (m.probe === "energy") {
        const energyMap: Record<string, { key: string; weight: number }> = {
          "high": { key: "high-energy", weight: 0.65 },
          "neutral": { key: "neutral-browsing", weight: 0.4 },
          "low": { key: "low-energy-browsing", weight: 0.55 },
        };
        const mapped = energyMap[m.value];
        if (mapped) {
          signals.push({
            key: mapped.key,
            weight: mapped.weight,
            evidence: [`user self-reported energy level: "${m.value}"`],
          });
        }
      }
    }
  }

  // ── Final sort by weight descending ────────────────────────
  return signals.sort((a, b) => b.weight - a.weight);
}
