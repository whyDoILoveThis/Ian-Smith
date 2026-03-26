"use client";

import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ItsTaglineProps, ItsTaglineInternalProps } from "../types";
import { taglineVariants, taglineTransition } from "../utils/animations";

/**
 * Atomic tagline unit — renders styled text **or** an arbitrary component/card
 * with a fade + motion entrance and exit.
 *
 * When used as a direct child of `ItsTaglineRenderer`, set `duration` to
 * control how long the tagline stays visible (defaults to 3 000 ms).
 *
 * When used inside an `ItsTaglineGroup`, the group manages the timer —
 * `duration` is ignored.
 */
const ItsTagline: React.FC<ItsTaglineProps & ItsTaglineInternalProps> = ({
  text,
  textColor,
  bgColor,
  className,
  children,
  duration,
  _onComplete,
}) => {
  // Stable ref so the effect timer never fires a stale callback
  const onCompleteRef = useRef(_onComplete);
  onCompleteRef.current = _onComplete;

  useEffect(() => {
    if (!onCompleteRef.current) return;
    const ms = duration ?? 3000;
    const timer = setTimeout(() => onCompleteRef.current?.(), ms);
    return () => clearTimeout(timer);
  }, [duration]);

  const style: React.CSSProperties = {};
  if (textColor) style.color = textColor;
  if (bgColor) style.backgroundColor = bgColor;

  return (
    <motion.div
      variants={taglineVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={taglineTransition}
      className={cn(
        "flex items-center justify-center w-full h-full pointer-events-auto",
        className,
      )}
      style={style}
    >
      {children ?? (
        <span className="text-center whitespace-pre-wrap">{text}</span>
      )}
    </motion.div>
  );
};

ItsTagline.displayName = "ItsTagline";
export default ItsTagline;
