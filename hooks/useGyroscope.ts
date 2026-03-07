"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * useGyroscope — cross-platform (Android + iOS) relative orientation tracking.
 *
 * Uses DeviceOrientationEvent (absolute where available, fallback to relative).
 * Tracks cumulative angular displacement from a "zero" reference captured at start.
 * Quantizes movement into discrete steps of `stepDeg` and fires `onStep` for each.
 *
 * Designed as a generic movement-measurement provider:
 *   - In simulator mode: moves the simulated dish
 *   - In real-world mode: same hook, same output, phone mounted to dish
 *
 * iOS requires an explicit permission request (DeviceOrientationEvent.requestPermission).
 * Android just works.
 */

export type StepDirection = "up" | "down" | "left" | "right";

interface UseGyroscopeOptions {
  /** Degrees per discrete step (should match learner's degreesPerCell) */
  stepDeg: number;
  /** Called each time accumulated rotation crosses a step boundary */
  onStep: (direction: StepDirection) => void;
  /** Whether gyro tracking is currently active */
  enabled: boolean;
}

interface GyroState {
  /** Whether the browser supports device orientation */
  supported: boolean;
  /** Whether iOS permission has been granted (always true on Android) */
  permissionGranted: boolean;
  /** Whether we need to ask for iOS permission */
  needsPermission: boolean;
  /** Whether actively receiving gyro data */
  active: boolean;
  /** Cumulative azimuth delta from zero point (degrees) */
  deltaAz: number;
  /** Cumulative elevation delta from zero point (degrees) */
  deltaEl: number;
  /** Request permission (iOS only — must be called from a user gesture) */
  requestPermission: () => Promise<boolean>;
  /** Reset the zero reference point to current orientation */
  resetZero: () => void;
}

export function useGyroscope({
  stepDeg,
  onStep,
  enabled,
}: UseGyroscopeOptions): GyroState {
  const [supported, setSupported] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [needsPermission, setNeedsPermission] = useState(false);
  const [active, setActive] = useState(false);
  const [deltaAz, setDeltaAz] = useState(0);
  const [deltaEl, setDeltaEl] = useState(0);

  // Refs for tracking without re-renders on every sensor event
  const lastAlphaRef = useRef<number | null>(null);
  const lastBetaRef = useRef<number | null>(null);
  // Accumulated degrees since last emitted step (fractional remainder)
  const accAzRef = useRef(0);
  const accElRef = useRef(0);
  // Total accumulated for display
  const totalAzRef = useRef(0);
  const totalElRef = useRef(0);

  // Keep callbacks current without re-subscribing the listener
  const onStepRef = useRef(onStep);
  onStepRef.current = onStep;
  const stepDegRef = useRef(stepDeg);
  stepDegRef.current = stepDeg;

  // Detect support on mount
  useEffect(() => {
    const hasOrientation = typeof DeviceOrientationEvent !== "undefined";
    setSupported(hasOrientation);

    const doe = DeviceOrientationEvent as any;
    if (hasOrientation && typeof doe.requestPermission === "function") {
      // iOS 13+ — needs user gesture to grant
      setNeedsPermission(true);
      setPermissionGranted(false);
    } else if (hasOrientation) {
      // Android / desktop — no permission needed
      setNeedsPermission(false);
      setPermissionGranted(true);
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    const doe = DeviceOrientationEvent as any;
    if (typeof doe.requestPermission !== "function") {
      setPermissionGranted(true);
      return true;
    }
    try {
      const result = await doe.requestPermission();
      const granted = result === "granted";
      setPermissionGranted(granted);
      if (granted) setNeedsPermission(false);
      return granted;
    } catch {
      setPermissionGranted(false);
      return false;
    }
  }, []);

  const resetZero = useCallback(() => {
    lastAlphaRef.current = null;
    lastBetaRef.current = null;
    accAzRef.current = 0;
    accElRef.current = 0;
    totalAzRef.current = 0;
    totalElRef.current = 0;
    setDeltaAz(0);
    setDeltaEl(0);
  }, []);

  // Main orientation listener
  useEffect(() => {
    if (!enabled || !supported || !permissionGranted) {
      setActive(false);
      return;
    }

    function handleOrientation(e: DeviceOrientationEvent) {
      // alpha = compass heading 0..360 (yaw), beta = tilt front/back -180..180 (pitch)
      const alpha = e.alpha;
      const beta = e.beta;
      if (alpha === null || beta === null) return;

      // First reading — capture as zero reference
      if (lastAlphaRef.current === null || lastBetaRef.current === null) {
        lastAlphaRef.current = alpha;
        lastBetaRef.current = beta;
        setActive(true);
        return;
      }

      // Delta since last reading
      let dAlpha = alpha - lastAlphaRef.current;
      if (dAlpha > 180) dAlpha -= 360;
      if (dAlpha < -180) dAlpha += 360;

      let dBeta = beta - lastBetaRef.current;
      // Beta doesn't wrap (range -180..180) but large jumps can happen at gimbal edge
      if (Math.abs(dBeta) > 90) dBeta = 0; // discard gimbal-lock spike

      lastAlphaRef.current = alpha;
      lastBetaRef.current = beta;

      // Accumulate
      accAzRef.current += dAlpha;
      accElRef.current += dBeta;
      totalAzRef.current += dAlpha;
      totalElRef.current += dBeta;

      setDeltaAz(totalAzRef.current);
      setDeltaEl(totalElRef.current);

      // Quantize into discrete steps
      const step = stepDegRef.current;
      const cb = onStepRef.current;

      // Azimuth: positive alpha rotation = clockwise = dish rotates right
      while (accAzRef.current >= step) {
        accAzRef.current -= step;
        cb("right");
      }
      while (accAzRef.current <= -step) {
        accAzRef.current += step;
        cb("left");
      }

      // Elevation: positive beta = phone tilts forward = dish tilts up
      while (accElRef.current >= step) {
        accElRef.current -= step;
        cb("up");
      }
      while (accElRef.current <= -step) {
        accElRef.current += step;
        cb("down");
      }
    }

    window.addEventListener("deviceorientation", handleOrientation, true);

    return () => {
      window.removeEventListener("deviceorientation", handleOrientation, true);
      setActive(false);
    };
  }, [enabled, supported, permissionGranted]);

  return {
    supported,
    permissionGranted,
    needsPermission,
    active,
    deltaAz,
    deltaEl,
    requestPermission,
    resetZero,
  };
}
