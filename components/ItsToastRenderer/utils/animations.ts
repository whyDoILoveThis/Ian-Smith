import type { Variants, Transition } from "framer-motion";

/* ─── Tagline (enter / exit) ─── */

export const taglineVariants: Variants = {
  initial: { opacity: 0, y: 14, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -14, scale: 0.97 },
};

export const taglineTransition: Transition = {
  duration: 0.45,
  ease: [0.25, 0.46, 0.45, 0.94],
};

/* ─── Group wrapper (transparent enter, quick fade exit) ─── */

export const groupWrapperVariants: Variants = {
  initial: { opacity: 1 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const groupWrapperTransition: Transition = {
  duration: 0.15,
};

/* ─── Toast – default (pop in / out) ─── */

export const toastDefaultVariants: Variants = {
  initial: { opacity: 0, y: 20, scale: 0.95 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 20, scale: 0.95 },
};

export const toastDefaultTransition: Transition = {
  duration: 0.35,
  ease: [0.25, 0.46, 0.45, 0.94],
};

/* ─── Toast – slide from right ─── */

export const toastSlideVariants: Variants = {
  initial: { x: "100%" },
  animate: { x: "0%" },
  minimized: { x: "calc(100% - 32px)" },
  exit: { x: "110%" },
};

export const toastSlideTransition: Transition = {
  type: "spring",
  damping: 28,
  stiffness: 320,
};
