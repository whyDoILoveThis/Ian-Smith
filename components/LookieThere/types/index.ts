// ─── Expression types for LookieThere ─────────────────────────────
// Maps face-api.js raw expression names to our display-friendly format

/** Raw expressions output by face-api.js */
export type RawExpressionName =
  | "neutral"
  | "happy"
  | "sad"
  | "angry"
  | "fearful"
  | "disgusted"
  | "surprised";

/** Extended expressions including composite detections */
export type ExpressionName = RawExpressionName | "laughing" | "sleeping";

/** A single detected expression with its confidence score */
export interface ExpressionResult {
  name: ExpressionName;
  confidence: number; // 0–1
}

/** The full detection result passed to the UI each cycle */
export interface DetectionResult {
  /** The dominant expression (may be a composite like laughing/sleeping) */
  dominant: ExpressionResult;
  /** All expressions sorted by confidence (descending), includes composites */
  all: ExpressionResult[];
  /** Whether the person's eyes appear closed (both eyes) */
  eyesClosed: boolean;
  /** Whether eyebrows appear raised */
  eyebrowsRaised: boolean;
  /** Whether mouth is open */
  mouthOpen: boolean;
  /** Whether a blink was just detected this frame */
  blinkDetected: boolean;
  /** Whether a face was detected at all */
  faceDetected: boolean;
  /** Timestamp of this detection */
  timestamp: number;
}

/** Camera permission state */
export type CameraPermission = "prompt" | "granted" | "denied" | "error";

/** Display-friendly mapping for an expression */
export interface ExpressionDisplay {
  label: string;
  emoji: string;
  color: string;
}
