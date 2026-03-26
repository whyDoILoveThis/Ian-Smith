"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ItsToastRendererProps } from "../types";
import {
  toastDefaultVariants,
  toastDefaultTransition,
  toastSlideVariants,
  toastSlideTransition,
} from "../utils/animations";

type ToastState = "hidden" | "visible" | "minimized";

/**
 * Optional wrapper that turns its children into a dismissible toast.
 *
 * Two modes:
 * - **`slideFromSide`** — slides in from the right; when closed it peeks
 *   (32 px) so the user can tap to reopen.
 * - **default** — pops in at a fixed position and vanishes when dismissed.
 *
 * Override the default position by passing Tailwind utilities such as
 * `top-4 left-4` via `className`.
 */
const ItsToastRenderer: React.FC<ItsToastRendererProps> = ({
  children,
  delayBeforeShown = 0,
  delayBeforeGone = 0,
  className,
  closeWhenClicked = false,
  slideFromSide = false,
}) => {
  const [state, setState] = useState<ToastState>("hidden");
  const hasAutoHidden = useRef(false);

  /* Show after initial delay */
  useEffect(() => {
    const timer = setTimeout(() => setState("visible"), delayBeforeShown);
    return () => clearTimeout(timer);
  }, [delayBeforeShown]);

  /* Auto-hide after visible delay (fires at most once) */
  useEffect(() => {
    if (state !== "visible" || !delayBeforeGone || hasAutoHidden.current)
      return;
    const timer = setTimeout(() => {
      hasAutoHidden.current = true;
      setState(slideFromSide ? "minimized" : "hidden");
    }, delayBeforeGone);
    return () => clearTimeout(timer);
  }, [state, delayBeforeGone, slideFromSide]);

  const handleClick = useCallback(() => {
    if (state === "minimized") {
      setState("visible");
      return;
    }
    if (state === "visible" && closeWhenClicked) {
      setState(slideFromSide ? "minimized" : "hidden");
    }
  }, [state, closeWhenClicked, slideFromSide]);

  /* ─── Slide-from-side variant ─── */
  if (slideFromSide) {
    return (
      <div
        className={cn("fixed top-1/2 right-0 -translate-y-1/2 z-50", className)}
      >
        <AnimatePresence>
          {state !== "hidden" && (
            <motion.div
              key="toast-slide"
              variants={toastSlideVariants}
              initial="initial"
              animate={state === "minimized" ? "minimized" : "animate"}
              exit="exit"
              transition={toastSlideTransition}
              onClick={handleClick}
              className={cn(
                "select-none",
                (state === "minimized" ||
                  (closeWhenClicked && state === "visible")) &&
                  "cursor-pointer",
              )}
            >
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  /* ─── Default (fixed position) variant ─── */
  return (
    <AnimatePresence>
      {state === "visible" && (
        <motion.div
          key="toast-default"
          variants={toastDefaultVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={toastDefaultTransition}
          onClick={handleClick}
          className={cn(
            "fixed bottom-4 right-4 z-50 select-none",
            closeWhenClicked && "cursor-pointer",
            className,
          )}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

ItsToastRenderer.displayName = "ItsToastRenderer";
export default ItsToastRenderer;
