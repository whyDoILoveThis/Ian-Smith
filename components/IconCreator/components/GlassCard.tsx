/**
 * GlassCard — Reusable glassmorphic container
 *
 * Provides the signature glass effect with:
 *  - Backdrop blur
 *  - Subtle translucent background
 *  - Soft border with orange tint in dark mode
 *  - Smooth shadow
 */

"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

interface GlassCardProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  className?: string;
  /** Glow effect on hover */
  glow?: boolean;
}

export function GlassCard({
  children,
  className,
  glow = false,
  ...props
}: GlassCardProps) {
  return (
    <motion.div
      className={cn(
        // Base glass
        "rounded-2xl border backdrop-blur-xl",
        // Light mode
        "bg-white/60 border-white/30 shadow-lg shadow-black/5",
        // Dark mode
        "dark:bg-black/40 dark:border-orange-500/10 dark:shadow-orange-500/5",
        // Glow hover effect
        glow &&
          "transition-shadow hover:shadow-orange-500/20 hover:dark:shadow-orange-500/30",
        className,
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
}
