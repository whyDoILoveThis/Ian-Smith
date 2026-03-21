/**
 * Estimate the byte size of a JSON-serializable value.
 * Uses a fast heuristic: JSON.stringify length × 2 (UTF-16 → UTF-8 average).
 * Falls back to a rough estimate for circular / non-serializable values.
 */
export function estimateBytes(value: unknown): number {
  if (value === null || value === undefined) return 4; // "null"
  try {
    const json = JSON.stringify(value);
    // Average overhead for RTDB wire protocol is ~1.3x JSON size
    return Math.ceil(json.length * 1.3);
  } catch {
    // Circular or too large — rough guess
    if (typeof value === "object") return 512;
    return 64;
  }
}

/**
 * Extract a human-readable path string from a Firebase DatabaseReference.
 */
export function extractPath(refLike: unknown): string {
  if (!refLike || typeof refLike !== "object") return "(unknown)";
  const r = refLike as Record<string, unknown>;
  // firebase/database Reference has _path or toString()
  if (typeof r.toString === "function") {
    const s = r.toString() as string;
    // Full URL like https://xxx.firebaseio.com/path/to/node
    const idx = s.indexOf(".firebaseio.com/");
    if (idx !== -1) return "/" + s.slice(idx + 16);
    const idx2 = s.indexOf(".firebasedatabase.app/");
    if (idx2 !== -1) return "/" + s.slice(idx2 + 22);
    return s;
  }
  return "(unknown)";
}

const SIZE_UNITS = ["B", "KB", "MB", "GB"] as const;

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  let i = 0;
  let val = bytes;
  while (val >= 1024 && i < SIZE_UNITS.length - 1) {
    val /= 1024;
    i++;
  }
  return `${val < 10 ? val.toFixed(2) : val < 100 ? val.toFixed(1) : Math.round(val)} ${SIZE_UNITS[i]}`;
}
