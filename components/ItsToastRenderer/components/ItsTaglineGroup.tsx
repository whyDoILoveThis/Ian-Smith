"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  Children,
  isValidElement,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type {
  ItsTaglineGroupProps,
  ItsTaglineGroupInternalProps,
} from "../types";
import {
  groupWrapperVariants,
  groupWrapperTransition,
} from "../utils/animations";

/**
 * Groups multiple `ItsTagline` children and renders them one at a time.
 *
 * `intervals[i]` controls how long tagline _i_ stays visible (in ms).
 * After the last tagline exits, `_onComplete` is called so the parent
 * `ItsTaglineRenderer` can advance to its next child.
 */
const ItsTaglineGroup: React.FC<
  ItsTaglineGroupProps & ItsTaglineGroupInternalProps
> = ({
  children,
  intervals,
  className,
  dontCloseIfHovered = false,
  _onComplete,
}) => {
  const childArray = Children.toArray(children).filter(isValidElement);
  const childCount = childArray.length;

  const [activeIndex, setActiveIndex] = useState(0);
  const [showChild, setShowChild] = useState(true);

  const activeIndexRef = useRef(activeIndex);
  activeIndexRef.current = activeIndex;

  const onCompleteRef = useRef(_onComplete);
  onCompleteRef.current = _onComplete;

  const [hovered, setHovered] = useState(false);
  const remainingRef = useRef(intervals[0] ?? 2000);
  const timerStartRef = useRef(0);

  // Reset remaining time when advancing to a new tagline
  const prevActiveRef = useRef(activeIndex);
  if (prevActiveRef.current !== activeIndex) {
    remainingRef.current = intervals[activeIndex] ?? 2000;
    prevActiveRef.current = activeIndex;
  }

  /* Timer — hide current tagline after its interval elapses (pauses on hover) */
  useEffect(() => {
    if (!showChild || activeIndex >= childCount) return;
    if (dontCloseIfHovered && hovered) return;
    const ms = dontCloseIfHovered
      ? remainingRef.current
      : (intervals[activeIndex] ?? 2000);
    timerStartRef.current = Date.now();
    const timer = setTimeout(() => setShowChild(false), ms);
    return () => {
      if (dontCloseIfHovered) {
        const elapsed = Date.now() - timerStartRef.current;
        remainingRef.current = Math.max(0, remainingRef.current - elapsed);
      }
      clearTimeout(timer);
    };
  }, [
    activeIndex,
    showChild,
    intervals,
    childCount,
    dontCloseIfHovered,
    hovered,
  ]);

  /* After exit animation completes, advance or signal done */
  const handleExitComplete = useCallback(() => {
    const nextIndex = activeIndexRef.current + 1;
    if (nextIndex >= childCount) {
      onCompleteRef.current?.();
      return;
    }
    setActiveIndex(nextIndex);
    setShowChild(true);
  }, [childCount]);

  const activeChild =
    showChild && activeIndex < childCount ? childArray[activeIndex] : null;

  return (
    <motion.div
      variants={groupWrapperVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={groupWrapperTransition}
      onMouseEnter={dontCloseIfHovered ? () => setHovered(true) : undefined}
      onMouseLeave={dontCloseIfHovered ? () => setHovered(false) : undefined}
      className={cn("relative w-full h-full", className)}
    >
      <AnimatePresence mode="wait" onExitComplete={handleExitComplete}>
        {activeChild &&
          React.cloneElement(activeChild as React.ReactElement<any>, {
            key: `group-tagline-${activeIndex}`,
          })}
      </AnimatePresence>
    </motion.div>
  );
};

ItsTaglineGroup.displayName = "ItsTaglineGroup";
export default ItsTaglineGroup;
