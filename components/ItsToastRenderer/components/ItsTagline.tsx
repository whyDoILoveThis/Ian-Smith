"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ItsTaglineProps, ItsTaglineInternalProps } from "../types";
import { taglineVariants, taglineTransition } from "../utils/animations";
import EmojiText from "@/components/ui/EmojiText";

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
  dontCloseIfHovered = false,
  _onComplete,
}) => {
  // Stable ref so the effect timer never fires a stale callback
  const onCompleteRef = useRef(_onComplete);
  onCompleteRef.current = _onComplete;

  const [hovered, setHovered] = useState(false);
  const remainingRef = useRef(duration ?? 3000);
  const timerStartRef = useRef(0);

  useEffect(() => {
    if (!onCompleteRef.current) return;
    if (dontCloseIfHovered && hovered) return;
    const ms = dontCloseIfHovered ? remainingRef.current : (duration ?? 3000);
    timerStartRef.current = Date.now();
    const timer = setTimeout(() => onCompleteRef.current?.(), ms);
    return () => {
      if (dontCloseIfHovered) {
        const elapsed = Date.now() - timerStartRef.current;
        remainingRef.current = Math.max(0, remainingRef.current - elapsed);
      }
      clearTimeout(timer);
    };
  }, [duration, dontCloseIfHovered, hovered]);

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
      onMouseEnter={dontCloseIfHovered ? () => setHovered(true) : undefined}
      onMouseLeave={dontCloseIfHovered ? () => setHovered(false) : undefined}
      className={cn(
        "flex items-center justify-center w-full h-full pointer-events-auto",
        className,
      )}
      style={style}
    >
      <EmojiText>
        {children ?? (
          <span className="text-center whitespace-pre-wrap">{text}</span>
        )}
      </EmojiText>
    </motion.div>
  );
};

ItsTagline.displayName = "ItsTagline";
export default ItsTagline;
