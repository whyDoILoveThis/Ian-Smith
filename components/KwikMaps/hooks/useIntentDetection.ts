import type { Action, LocalIntent } from "../types/chat.types";

/**
 * Detect simple user commands locally, avoiding AI API calls entirely.
 * Returns actions + a friendly message, or null if AI is required.
 */
export function detectIntent(
  message: string,
  stopCount: number,
  hasRoute: boolean,
): LocalIntent | null {
  const msg = message.trim().toLowerCase();

  // ── OPTIMIZE (bare command only — nuanced requests go to AI) ──
  if (/^(optimi[sz]e|re-?optimi[sz]e|find\s+best\s+(order|route)|best\s+(order|route)|shortest\s+route|make\s+it\s+efficient)\s*[.!?]*$/i.test(msg)) {
    if (!hasRoute && stopCount < 2) return null;
    return {
      type: "OPTIMIZE",
      actions: [{ type: "OPTIMIZE_ROUTE" }],
      message: "Running the optimization algorithm now — I'll rearrange your stops to find the shortest path with minimal backtracking.",
    };
  }

  // ── CLEAR ROUTE ──
  if (/^(clear\s*(all|route|everything)?|reset)\s*[.!?]*$/i.test(msg)) {
    return {
      type: "CLEAR_ROUTE",
      actions: [], // handled directly by the hook
      message: "All cleared! Your route has been reset — feel free to start fresh whenever you're ready.",
    };
  }

  // ── REVERSE ──
  if (/^(reverse|flip)\s*(the\s+)?(route|order|stops)?\s*[.!?]*$/i.test(msg)) {
    if (!hasRoute || stopCount < 2) return null;
    const newOrder = Array.from({ length: stopCount }, (_, i) => stopCount - i);
    return {
      type: "REVERSE_ROUTE",
      actions: [{ type: "REORDER_STOPS", payload: { newOrder } }],
      message: "Done! I've flipped your route so you'll be traveling in the opposite direction.",
    };
  }

  // ── REMOVE STOP N ──
  const removeMatch = msg.match(/^remove\s+stop\s+(\d+)\s*[.!?]*$/i);
  if (removeMatch) {
    const num = parseInt(removeMatch[1], 10);
    if (num >= 1 && num <= stopCount) {
      return {
        type: "REMOVE_STOP",
        actions: [{ type: "REMOVE_STOP", payload: { stopNumbers: [num] } }],
        message: `Got it — I've removed stop ${num} from your route.`,
      };
    }
  }

  // ── REMOVE STOPS N and M ──
  const removeMultiMatch = msg.match(/^remove\s+stops?\s+([\d,\s]+(?:and\s+\d+)?)\s*[.!?]*$/i);
  if (removeMultiMatch) {
    const nums = removeMultiMatch[1]
      .replace(/and/gi, ",")
      .split(",")
      .map(s => parseInt(s.trim(), 10))
      .filter(n => !isNaN(n) && n >= 1 && n <= stopCount);
    if (nums.length > 0 && nums.length < stopCount) {
      return {
        type: "REMOVE_STOP",
        actions: [{ type: "REMOVE_STOP", payload: { stopNumbers: nums } }],
        message: `Done! I've removed stop${nums.length > 1 ? "s" : ""} ${nums.join(" and ")} from your route.`,
      };
    }
  }

  // ── SWAP N and M ──
  const swapMatch = msg.match(/^swap\s+(?:stops?\s+)?(\d+)\s+(?:and|with|&)\s+(\d+)\s*[.!?]*$/i);
  if (swapMatch) {
    const a = parseInt(swapMatch[1], 10);
    const b = parseInt(swapMatch[2], 10);
    if (a >= 1 && a <= stopCount && b >= 1 && b <= stopCount && a !== b) {
      const newOrder = Array.from({ length: stopCount }, (_, i) => i + 1);
      newOrder[a - 1] = b;
      newOrder[b - 1] = a;
      return {
        type: "SWAP_STOPS",
        actions: [{ type: "REORDER_STOPS", payload: { newOrder } }],
        message: `Swapped! Stop ${a} and stop ${b} have switched places in your route.`,
      };
    }
  }

  // ── MOVE STOP N to position M ──
  const moveMatch = msg.match(
    /^move\s+stop\s+(\d+)\s+(?:to\s+)?(?:position\s+|#)?(\d+)\s*[.!?]*$/i,
  );
  if (moveMatch) {
    const from = parseInt(moveMatch[1], 10);
    const to = parseInt(moveMatch[2], 10);
    if (from >= 1 && from <= stopCount && to >= 1 && to <= stopCount && from !== to) {
      const order = Array.from({ length: stopCount }, (_, i) => i + 1);
      order.splice(from - 1, 1);
      order.splice(to - 1, 0, from);
      return {
        type: "MOVE_STOP",
        actions: [{ type: "REORDER_STOPS", payload: { newOrder: order } }],
        message: `Done — I've moved stop ${from} to position ${to} in your route.`,
      };
    }
  }

  // ── MOVE STOP N first/last ──
  const moveFirstMatch = msg.match(
    /^(?:move|put)\s+stop\s+(\d+)\s+(first|last)\s*[.!?]*$/i,
  );
  if (moveFirstMatch) {
    const num = parseInt(moveFirstMatch[1], 10);
    const position = moveFirstMatch[2].toLowerCase();
    if (num >= 1 && num <= stopCount) {
      const order = Array.from({ length: stopCount }, (_, i) => i + 1);
      order.splice(num - 1, 1);
      if (position === "first") {
        order.unshift(num);
      } else {
        order.push(num);
      }
      return {
        type: "MOVE_STOP",
        actions: [{ type: "REORDER_STOPS", payload: { newOrder: order } }],
        message: `Moved stop ${num} to the ${position} position — your route order has been updated.`,
      };
    }
  }

  // No simple intent detected — need AI
  return null;
}
