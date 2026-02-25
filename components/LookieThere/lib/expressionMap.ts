// ─── Expression display mapping ───────────────────────────────────
// Maps raw expression names to user-friendly labels, emojis, and colors.
// Colors use HSL values that work in both light and dark themes.

import { ExpressionName, ExpressionDisplay } from "../types";

/** Canonical display order — expressions always appear in this sequence */
export const EXPRESSION_ORDER: ExpressionName[] = [
  "neutral",
  "happy",
  "laughing",
  "sad",
  "angry",
  "surprised",
  "fearful",
  "disgusted",
  "sleeping",
];

export const EXPRESSION_MAP: Record<ExpressionName, ExpressionDisplay> = {
  neutral:   { label: "Neutral",   emoji: "😐", color: "hsl(210, 15%, 60%)" },
  happy:     { label: "Smiling",   emoji: "😊", color: "hsl(45, 90%, 55%)" },
  sad:       { label: "Frowning",  emoji: "😢", color: "hsl(220, 60%, 55%)" },
  angry:     { label: "Angry",     emoji: "😠", color: "hsl(0, 70%, 55%)" },
  fearful:   { label: "Fearful",   emoji: "😨", color: "hsl(270, 50%, 55%)" },
  disgusted: { label: "Disgusted", emoji: "🤢", color: "hsl(90, 40%, 45%)" },
  surprised: { label: "Surprised", emoji: "😲", color: "hsl(30, 80%, 55%)" },
  laughing:  { label: "Laughing",  emoji: "😂", color: "hsl(50, 95%, 50%)" },
  sleeping:  { label: "Sleeping",  emoji: "😴", color: "hsl(240, 40%, 55%)" },
};

/** Friendly label for the eyes-closed state */
export const EYES_CLOSED_DISPLAY = { label: "Eyes Closed", emoji: "😴" };

/** Friendly label for the eyebrows-raised state */
export const EYEBROWS_RAISED_DISPLAY = { label: "Eyebrows Raised", emoji: "🤨" };

/** Friendly label for the mouth-open state */
export const MOUTH_OPEN_DISPLAY = { label: "Mouth Open", emoji: "😮" };
