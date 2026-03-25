/**
 * Comprehensive emoji regex and text parser.
 *
 * Matches all standard emoji sequences WITHOUT matching bare digits,
 * ASCII symbols (#, *), or other text characters.
 *
 * Handles:
 *  - Emoji_Presentation characters (😀, 👍, 🎉)
 *  - Text-default chars with VS16 (❤️ = U+2764 + U+FE0F)
 *  - Skin tone modifiers (👍🏽)
 *  - ZWJ sequences (👨‍👩‍👧‍👦, 👩‍💻)
 *  - Flag sequences (🇺🇸 = Regional Indicator pairs)
 *  - Keycap sequences (1️⃣ = digit + VS16? + U+20E3)
 *  - Tag sequences (🏴󠁧󠁢󠁥󠁮󠁧󠁿 = subdivision flags)
 */

// ── Building blocks ──────────────────────────────────────────────────
const VS16 = "\\uFE0F"; // Variation Selector 16 (emoji presentation)
const ZWJ = "\\u200D"; // Zero Width Joiner
const KEYCAP = "\\u20E3"; // Combining Enclosing Keycap
const SKIN_TONE = "[\\u{1F3FB}-\\u{1F3FF}]"; // Emoji Modifier Fitzpatrick
const RI = "[\\u{1F1E6}-\\u{1F1FF}]"; // Regional Indicator symbols
const TAG_CHAR = "[\\u{E0020}-\\u{E007E}]"; // Tags for subdivision flags
const TAG_END = "\\u{E007F}"; // Cancel Tag

// A single emoji "atom" — either a character with default emoji
// presentation, or one explicitly promoted to emoji via VS16.
// Optional skin-tone modifier appended.
const EMOJI_ATOM =
  `(?:\\p{Emoji_Presentation}|\\p{Emoji}${VS16})${SKIN_TONE}?`;

// ── Full pattern (ordered most-specific → least-specific) ────────────
const EMOJI_PATTERN = [
  // 1. Flag sequences — two Regional Indicator symbols (🇺🇸)
  `${RI}${RI}`,

  // 2. Tag sequences — subdivision flags (🏴󠁧󠁢󠁥󠁮󠁧󠁿)
  `\\p{Emoji_Presentation}${TAG_CHAR}+${TAG_END}`,

  // 3. Keycap sequences — digit/symbol + optional VS16 + keycap (1️⃣)
  `[#*0-9]${VS16}?${KEYCAP}`,

  // 4. General emoji with optional ZWJ chains (👨‍👩‍👧, 👩‍💻)
  `${EMOJI_ATOM}(?:${ZWJ}${EMOJI_ATOM})*`,
].join("|");

/**
 * Global, Unicode-aware regex that matches emoji sequences in text.
 *
 * IMPORTANT: Because this has the `g` flag, `lastIndex` is mutated
 * during iteration.  The helper `parseTextWithEmoji` resets it
 * automatically; if you use this directly, reset `lastIndex = 0`
 * before each new string.
 */
export const EMOJI_REGEX = new RegExp(EMOJI_PATTERN, "gu");

// ── Text segment types ───────────────────────────────────────────────

export interface TextSegment {
  type: "text" | "emoji";
  value: string;
}

/**
 * Split a string into alternating `text` and `emoji` segments.
 *
 * ```ts
 * parseTextWithEmoji("Hello 👋🏽 World")
 *  → [
 *   { type: "text",  value: "Hello " },
 *   { type: "emoji", value: "👋🏽" },
 *   { type: "text",  value: " World" },
 * ]
 * ```
 */
export function parseTextWithEmoji(text: string): TextSegment[] {
  const segments: TextSegment[] = [];

  // Reset since the regex is global
  EMOJI_REGEX.lastIndex = 0;

  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = EMOJI_REGEX.exec(text)) !== null) {
    // Preceding plain-text chunk
    if (match.index > cursor) {
      segments.push({ type: "text", value: text.slice(cursor, match.index) });
    }
    segments.push({ type: "emoji", value: match[0] });
    cursor = match.index + match[0].length;
  }

  // Trailing text
  if (cursor < text.length) {
    segments.push({ type: "text", value: text.slice(cursor) });
  }

  return segments;
}
