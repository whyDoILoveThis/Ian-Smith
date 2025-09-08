// useSecretUnlock.ts
import { useEffect, useRef, useState } from "react";

type Stage = 0 | 1 | 2 | 3;

interface UseSecretUnlock {
  trigger: () => void;
  unlocked: boolean;
  stage: Stage;
  clicks: number;
  accessGranted: boolean;
  isVisible: boolean;
  reset: () => void;
  setLocked: (val: boolean) => void;
  countdownSeconds: number; // seconds remaining for any active countdown (0 = none)
  countdownProgress: number; // 0..1 progress (1 means timeout reached)
}

export const useSecretUnlock = (
  initiallyLocked = false,
  onUnlock?: () => void
): UseSecretUnlock => {
  const [stage, setStage] = useState<Stage>(0);
  const [clicks, setClicks] = useState(0);
  const [accessGranted, setAccessGranted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const lockedRef = useRef(initiallyLocked);

  // countdown state
  const [countdownSeconds, setCountdownSeconds] = useState(0);
  const [countdownProgress, setCountdownProgress] = useState(0);

  // internal refs
  const activeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );
  const countdownTargetRef = useRef<number | null>(null);
  const countdownTotalRef = useRef<number | null>(null);

  const stage1StartTimeRef = useRef<number | null>(null);

  // helper to clear active countdown/interval
  const clearCountdown = () => {
    if (activeTimeoutRef.current) {
      clearTimeout(activeTimeoutRef.current);
      activeTimeoutRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    countdownTargetRef.current = null;
    countdownTotalRef.current = null;
    setCountdownSeconds(0);
    setCountdownProgress(0);
  };

  // start a countdown that runs for durationMs then calls cb
  const startCountdown = (durationMs: number, cb: () => void) => {
    clearCountdown();
    const target = Date.now() + durationMs;
    countdownTargetRef.current = target;
    countdownTotalRef.current = durationMs;
    // set immediate values
    const remaining0 = Math.max(0, target - Date.now());
    setCountdownSeconds(Math.ceil(remaining0 / 1000));
    setCountdownProgress(1 - remaining0 / durationMs);

    // set timeout for final callback
    activeTimeoutRef.current = setTimeout(() => {
      clearCountdown();
      cb();
    }, durationMs);

    // interval tick to update countdown values (250ms for smooth progress)
    countdownIntervalRef.current = setInterval(() => {
      if (!countdownTargetRef.current || !countdownTotalRef.current) return;
      const rem = Math.max(0, countdownTargetRef.current - Date.now());
      setCountdownSeconds(Math.ceil(rem / 1000));
      setCountdownProgress(Math.min(1, 1 - rem / countdownTotalRef.current));
      if (rem <= 0) {
        // will be cleared by the timeout callback shortly
        // but clear here to keep UI responsive
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
      }
    }, 250);
  };

  // reset everything
  const reset = () => {
    setStage(0);
    setClicks(0);
    setAccessGranted(false);
    setIsVisible(false);
    stage1StartTimeRef.current = null;
    clearCountdown();
  };

  const trigger = () => {
    if (lockedRef.current) return;

    if (stage === 0) {
      setClicks((prev) => prev + 1);
    }

    if (stage === 1) {
      const now = Date.now();
      const waitedEnough =
        stage1StartTimeRef.current && now - stage1StartTimeRef.current >= 5000;

      if (!waitedEnough) {
        // user clicked too early — abort sequence
        reset();
        return;
      }

      setClicks((prev) => prev + 1);
    }

    if (stage === 2) {
      setStage(3);
      setIsVisible(true);
      // clear any countdown so UI shows no timer while fully unlocked
      clearCountdown();
    }
  };

  // watch clicks and stage transitions
  useEffect(() => {
    // stage 0 logic
    if (stage === 0 && clicks === 1) {
      // user has started clicking sequence; reset back to zero after 2s if they stop
      startCountdown(2000, reset);
    }

    if (stage === 0 && clicks >= 5) {
      // got the first milestone -> enter stage 1 (the waiting stage)
      setStage(1);
      setClicks(0);
      clearCountdown();
      stage1StartTimeRef.current = Date.now();
      // Now user must wait >=5s before proceeding (we'll not start a countdown here,
      // but we'll start a visible countdown showing time until they can click again)
      // For UX we present a 5s wait timer that ends when user can click
      startCountdown(5000, () => {
        // when the 5s wait ends we simply clear the timer — the user can now start clicking
        // We don't auto-advance; trigger() checks the elapsed time.
        clearCountdown();
      });
    }

    // guard: if in stage 1 and clicks === 0, reset after a longer idle (9s)
    if (stage === 1 && clicks === 0) {
      startCountdown(9000, reset);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clicks, stage]);

  // secondary stage 1 click logic
  useEffect(() => {
    if (stage === 1 && clicks === 1) {
      // after first click in stage 1, if user stalls, give them 4s to continue
      // (this mirrors previous behavior)
      startCountdown(4000, reset);
    }

    if (stage === 1 && clicks >= 8) {
      // reached stage 2 (pre-unlock)
      setStage(2);
      setClicks(0);
      clearCountdown();
      setAccessGranted(true);
      if (onUnlock) onUnlock();

      // keep access for 5s, then revoke and reset
      startCountdown(5000, () => {
        setAccessGranted(false);
        reset();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clicks, stage, onUnlock]);

  // clear timers when unmount
  useEffect(() => {
    return () => {
      clearCountdown();
    };
  }, []);

  return {
    trigger,
    unlocked: stage === 3,
    stage,
    clicks,
    accessGranted,
    isVisible,
    reset,
    setLocked: (val: boolean) => {
      lockedRef.current = val;
    },

    // NEW
    countdownSeconds,
    countdownProgress,
  };
};
