"use client";

import EmojiText from "@/components/ui/EmojiText";
import React, { useState, useEffect } from "react";

/* ── Particle layout configuration (computed once, not animation logic) ── */
interface ParticleConfig {
  id: number;
  x: number; // horizontal position %
  delay: number; // animation-delay seconds
  duration: number; // animation-duration seconds
  size: number; // fontSize (emoji) or px (dot)
  peakOpacity: number; // --sc-float-peak
  midOpacity: number; // --sc-float-mid
  content?: string; // emoji character (undefined for dots)
}

/* ── Public props ── */
export interface FloatingParticlesProps {
  /** Number of particles (default: 10) */
  count?: number;
  /** Emoji list — now accepts ReactNode[] for custom emoji rendering. Omit for dot particles. */
  emojis?: string[];
  /** RGB triplet for dot particles, e.g. "139,92,246" */
  dotColorRgb?: string;
  /** Total vertical travel in px (default: 500 for emojis, 600 for dots) */
  distance?: number;
  /** End rotation in degrees (default: 360 for emojis, 0 for dots) */
  rotation?: number;
  /** [min, max] animation-duration in seconds */
  durationRange?: [number, number];
  /** [min, max] animation-delay in seconds */
  delayRange?: [number, number];
  /** [min, max] size — fontSize for emojis, px diameter for dots */
  sizeRange?: [number, number];
  /** [min, max] per-particle peak opacity (default: [0.15, 0.35]) */
  opacityRange?: [number, number];
  /** CSS bottom offset to start from (default: -30 for emojis, -10 for dots) */
  startBottom?: number;
}

/**
 * Renders decorative floating particles using pure CSS @keyframes.
 * No Framer Motion. No JS timers. No requestAnimationFrame.
 *
 * Uses the `sc-float` class from ShowcaseAnimations.css which references
 * per-element CSS custom properties for distance, rotation, and opacity.
 *
 * Usage:
 *   <FloatingParticles emojis={["🍎","🍊","🍋"]} count={10} />
 *   <FloatingParticles dotColorRgb="6,182,212" count={12} distance={600} />
 */
export default function FloatingParticles({
  count = 10,
  emojis,
  dotColorRgb,
  distance,
  rotation,
  durationRange,
  delayRange,
  sizeRange,
  opacityRange = [0.15, 0.35],
  startBottom,
}: FloatingParticlesProps) {
  const [particles, setParticles] = useState<ParticleConfig[]>([]);

  const isEmoji = !!emojis?.length;

  /* Resolve defaults based on mode */
  const resolvedDistance = distance ?? (isEmoji ? 500 : 600);
  const resolvedRotation = rotation ?? (isEmoji ? 360 : 0);
  const resolvedDuration = durationRange ?? (isEmoji ? [10, 18] : [12, 22]);
  const resolvedDelay = delayRange ?? (isEmoji ? [0, 6] : [0, 8]);
  const resolvedSize = sizeRange ?? (isEmoji ? [16, 30] : [2, 6]);
  const resolvedBottom = startBottom ?? (isEmoji ? -30 : -10);

  /* One-time random layout generation (not animation logic) */
  useEffect(() => {
    const rand = (min: number, max: number) =>
      min + Math.random() * (max - min);

    setParticles(
      Array.from({ length: count }, (_, i) => {
        const peak = rand(opacityRange[0], opacityRange[1]);
        return {
          id: i,
          x: Math.random() * 100,
          delay: rand(resolvedDelay[0], resolvedDelay[1]),
          duration: rand(resolvedDuration[0], resolvedDuration[1]),
          size: rand(resolvedSize[0], resolvedSize[1]),
          peakOpacity: peak,
          midOpacity: peak * 0.8,
          content: isEmoji
            ? emojis![Math.floor(Math.random() * emojis!.length)]
            : undefined,
        };
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  return (
    <>
      {particles.map((p) =>
        isEmoji ? (
          <EmojiText key={p.id}>
            <span
              className="absolute sc-float"
              style={
                {
                  left: `${p.x}%`,
                  bottom: resolvedBottom,
                  fontSize: p.size,
                  // fontFamily intentionally omitted so EmojiText controls font
                  "--sc-float-y": `${-resolvedDistance}px`,
                  "--sc-float-rotate": `${resolvedRotation}deg`,
                  "--sc-float-peak": String(p.peakOpacity),
                  "--sc-float-mid": String(p.midOpacity),
                  animationDuration: `${p.duration}s`,
                  animationDelay: `${p.delay}s`,
                } as React.CSSProperties
              }
            >
              {p.content}
            </span>
          </EmojiText>
        ) : (
          <div
            key={p.id}
            className="absolute rounded-full sc-float"
            style={
              {
                left: `${p.x}%`,
                bottom: resolvedBottom,
                width: p.size,
                height: p.size,
                background: `radial-gradient(circle, rgba(${dotColorRgb},${p.peakOpacity}) 0%, transparent 70%)`,
                "--sc-float-y": `${-resolvedDistance}px`,
                "--sc-float-rotate": `${resolvedRotation}deg`,
                "--sc-float-peak": String(p.peakOpacity),
                "--sc-float-mid": String(p.midOpacity),
                animationDuration: `${p.duration}s`,
                animationDelay: `${p.delay}s`,
              } as React.CSSProperties
            }
          />
        ),
      )}
    </>
  );
}
