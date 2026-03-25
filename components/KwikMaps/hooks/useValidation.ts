import type {
  Action,
  AIResponse,
  ValidationResult,
} from "../types/chat.types";

const VALID_ACTION_TYPES = new Set([
  "ADD_STOP",
  "REMOVE_STOP",
  "REORDER_STOPS",
  "OPTIMIZE_ROUTE",
]);

/**
 * Validate a raw AI response (parsed JSON) against the strict schema.
 * Returns a validated result or a safe error.
 */
export function validateAIResponse(raw: unknown): ValidationResult {
  if (raw === null || raw === undefined || typeof raw !== "object") {
    return {
      ok: false,
      error: "AI response is not an object",
      fallbackMessage: "I couldn't process that. Could you rephrase?",
    };
  }

  const obj = raw as Record<string, unknown>;

  // Must have message string
  if (typeof obj.message !== "string" || obj.message.trim().length === 0) {
    return {
      ok: false,
      error: "AI response missing 'message' string",
      fallbackMessage: "I couldn't process that. Could you rephrase?",
    };
  }

  // Must have actions array
  if (!Array.isArray(obj.actions)) {
    return {
      ok: false,
      error: "AI response missing 'actions' array",
      fallbackMessage: obj.message as string,
    };
  }

  // Validate each action
  const validatedActions: Action[] = [];

  for (let i = 0; i < obj.actions.length; i++) {
    const action = obj.actions[i];
    if (!action || typeof action !== "object") {
      return {
        ok: false,
        error: `Action ${i} is not an object`,
        fallbackMessage: obj.message as string,
      };
    }

    const a = action as Record<string, unknown>;

    if (!VALID_ACTION_TYPES.has(a.type as string)) {
      return {
        ok: false,
        error: `Action ${i} has invalid type: ${a.type}`,
        fallbackMessage: obj.message as string,
      };
    }

    const result = validateActionPayload(a.type as string, a.payload, i);
    if (!result.ok) {
      return { ...result, fallbackMessage: obj.message as string };
    }

    validatedActions.push(result.action);
  }

  return {
    ok: true,
    data: {
      actions: validatedActions,
      message: (obj.message as string).trim(),
    },
  };
}

function validateActionPayload(
  type: string,
  payload: unknown,
  index: number,
): { ok: true; action: Action } | { ok: false; error: string } {
  switch (type) {
    case "ADD_STOP": {
      if (!payload || typeof payload !== "object") {
        return { ok: false, error: `Action ${index} (ADD_STOP) missing payload` };
      }
      const p = payload as Record<string, unknown>;
      if (typeof p.name !== "string" || p.name.trim().length === 0) {
        return { ok: false, error: `Action ${index} (ADD_STOP) missing name` };
      }
      const afterStop = typeof p.afterStop === "number" ? p.afterStop : 0;
      return {
        ok: true,
        action: {
          type: "ADD_STOP",
          payload: { name: p.name.trim(), afterStop },
        },
      };
    }

    case "REMOVE_STOP": {
      if (!payload || typeof payload !== "object") {
        return { ok: false, error: `Action ${index} (REMOVE_STOP) missing payload` };
      }
      const p = payload as Record<string, unknown>;
      if (!Array.isArray(p.stopNumbers) || p.stopNumbers.length === 0) {
        return { ok: false, error: `Action ${index} (REMOVE_STOP) missing stopNumbers` };
      }
      const nums = p.stopNumbers.filter(
        (n): n is number => typeof n === "number" && Number.isInteger(n) && n >= 1,
      );
      if (nums.length === 0) {
        return { ok: false, error: `Action ${index} (REMOVE_STOP) has no valid stopNumbers` };
      }
      return {
        ok: true,
        action: { type: "REMOVE_STOP", payload: { stopNumbers: nums } },
      };
    }

    case "REORDER_STOPS": {
      if (!payload || typeof payload !== "object") {
        return { ok: false, error: `Action ${index} (REORDER_STOPS) missing payload` };
      }
      const p = payload as Record<string, unknown>;
      if (!Array.isArray(p.newOrder) || p.newOrder.length === 0) {
        return { ok: false, error: `Action ${index} (REORDER_STOPS) missing newOrder` };
      }
      const order = p.newOrder.filter(
        (n): n is number => typeof n === "number" && Number.isInteger(n) && n >= 1,
      );
      if (order.length === 0) {
        return { ok: false, error: `Action ${index} (REORDER_STOPS) has no valid order numbers` };
      }
      return {
        ok: true,
        action: { type: "REORDER_STOPS", payload: { newOrder: order } },
      };
    }

    case "OPTIMIZE_ROUTE": {
      let lockedPrefix = 0;
      if (payload && typeof payload === "object") {
        const p = payload as Record<string, unknown>;
        if (typeof p.lockedPrefix === "number" && Number.isInteger(p.lockedPrefix) && p.lockedPrefix >= 0) {
          lockedPrefix = p.lockedPrefix;
        }
      }
      return {
        ok: true,
        action: lockedPrefix > 0
          ? { type: "OPTIMIZE_ROUTE", payload: { lockedPrefix } }
          : { type: "OPTIMIZE_ROUTE" },
      };
    }

    default:
      return { ok: false, error: `Unknown action type: ${type}` };
  }
}
