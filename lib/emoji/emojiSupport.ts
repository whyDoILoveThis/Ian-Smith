/**
 * Canvas-based emoji glyph support detection.
 *
 * Determines at runtime whether "Segoe UI Emoji" (Windows 10 flat style)
 * actually renders a given emoji as a visible *color* glyph — as opposed
 * to a blank, tofu box (□), or monochrome fallback.
 *
 * Results are cached in a module-level Map so each emoji is checked at
 * most once per page session.  All canvas work uses a single reusable
 * off-screen canvas so there is zero DOM churn.
 *
 * ── How it works ─────────────────────────────────────────────────────
 *
 * 1. **Color pixel test**  — Render the emoji with "Segoe UI Emoji" on a
 *    small canvas and count how many pixels are non-grayscale (i.e. they
 *    have real colour).  Color emoji fonts always produce colourful
 *    output; tofu boxes and missing-glyph placeholders are monochrome.
 *
 * 2. **Tofu comparison** (fallback for monochrome emoji like ⬛) — If
 *    no colour is detected, compare the rendering against a known
 *    absent character (U+10FFFD — a private-use non-character that
 *    no font contains).  If the two look identical the emoji rendered
 *    as the same tofu placeholder and is therefore unsupported.
 *
 * 3. **Canvas colour sanity check** — On first call we render 😀 to
 *    verify the browser's canvas can produce colour emoji at all. If it
 *    can't (e.g. very old browser) we skip per-emoji detection and
 *    conservatively mark everything as needing the fallback font.
 */

// ── Constants ────────────────────────────────────────────────────────
const CANVAS_SIZE = 32;
const FONT_SIZE = 24;
const PRIMARY_FONT = '"Segoe UI Emoji"';

// ── Singleton canvas ─────────────────────────────────────────────────
let _canvas: HTMLCanvasElement | null = null;
let _ctx: CanvasRenderingContext2D | null = null;

function getContext(): CanvasRenderingContext2D | null {
  if (typeof document === "undefined") return null; // SSR guard

  if (!_canvas) {
    _canvas = document.createElement("canvas");
    _canvas.width = CANVAS_SIZE;
    _canvas.height = CANVAS_SIZE;
    _ctx = _canvas.getContext("2d", { willReadFrequently: true });
  }
  return _ctx;
}

// ── Canvas colour-emoji capability check ─────────────────────────────
let _canvasColourOk: boolean | null = null;

/**
 * Returns `true` if the browser's canvas can render colour emoji at all.
 * Tested once with 😀 (U+1F600 — universally supported).
 */
function canvasSupportsColourEmoji(): boolean {
  if (_canvasColourOk !== null) return _canvasColourOk;

  const ctx = getContext();
  if (!ctx) return (_canvasColourOk = false);

  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  ctx.font = `${FONT_SIZE}px sans-serif`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillStyle = "#000";
  ctx.fillText("\u{1F600}", CANVAS_SIZE / 2, CANVAS_SIZE / 2);

  const { data } = ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] > 20) {
      const max = Math.max(data[i], data[i + 1], data[i + 2]);
      const min = Math.min(data[i], data[i + 1], data[i + 2]);
      if (max - min > 15) return (_canvasColourOk = true);
    }
  }

  return (_canvasColourOk = false);
}

// ── Per-emoji detection ──────────────────────────────────────────────

/** Render `text` on the shared canvas with the given CSS font string. */
function renderToPixels(text: string, font: string): Uint8ClampedArray {
  const ctx = getContext()!;
  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  ctx.font = font;
  ctx.fillStyle = "#000";
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillText(text, CANVAS_SIZE / 2, CANVAS_SIZE / 2);
  return ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE).data;
}

/**
 * Low-level check — does "Segoe UI Emoji" render `emoji` as a
 * real (colour) glyph?
 */
function checkSupport(emoji: string): boolean {
  const ctx = getContext();
  if (!ctx) return true; // SSR / Node → optimistically assume supported

  // If the canvas can't do colour emoji at all, skip per-glyph checks
  // and report unsupported so the fallback font is used.
  if (!canvasSupportsColourEmoji()) return false;

  const fontStr = `${FONT_SIZE}px ${PRIMARY_FONT}`;
  const pixels = renderToPixels(emoji, fontStr);

  // ── Pass 1: colour-pixel test ──────────────────────────────────
  let visiblePixels = 0;
  let colouredPixels = 0;

  for (let i = 0; i < pixels.length; i += 4) {
    const a = pixels[i + 3];
    if (a > 20) {
      visiblePixels++;
      const r = pixels[i],
        g = pixels[i + 1],
        b = pixels[i + 2];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      // Real colour (not just black/grey antialiasing)
      if (max - min > 15 || (max > 50 && min < max * 0.7)) {
        colouredPixels++;
      }
    }
  }

  if (visiblePixels === 0) return false; // blank → not supported
  if (colouredPixels > 3) return true; // has colour → supported

  // ── Pass 2: tofu comparison for monochrome emoji ───────────────
  // Render U+10FFFD (private-use, guaranteed no glyph in any font)
  const controlPixels = renderToPixels("\u{10FFFD}", fontStr);

  let diffPixels = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    const dR = Math.abs(pixels[i] - controlPixels[i]);
    const dG = Math.abs(pixels[i + 1] - controlPixels[i + 1]);
    const dB = Math.abs(pixels[i + 2] - controlPixels[i + 2]);
    const dA = Math.abs(pixels[i + 3] - controlPixels[i + 3]);
    if (dR + dG + dB + dA > 20) diffPixels++;
  }

  // Rendering differs meaningfully from tofu → it's a real glyph
  return diffPixels > 5;
}

// ── Public API ───────────────────────────────────────────────────────

/** Module-level cache: emoji codepoint string → supported boolean. */
const supportCache = new Map<string, boolean>();

/**
 * Check whether a single emoji is natively supported by
 * "Segoe UI Emoji".  Results are cached.
 */
export function isSegoeEmojiSupported(emoji: string): boolean {
  const cached = supportCache.get(emoji);
  if (cached !== undefined) return cached;

  const supported = checkSupport(emoji);
  supportCache.set(emoji, supported);
  return supported;
}

/**
 * Batch-check an array of emoji strings.
 * Returns a `Map<emoji, supported>`.
 */
export function batchCheckSupport(
  emojis: string[],
): Map<string, boolean> {
  const results = new Map<string, boolean>();
  for (const e of emojis) {
    results.set(e, isSegoeEmojiSupported(e));
  }
  return results;
}

/** How many entries are in the cache (useful for debugging). */
export function getSupportCacheSize(): number {
  return supportCache.size;
}

/** Flush the cache (e.g. after a system font change). */
export function clearSupportCache(): void {
  supportCache.clear();
  _canvasColourOk = null;
}
