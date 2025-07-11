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

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const accessTimerRef = useRef<NodeJS.Timeout | null>(null);
  const stage1StartTimeRef = useRef<number | null>(null);

  const reset = () => {
    setStage(0);
    setClicks(0);
    setAccessGranted(false);
    setIsVisible(false);
    stage1StartTimeRef.current = null;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (accessTimerRef.current) clearTimeout(accessTimerRef.current);
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
        reset();
        return;
      }

      setClicks((prev) => prev + 1);
    }

    if (stage === 2) {
      setStage(3);
      setIsVisible(true);
      if (accessTimerRef.current) clearTimeout(accessTimerRef.current);
    }
  };

  useEffect(() => {
    if (stage === 0 && clicks === 1) {
      timeoutRef.current = setTimeout(reset, 2000);
    }

    if (stage === 0 && clicks >= 5) {
      setStage(1);
      setClicks(0);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      stage1StartTimeRef.current = Date.now();
    }

    if (stage === 1 && clicks === 0) {
      timeoutRef.current = setTimeout(reset, 9000);
    }
  }, [clicks, stage]);

  useEffect(() => {
    if (stage === 1 && clicks === 1) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(reset, 4000);
    }

    if (stage === 1 && clicks >= 8) {
      setStage(2);
      setClicks(0);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setAccessGranted(true);
      if (onUnlock) onUnlock();

      accessTimerRef.current = setTimeout(() => {
        setAccessGranted(false);
        reset();
      }, 5000);
    }
  }, [clicks, stage, onUnlock]);

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
  };
};
