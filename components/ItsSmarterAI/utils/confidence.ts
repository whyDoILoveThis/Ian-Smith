/**
 * Parse a confidence score from an AI response.
 * Attempts JSON parsing first, falls back to regex, then defaults to 50.
 */
export function parseConfidence(raw: string): { confidence: number; reasoning: string } {
  // Try full JSON parse
  try {
    const cleaned = raw.trim().replace(/^```json?\s*/i, "").replace(/```\s*$/, "");
    const parsed = JSON.parse(cleaned);
    if (typeof parsed.confidence === "number" && parsed.confidence >= 0 && parsed.confidence <= 100) {
      return { confidence: Math.round(parsed.confidence), reasoning: parsed.reasoning || "" };
    }
  } catch {
    // fall through
  }

  // Regex: find "confidence": <number>
  const jsonMatch = raw.match(/"confidence"\s*:\s*(\d{1,3})/);
  if (jsonMatch) {
    const n = parseInt(jsonMatch[1], 10);
    if (n >= 0 && n <= 100) return { confidence: n, reasoning: "Extracted from partial JSON" };
  }

  // Last resort: any standalone number 0-100
  const numMatch = raw.match(/\b(\d{1,3})\b/);
  if (numMatch) {
    const n = parseInt(numMatch[1], 10);
    if (n >= 0 && n <= 100) return { confidence: n, reasoning: "Extracted from raw text" };
  }

  return { confidence: 50, reasoning: "Could not parse confidence; defaulting to 50" };
}

/**
 * Parse a JSON array of strings from an AI response.
 * Handles markdown code blocks and partial JSON gracefully.
 */
export function parseJsonArray(raw: string): string[] {
  // Try full JSON parse
  try {
    const cleaned = raw.trim().replace(/^```json?\s*/i, "").replace(/```\s*$/, "");
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch {
    // fall through
  }

  // Try extracting a JSON array from surrounding text
  const arrayMatch = raw.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try {
      const parsed = JSON.parse(arrayMatch[0]);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      // fall through
    }
  }

  // Last resort: split by numbered lines
  const lines = raw
    .split(/\n/)
    .map((l) => l.replace(/^\d+[\.)]\s*/, "").replace(/^[-*]\s*/, "").trim())
    .filter((l) => l.length > 5);

  return lines.length > 0 ? lines : ["Unable to parse response"];
}
