"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  Children,
  isValidElement,
} from "react";
import { AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ItsTaglineRendererProps } from "../types";

/**
 * Master orchestrator — renders one child at a time (either an `ItsTagline`
 * or an `ItsTaglineGroup`) with configurable delays between them.
 *
 * Fills its parent via `absolute inset-0` by default (override with `className`).
 *
 * ### Lifecycle
 * 1. Wait `intervals[0]` ms → show child 0
 * 2. Child 0 finishes (duration elapses / group exhausts its taglines)
 * 3. Exit animation plays
 * 4. Wait `intervals[1]` ms → show child 1
 * 5. …repeat until the end (or loop back to 0 if `loop` is true)
 */
/** Fisher-Yates shuffle (returns a new array). */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const ItsTaglineRenderer: React.FC<ItsTaglineRendererProps> = ({
  children,
  intervals,
  className,
  loop = false,
  randomizeOrder = false,
  triggers,
  onComplete,
}) => {
  const childArray = useMemo(
    () => Children.toArray(children).filter(isValidElement),
    [children],
  );
  const childCount = childArray.length;

  /* order[i] maps the current "slot" to the original child index */
  const [order, setOrder] = useState<number[]>(() =>
    Array.from({ length: childCount }, (_, i) => i),
  );
  const [activeSlot, setActiveSlot] = useState(0);
  const [isShowing, setIsShowing] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const activeSlotRef = useRef(activeSlot);
  activeSlotRef.current = activeSlot;

  const orderRef = useRef(order);
  orderRef.current = order;

  const onCompleteExtRef = useRef(onComplete);
  onCompleteExtRef.current = onComplete;

  /* Keep order length in sync if children change */
  useEffect(() => {
    setOrder((prev) =>
      prev.length === childCount
        ? prev
        : Array.from({ length: childCount }, (_, i) => i),
    );
  }, [childCount]);

  /* ── Delay before showing each child ── */
  useEffect(() => {
    if (isShowing || isDone || activeSlot >= childCount) return;
    const originalIdx = order[activeSlot];

    // Check if this child has a trigger override
    const trigger = triggers?.[originalIdx];
    const useTrigger = trigger !== undefined && trigger !== 0;

    if (useTrigger) {
      // Trigger mode: show immediately when true, otherwise wait
      if (trigger === true) {
        setIsShowing(true);
      }
      // If trigger is false, do nothing — the effect will re-run when triggers changes
      return;
    }

    // Interval mode: use the timeout
    const delay = intervals[originalIdx] ?? 0;
    const timer = setTimeout(() => setIsShowing(true), delay);
    return () => clearTimeout(timer);
  }, [isShowing, isDone, activeSlot, order, intervals, triggers, childCount]);

  /* ── Child signals it finished displaying ── */
  const handleChildComplete = useCallback(() => {
    setIsShowing(false);
  }, []);

  /* ── Exit animation of child completes → advance ── */
  const handleExitComplete = useCallback(() => {
    const nextSlot = activeSlotRef.current + 1;

    if (nextSlot >= childCount) {
      if (loop) {
        if (randomizeOrder) {
          setOrder(shuffle(orderRef.current));
        }
        setActiveSlot(0);
      } else {
        setIsDone(true);
        onCompleteExtRef.current?.();
      }
      return;
    }

    setActiveSlot(nextSlot);
  }, [childCount, loop, randomizeOrder]);

  /* ── Build the active child with injected _onComplete ── */
  const originalIdx = order[activeSlot];
  const activeChild =
    isShowing && activeSlot < childCount
      ? React.cloneElement(childArray[originalIdx] as React.ReactElement<any>, {
          key: `renderer-child-${originalIdx}-slot-${activeSlot}`,
          _onComplete: handleChildComplete,
        })
      : null;

  return (
    <div className={cn("absolute inset-0 pointer-events-none", className)}>
      <AnimatePresence mode="wait" onExitComplete={handleExitComplete}>
        {activeChild}
      </AnimatePresence>
    </div>
  );
};

ItsTaglineRenderer.displayName = "ItsTaglineRenderer";
export default ItsTaglineRenderer;
