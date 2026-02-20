import { useCallback, useRef } from "react";
import { BASE_RANGE_DAYS, MS_PER_DAY } from "../lib/constants";

/**
 * useTimelineInertia
 *
 * Shared hook that provides mouse + touch drag-panning with smooth
 * inertia / momentum scrolling for any timeline container.
 *
 * Returns React event handlers you attach to the container element
 * and a `stopInertia` helper for external callers that need to
 * cancel a running animation (e.g. when the user starts a new gesture).
 */
export function useTimelineInertia(
  /** current zoom scale */
  scale: number,
  /** current container width in px */
  containerWidth: number,
  /** state setter for the centre millisecond */
  setCenterMs: React.Dispatch<React.SetStateAction<number>>,
) {
  const isPanningRef = useRef(false);
  const lastXRef = useRef(0);
  const velocityRef = useRef(0);
  const inertiaRafRef = useRef(0);
  const inertiaActiveRef = useRef(false);

  /* ---- helpers ---- */

  const getMsPerPx = useCallback(() => {
    const visibleMs = (BASE_RANGE_DAYS * MS_PER_DAY) / scale;
    return visibleMs / containerWidth;
  }, [scale, containerWidth]);

  const stopInertia = useCallback(() => {
    inertiaActiveRef.current = false;
    if (inertiaRafRef.current) {
      cancelAnimationFrame(inertiaRafRef.current);
      inertiaRafRef.current = 0;
    }
  }, []);

  const startInertia = useCallback(() => {
    const initialV = velocityRef.current;
    if (Math.abs(initialV) <= 0.5) return;

    inertiaActiveRef.current = true;
    const friction = 0.92;
    const minV = 0.15;

    const step = () => {
      if (!inertiaActiveRef.current) return;
      velocityRef.current *= friction;
      const msPerPx = getMsPerPx();
      const deltaMs = velocityRef.current * msPerPx;
      setCenterMs((c) => c - deltaMs);
      if (Math.abs(velocityRef.current) <= minV) {
        inertiaActiveRef.current = false;
        return;
      }
      inertiaRafRef.current = requestAnimationFrame(step);
    };
    inertiaRafRef.current = requestAnimationFrame(step);
  }, [getMsPerPx, setCenterMs]);

  /* ---- pan move (shared by mouse + touch) ---- */

  const applyDx = useCallback(
    (dx: number) => {
      const msPerPx = getMsPerPx();
      setCenterMs((c) => c - dx * msPerPx);
      velocityRef.current = dx;
    },
    [getMsPerPx, setCenterMs],
  );

  /* ---- event handlers ---- */

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      stopInertia();
      isPanningRef.current = true;
      lastXRef.current = e.clientX;
      velocityRef.current = 0;
    },
    [stopInertia],
  );

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isPanningRef.current) return;
      const dx = e.clientX - lastXRef.current;
      lastXRef.current = e.clientX;
      applyDx(dx);
    },
    [applyDx],
  );

  const onMouseUp = useCallback(() => {
    if (!isPanningRef.current) return;
    isPanningRef.current = false;
    startInertia();
  }, [startInertia]);

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length !== 1) return;
      stopInertia();
      isPanningRef.current = true;
      lastXRef.current = e.touches[0].clientX;
      velocityRef.current = 0;
    },
    [stopInertia],
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isPanningRef.current || e.touches.length !== 1) return;
      const tx = e.touches[0].clientX;
      const dx = tx - lastXRef.current;
      lastXRef.current = tx;
      applyDx(dx);
    },
    [applyDx],
  );

  const onTouchEnd = useCallback(() => {
    if (!isPanningRef.current) return;
    isPanningRef.current = false;
    startInertia();
  }, [startInertia]);

  return {
    /** Attach these to the container element */
    handlers: {
      onMouseDown,
      onMouseMove,
      onMouseUp,
      onMouseLeave: onMouseUp,
      onTouchStart,
      onTouchMove,
      onTouchEnd,
    },
    /** Cancel any running inertia animation */
    stopInertia,
    /** Kick off inertia from current velocity */
    startInertia,
    /** Refs exposed for advanced consumers (e.g. TimelineRoot pointer-lock) */
    isPanningRef,
    lastXRef,
    velocityRef,
    inertiaActiveRef,
    inertiaRafRef,
  } as const;
}
