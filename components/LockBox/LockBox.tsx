"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";

interface LockBoxProps {
  children: React.ReactNode;
  onUnlock?: (combo: [number, number, number, number]) => void;
}

const NUMBERS_PER_RING = 1000;
const DEGREES_PER_NUMBER = 360 / NUMBERS_PER_RING; // 0.36 degrees

// Ring configurations: outer to inner
// Each ring is progressively smaller but we keep text readable
const RING_CONFIGS = [
  {
    radius: 210,
    strokeWidth: 48,
    color: {
      main: "#f97316",
      glow: "rgba(249, 115, 22, 0.6)",
      bg: "rgba(249, 115, 22, 0.15)",
    },
    tickLen: 18,
    fontSize: 14,
    labelInterval: 100, // Show labels every 100
    label: "Outer",
  },
  {
    radius: 155,
    strokeWidth: 44,
    color: {
      main: "#3b82f6",
      glow: "rgba(59, 130, 246, 0.6)",
      bg: "rgba(59, 130, 246, 0.15)",
    },
    tickLen: 16,
    fontSize: 13,
    labelInterval: 100,
    label: "Middle",
  },
  {
    radius: 105,
    strokeWidth: 40,
    color: {
      main: "#22c55e",
      glow: "rgba(34, 197, 94, 0.6)",
      bg: "rgba(34, 197, 94, 0.15)",
    },
    tickLen: 14,
    fontSize: 12,
    labelInterval: 200, // Fewer labels on smaller rings
    label: "Green",
  },
  {
    radius: 60,
    strokeWidth: 36,
    color: {
      main: "#ec4899",
      glow: "rgba(236, 72, 153, 0.6)",
      bg: "rgba(236, 72, 153, 0.15)",
    },
    tickLen: 12,
    fontSize: 11,
    labelInterval: 200, // Even fewer labels on innermost ring
    label: "Inner",
  },
];

export default function LockBox({ children, onUnlock }: LockBoxProps) {
  const [rotations, setRotations] = useState<[number, number, number, number]>([
    0, 0, 0, 0,
  ]);
  const rotationsRef = useRef<[number, number, number, number]>([0, 0, 0, 0]);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [unlockAnimation, setUnlockAnimation] = useState(false);
  const [activeRing, setActiveRing] = useState<number | null>(null);
  const [isInertia, setIsInertia] = useState(false);
  const startAngleRef = useRef(0);
  const startRotationRef = useRef(0);
  const lastAngleRef = useRef(0);
  const lastTimeRef = useRef(0);
  const velocityRef = useRef(0);
  const inertiaFrameRef = useRef<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const CENTER = 250;
  const HIT_SLOP = 10;

  useEffect(() => {
    rotationsRef.current = rotations;
  }, [rotations]);

  // Calculate which number is at the top for a given rotation
  const getNumberAtTop = useCallback((rotation: number): number => {
    const normalized = ((rotation % 360) + 360) % 360;
    // When ring rotates clockwise by 0.36°, number 1000 moves to top
    // Formula: number = (360 - normalized) / 0.36, wrapped to 1-1000
    const number =
      Math.round((360 - normalized) / DEGREES_PER_NUMBER) % NUMBERS_PER_RING;
    return number === 0 ? NUMBERS_PER_RING : number;
  }, []);

  const getCurrentCombo = useCallback(
    (rots: [number, number, number, number]) =>
      rots.map((r) => getNumberAtTop(r)) as [number, number, number, number],
    [getNumberAtTop],
  );

  const unlockWithCurrentCombo = useCallback(() => {
    if (isUnlocked) return;
    const current = getCurrentCombo(rotationsRef.current);
    setUnlockAnimation(true);
    setTimeout(() => {
      setIsUnlocked(true);
      onUnlock?.(current);
    }, 600);
  }, [getCurrentCombo, isUnlocked, onUnlock]);

  // Get angle from center point
  const getAngleFromCenter = useCallback(
    (clientX: number, clientY: number): number => {
      if (!containerRef.current) return 0;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      return Math.atan2(clientY - centerY, clientX - centerX) * (180 / Math.PI);
    },
    [],
  );

  // Determine which ring based on click distance from center
  const getRingFromPosition = useCallback(
    (clientX: number, clientY: number): number | null => {
      if (!containerRef.current) return null;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const distance = Math.sqrt(
        Math.pow(clientX - centerX, 2) + Math.pow(clientY - centerY, 2),
      );
      const scale = Math.min(rect.width, rect.height) / 500;

      for (let i = 0; i < RING_CONFIGS.length; i++) {
        const config = RING_CONFIGS[i];
        const scaledRadius = config.radius * scale;
        const scaledStroke = config.strokeWidth * scale;
        const inner = scaledRadius - scaledStroke / 2 - HIT_SLOP;
        const outer = scaledRadius + scaledStroke / 2 + HIT_SLOP;
        if (distance >= inner && distance <= outer) {
          return i;
        }
      }
      return null;
    },
    [],
  );

  // Pointer handlers
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      const ring = getRingFromPosition(e.clientX, e.clientY);
      if (ring === null) return;

      if (inertiaFrameRef.current !== null) {
        cancelAnimationFrame(inertiaFrameRef.current);
        inertiaFrameRef.current = null;
      }
      setIsInertia(false);

      setActiveRing(ring);
      startAngleRef.current = getAngleFromCenter(e.clientX, e.clientY);
      startRotationRef.current = rotations[ring];
      lastAngleRef.current = startAngleRef.current;
      lastTimeRef.current = performance.now();
      velocityRef.current = 0;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [getAngleFromCenter, getRingFromPosition, rotations],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (activeRing === null) return;

      const currentAngle = getAngleFromCenter(e.clientX, e.clientY);
      let delta = currentAngle - startAngleRef.current;

      // Handle wrapping
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;

      setRotations((prev) => {
        const updated = [...prev] as [number, number, number, number];
        updated[activeRing] = startRotationRef.current + delta;
        return updated;
      });

      const now = performance.now();
      const dt = Math.max(now - lastTimeRef.current, 1);
      let angleDelta = currentAngle - lastAngleRef.current;
      if (angleDelta > 180) angleDelta -= 360;
      if (angleDelta < -180) angleDelta += 360;
      velocityRef.current = angleDelta / dt; // degrees per ms
      lastAngleRef.current = currentAngle;
      lastTimeRef.current = now;
    },
    [activeRing, getAngleFromCenter],
  );

  const handlePointerUp = useCallback(() => {
    if (activeRing === null) return;

    const ringIndex = activeRing;
    setActiveRing(null);

    let velocity = velocityRef.current * 12; // normalize to ~deg per frame (16ms)
    const maxVelocity = 2.5;
    velocity = Math.max(-maxVelocity, Math.min(maxVelocity, velocity));
    const velocityThreshold = 0.05;

    const snapAndCheck = (currentRotation: number) => {
      const snapped =
        Math.round(currentRotation / DEGREES_PER_NUMBER) * DEGREES_PER_NUMBER;
      setRotations((prev) => {
        const updated = [...prev] as [number, number, number, number];
        updated[ringIndex] = snapped;
        return updated;
      });
    };

    if (Math.abs(velocity) < velocityThreshold) {
      setIsInertia(false);
      snapAndCheck(rotationsRef.current[ringIndex]);
      return;
    }

    const friction = 0.9;
    const minVelocity = 0.08;
    const snapEaseThreshold = DEGREES_PER_NUMBER * 0.35;
    setIsInertia(true);
    const animate = () => {
      setRotations((prev) => {
        const updated = [...prev] as [number, number, number, number];
        const current = updated[ringIndex];
        const next = current + velocity;
        updated[ringIndex] = next;
        return updated;
      });

      velocity *= friction;
      const currentRotation = rotationsRef.current[ringIndex];
      const nearest =
        Math.round(currentRotation / DEGREES_PER_NUMBER) * DEGREES_PER_NUMBER;
      const distToSnap = Math.abs(currentRotation - nearest);
      if (distToSnap <= snapEaseThreshold && Math.abs(velocity) <= 0.25) {
        inertiaFrameRef.current = null;
        setIsInertia(false);
        snapAndCheck(nearest);
        return;
      }
      if (Math.abs(velocity) <= minVelocity) {
        inertiaFrameRef.current = null;
        setIsInertia(false);
        snapAndCheck(rotationsRef.current[ringIndex]);
        return;
      }

      inertiaFrameRef.current = requestAnimationFrame(animate);
    };

    inertiaFrameRef.current = requestAnimationFrame(animate);
  }, [activeRing, rotations]);

  // Render ring SVG elements
  const renderRing = (ringIndex: number) => {
    const config = RING_CONFIGS[ringIndex];
    const rotation = rotations[ringIndex];
    const isActive = activeRing === ringIndex;

    return (
      <g
        key={ringIndex}
        style={{
          transform: `rotate(${rotation}deg)`,
          transformOrigin: `${CENTER}px ${CENTER}px`,
          transition:
            activeRing === null && !isInertia
              ? "transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)"
              : "none",
        }}
      >
        {/* Ring background band */}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={config.radius}
          fill="none"
          stroke={config.color.bg}
          strokeWidth={config.strokeWidth}
        />

        {/* Outer edge glow when active */}
        {isActive && (
          <circle
            cx={CENTER}
            cy={CENTER}
            r={config.radius + config.strokeWidth / 2}
            fill="none"
            stroke={config.color.glow}
            strokeWidth={3}
            style={{ filter: "blur(3px)" }}
          />
        )}

        {/* Outer edge */}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={config.radius + config.strokeWidth / 2 - 1}
          fill="none"
          stroke={config.color.main}
          strokeWidth={2}
          opacity={0.8}
        />

        {/* Inner edge */}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={config.radius - config.strokeWidth / 2 + 1}
          fill="none"
          stroke={config.color.main}
          strokeWidth={2}
          opacity={0.8}
        />

        {/* Numbers and ticks */}
        {[...Array(NUMBERS_PER_RING)].map((_, i) => {
          const angleDeg = i * DEGREES_PER_NUMBER - 90; // Start from top
          const angleRad = (angleDeg * Math.PI) / 180;

          const isLabel = i % config.labelInterval === 0;
          const isTick = i % 50 === 0 && !isLabel; // Ticks at 50s, but not where labels are

          // Tick position (on outer edge pointing inward)
          const tickOuter = config.radius + config.strokeWidth / 2 - 3;
          const tickInner = tickOuter - config.tickLen;
          const tx1 = CENTER + tickOuter * Math.cos(angleRad);
          const ty1 = CENTER + tickOuter * Math.sin(angleRad);
          const tx2 = CENTER + tickInner * Math.cos(angleRad);
          const ty2 = CENTER + tickInner * Math.sin(angleRad);

          // Number position (centered in band)
          const textR = config.radius;
          const textX = CENTER + textR * Math.cos(angleRad);
          const textY = CENTER + textR * Math.sin(angleRad);

          return (
            <g key={i}>
              {isTick && (
                <line
                  x1={tx1}
                  y1={ty1}
                  x2={tx2}
                  y2={ty2}
                  stroke={config.color.main}
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  opacity={0.6}
                />
              )}
              {isLabel && (
                <text
                  x={textX}
                  y={textY}
                  fill={config.color.main}
                  fontSize={config.fontSize}
                  fontWeight="bold"
                  textAnchor="middle"
                  dominantBaseline="central"
                  style={{
                    transform: `rotate(${-rotation}deg)`,
                    transformOrigin: `${textX}px ${textY}px`,
                    transition:
                      activeRing === null && !isInertia
                        ? "transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)"
                        : "none",
                    userSelect: "none",
                    pointerEvents: "none",
                  }}
                >
                  {i === 0 ? NUMBERS_PER_RING : i}
                </text>
              )}
            </g>
          );
        })}
      </g>
    );
  };

  if (isUnlocked) {
    return <>{children}</>;
  }

  return (
    <div className="flex items-center justify-center ">
      <div className="text-center">
        {/* Current combination display */}
        <div className="flex justify-center gap-2 mb-6">
          {rotations.map((rot, i) => (
            <div
              key={i}
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center text-xl sm:text-2xl font-bold border-2 transition-all duration-200"
              style={{
                backgroundColor: RING_CONFIGS[i].color.bg,
                borderColor:
                  activeRing === i
                    ? RING_CONFIGS[i].color.main
                    : "rgba(255,255,255,0.1)",
                color: RING_CONFIGS[i].color.main,
                boxShadow:
                  activeRing === i
                    ? `0 0 20px ${RING_CONFIGS[i].color.glow}`
                    : "none",
              }}
            >
              {getNumberAtTop(rot)}
            </div>
          ))}
        </div>

        <div
          ref={containerRef}
          className={`relative w-[90vw] max-w-[500px] aspect-square mx-auto select-none transition-all duration-500 ${
            unlockAnimation ? "scale-110 opacity-0 rotate-12" : ""
          }`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{ touchAction: "none" }}
        >
          {/* Top indicator */}
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center">
            <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-t-[20px] border-l-transparent border-r-transparent border-t-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" />
            <div className="w-1 h-3 bg-white/40 rounded-full" />
          </div>

          <svg
            width="100%"
            height="100%"
            viewBox="0 0 500 500"
            className="cursor-grab active:cursor-grabbing"
          >
            {/* Background */}
            <circle cx={CENTER} cy={CENTER} r="245" fill="rgba(0,0,0,0.4)" />
            <circle
              cx={CENTER}
              cy={CENTER}
              r="245"
              fill="none"
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="2"
            />

            {/* Rings */}
            {[0, 1, 2, 3].map(renderRing)}

            {/* Center hub */}
            <circle
              cx={CENTER}
              cy={CENTER}
              r="30"
              fill="rgba(23, 23, 23, 0.95)"
            />
            <circle
              cx={CENTER}
              cy={CENTER}
              r="30"
              fill="none"
              stroke="rgba(255,255,255,0.15)"
              strokeWidth="2"
            />

            {/* Lock icon */}
            <g
              transform={`translate(${CENTER - 12}, ${CENTER - 15}) scale(0.7)`}
            >
              <rect
                x="4"
                y="16"
                width="28"
                height="20"
                rx="3"
                fill="none"
                stroke="rgba(255,255,255,0.35)"
                strokeWidth="2.5"
              />
              <path
                d="M10 16V12a8 8 0 0 1 16 0v4"
                fill="none"
                stroke="rgba(255,255,255,0.35)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <circle cx="18" cy="26" r="2.5" fill="rgba(255,255,255,0.35)" />
              <line
                x1="18"
                y1="28"
                x2="18"
                y2="32"
                stroke="rgba(255,255,255,0.35)"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </g>
          </svg>
        </div>

        <button
          type="button"
          onClick={unlockWithCurrentCombo}
          className="mt-6 w-full max-w-[280px] rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-neutral-100"
        >
          Unlock with this code 😁
        </button>

        <div className="mt-6 space-y-2">
          <p className="text-neutral-500 text-xs sm:text-sm">
            Drag any ring to rotate • Align numbers at the top arrow
          </p>
        </div>
      </div>
    </div>
  );
}
