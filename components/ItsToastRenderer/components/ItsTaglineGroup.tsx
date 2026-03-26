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
> = ({ children, intervals, className, _onComplete }) => {
  const childArray = Children.toArray(children).filter(isValidElement);
  const childCount = childArray.length;

  const [activeIndex, setActiveIndex] = useState(0);
  const [showChild, setShowChild] = useState(true);

  const activeIndexRef = useRef(activeIndex);
  activeIndexRef.current = activeIndex;

  const onCompleteRef = useRef(_onComplete);
  onCompleteRef.current = _onComplete;

  /* Timer — hide current tagline after its interval elapses */
  useEffect(() => {
    if (!showChild || activeIndex >= childCount) return;
    const duration = intervals[activeIndex] ?? 2000;
    const timer = setTimeout(() => setShowChild(false), duration);
    return () => clearTimeout(timer);
  }, [activeIndex, showChild, intervals, childCount]);

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
