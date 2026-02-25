// ─── Detection engine ─────────────────────────────────────────────
// Wraps face-api.js to provide a clean detection interface.
// Loads models once, then exposes a single `detect()` call
// that returns our normalized DetectionResult.
//
// PERFORMANCE: We use TinyFaceDetector (fastest model, ~6MB total)
// instead of SSD MobileNet (~20MB) — perfectly adequate for single
// face selfie-style detection and significantly reduces load time.

import * as faceapi from "face-api.js";
import { DetectionResult, RawExpressionName, ExpressionResult } from "../types";

let modelsLoaded = false;

/**
 * Load face-api.js models from /models.
 * Safe to call multiple times — only loads once.
 */
export async function loadModels(): Promise<void> {
  if (modelsLoaded) return;

  const MODEL_URL = "/models";

  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
  ]);

  modelsLoaded = true;
}

/** Options tuned for real-time selfie detection */
const DETECTOR_OPTIONS = new faceapi.TinyFaceDetectorOptions({
  inputSize: 320,    // 320 gives much better landmark precision than 224, still fast enough for real-time.
  scoreThreshold: 0.4, // Lower threshold catches more faces but may have false positives.
});

// ── Temporal smoothing for eye state ──────────────────────────────
// Single-frame EAR is noisy — a 3-frame rolling history prevents
// jitter and catches real blinks/closures more reliably.
const EAR_HISTORY_SIZE = 3;
const earHistory: number[] = [];

function pushEAR(value: number): number {
  earHistory.push(value);
  if (earHistory.length > EAR_HISTORY_SIZE) earHistory.shift();
  // Return the average of the history window
  return earHistory.reduce((a, b) => a + b, 0) / earHistory.length;
}

// ── Blink detection state machine ─────────────────────────────────
// A blink is: eyes open → eyes closed → eyes open, all within
// 100–500ms. We track the state transitions and timing.
let blinkState: "open" | "closing" | "closed" = "open";
let eyeCloseTimestamp = 0;
let blinkCooldown = 0; // Prevent double-firing

function detectBlink(eyesClosed: boolean, now: number): boolean {
  // Cooldown: don't fire again within 300ms of last blink
  if (now - blinkCooldown < 300) {
    if (!eyesClosed) blinkState = "open";
    return false;
  }

  switch (blinkState) {
    case "open":
      if (eyesClosed) {
        blinkState = "closed";
        eyeCloseTimestamp = now;
      }
      return false;

    case "closed":
      if (!eyesClosed) {
        // Eyes just opened — check if the closure duration was blink-like
        const duration = now - eyeCloseTimestamp;
        blinkState = "open";
        if (duration > 80 && duration < 600) {
          blinkCooldown = now;
          return true; // Blink detected!
        }
      } else if (now - eyeCloseTimestamp > 600) {
        // Held too long — this is an intentional close, not a blink
        blinkState = "open";
      }
      return false;

    default:
      blinkState = "open";
      return false;
  }
}

/**
 * Analyze eye openness from 68-point facial landmarks.
 *
 * Uses the Eye Aspect Ratio (EAR) formula:
 *   EAR = (|p2-p6| + |p3-p5|) / (2 * |p1-p4|)
 *
 * When EAR drops below ~0.2, eyes are considered closed.
 * This is a well-established technique from the computer vision literature.
 */
function computeEAR(eyePoints: faceapi.Point[]): number {
  const dist = (a: faceapi.Point, b: faceapi.Point) =>
    Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);

  const vertical1 = dist(eyePoints[1], eyePoints[5]);
  const vertical2 = dist(eyePoints[2], eyePoints[4]);
  const horizontal = dist(eyePoints[0], eyePoints[3]);

  // Prevent division by zero
  if (horizontal === 0) return 1;
  return (vertical1 + vertical2) / (2 * horizontal);
}

/**
 * Detect eyebrow raise by comparing eyebrow height relative to eye center.
 * When eyebrows are raised, the ratio between eyebrow-to-eye distance
 * and inter-eye distance increases noticeably.
 */
function detectEyebrowRaise(landmarks: faceapi.FaceLandmarks68): boolean {
  const positions = landmarks.positions;

  // Left eyebrow: points 17-21, Left eye: points 36-41
  // Right eyebrow: points 22-26, Right eye: points 42-47
  const leftBrowY = (positions[19].y + positions[20].y) / 2;
  const leftEyeY = (positions[37].y + positions[38].y) / 2;
  const rightBrowY = (positions[23].y + positions[24].y) / 2;
  const rightEyeY = (positions[43].y + positions[44].y) / 2;

  // Inter-eye distance for normalization (scale-independent)
  const eyeDistance = Math.abs(positions[39].x - positions[42].x);
  if (eyeDistance === 0) return false;

  const leftRatio = (leftEyeY - leftBrowY) / eyeDistance;
  const rightRatio = (rightEyeY - rightBrowY) / eyeDistance;
  const avgRatio = (leftRatio + rightRatio) / 2;

  // Threshold determined experimentally — raise is typically > 0.38
  return avgRatio > 0.38;
}

/**
 * Detect mouth openness via Mouth Aspect Ratio (MAR).
 * Uses the inner lip landmarks (points 61-67) for accuracy.
 *
 * MAR = (|p62-p66| + |p63-p65|) / (2 * |p61-p64|)
 *
 * When MAR > ~0.35, the mouth is considered open.
 * Combined with a high "happy" score, this indicates laughing.
 */
function computeMAR(landmarks: faceapi.FaceLandmarks68): number {
  const positions = landmarks.positions;

  const dist = (a: faceapi.Point, b: faceapi.Point) =>
    Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);

  // Inner lip: top=62,63 bottom=66,65 corners=61,64 (0-indexed)
  const vertical1 = dist(positions[62], positions[66]);
  const vertical2 = dist(positions[63], positions[65]);
  const horizontal = dist(positions[61], positions[64]);

  if (horizontal === 0) return 0;
  return (vertical1 + vertical2) / (2 * horizontal);
}

/**
 * Run a single detection cycle on a video element.
 * Returns null if no face is detected.
 *
 * PERFORMANCE NOTE: This function is designed to be called from
 * requestAnimationFrame. It does NOT schedule its own loop —
 * the caller controls the timing.
 */
export async function detect(
  video: HTMLVideoElement
): Promise<DetectionResult | null> {
  if (!modelsLoaded) return null;
  if (video.readyState < 2) return null; // Video not ready yet

  const detection = await faceapi
    .detectSingleFace(video, DETECTOR_OPTIONS)
    .withFaceLandmarks()
    .withFaceExpressions();

  if (!detection) {
    return {
      dominant: { name: "neutral", confidence: 0 },
      all: [],
      eyesClosed: false,
      eyebrowsRaised: false,
      mouthOpen: false,
      blinkDetected: false,
      faceDetected: false,
      timestamp: performance.now(),
    };
  }

  // ── Build sorted raw expression list ──────────────────────────
  const rawExpressions = detection.expressions;
  const rawAll: ExpressionResult[] = (
    Object.entries(rawExpressions) as [RawExpressionName, number][]
  )
    .map(([name, confidence]) => ({ name, confidence }))
    .sort((a, b) => b.confidence - a.confidence);

  // ── Eye analysis via landmark EAR ─────────────────────────────
  // Uses average of both eyes + temporal smoothing for reliability.
  // At webcam resolution, individual eye EAR is noisy — averaging
  // and smoothing over 3 frames dramatically reduces false negatives.
  const landmarks = detection.landmarks;
  const leftEye = landmarks.getLeftEye();
  const rightEye = landmarks.getRightEye();
  const leftEAR = computeEAR(leftEye);
  const rightEAR = computeEAR(rightEye);
  const avgEAR = (leftEAR + rightEAR) / 2;
  const smoothedEAR = pushEAR(avgEAR);
  // 0.28 threshold is more forgiving than the textbook 0.2 —
  // necessary because TinyFaceDetector landmarks are less precise
  // than dlib/mediapipe, and webcam resolution adds noise.
  const eyesClosed = smoothedEAR < 0.28;

  // ── Blink detection ───────────────────────────────────────────
  // Uses RAW (unsmoothed) EAR so the state machine sees the
  // instantaneous eye state. The 3-frame smoothing delays the
  // signal too much for fast blinks — by the time the smoothed
  // value drops, the eyes are already reopening.
  const rawEyesClosed = avgEAR < 0.28;
  const blinkDetected = detectBlink(rawEyesClosed, performance.now());

  // ── Mouth analysis via MAR ────────────────────────────────────
  const mar = computeMAR(landmarks);
  const mouthOpen = mar > 0.35;

  // ── Eyebrow raise detection ───────────────────────────────────
  const eyebrowsRaised = detectEyebrowRaise(landmarks);

  // ── Composite expression inference ────────────────────────────
  // Laughing: happy expression + mouth open (big grin with open mouth)
  const happyScore = rawExpressions.happy ?? 0;
  const laughingConfidence = mouthOpen && happyScore > 0.5
    ? Math.min(happyScore * 1.1, 1) // Slight boost — laughing is a strong happy
    : happyScore > 0.7 && mar > 0.25
    ? happyScore * 0.8 // Moderate laugh even with partly open mouth
    : 0;

  // Sleeping: eyes closed + neutral/calm expression (not surprised with eyes closed)
  const neutralScore = rawExpressions.neutral ?? 0;
  const sadScore = rawExpressions.sad ?? 0;
  const sleepingConfidence = eyesClosed
    ? Math.min((neutralScore + sadScore * 0.5) * 1.1, 1)
    : 0;

  // ── Surprise correction ───────────────────────────────────────
  // face-api.js often misreads an open mouth as surprise.
  // Real surprise involves multiple cues: wide eyes, raised brows,
  // AND open mouth together. If only the mouth is open without
  // eyebrow raise, the surprise score is heavily penalized.
  let correctedSurprised = rawExpressions.surprised ?? 0;
  if (mouthOpen && !eyebrowsRaised) {
    // Mouth open alone — likely just talking/yawning, not surprised
    correctedSurprised *= 0.25;
  } else if (!mouthOpen && !eyebrowsRaised) {
    // Neither mouth nor brows — mild penalty
    correctedSurprised *= 0.6;
  }

  // Build final expression list with composites and corrections
  const all: ExpressionResult[] = [
    ...rawAll.map((e) =>
      e.name === "surprised" ? { ...e, confidence: correctedSurprised } : e
    ),
    { name: "laughing" as const, confidence: laughingConfidence },
    { name: "sleeping" as const, confidence: sleepingConfidence },
  ].sort((a, b) => b.confidence - a.confidence);

  const dominant = all[0];

  return {
    dominant,
    all,
    eyesClosed,
    eyebrowsRaised,
    mouthOpen,
    blinkDetected,
    faceDetected: true,
    timestamp: performance.now(),
  };
}
