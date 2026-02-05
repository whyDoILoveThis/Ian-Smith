"use client";

import React, { useEffect, useState } from "react";

type CloudPoofAnimationProps = {
  onComplete: () => void;
};

export function CloudPoofAnimation({ onComplete }: CloudPoofAnimationProps) {
  const [stage, setStage] = useState<"poof" | "fade">("poof");

  useEffect(() => {
    // Stage 1: Poof explosion
    const poofTimer = setTimeout(() => {
      setStage("fade");
    }, 400);

    // Stage 2: Complete
    const completeTimer = setTimeout(() => {
      onComplete();
    }, 800);

    return () => {
      clearTimeout(poofTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div className="relative flex items-center justify-center w-full h-full">
      {/* Cloud poof particles */}
      <div
        className={`absolute inset-0 flex items-center justify-center transition-all duration-400 ${
          stage === "fade" ? "opacity-0 scale-150" : "opacity-100 scale-100"
        }`}
      >
        {/* Center cloud burst */}
        <div className="relative">
          {/* Animated cloud puffs */}
          {[...Array(8)].map((_, i) => {
            const angle = (i / 8) * 360;
            const delay = i * 30;
            return (
              <div
                key={i}
                className="absolute w-6 h-6 rounded-full bg-gradient-to-br from-white/80 to-purple-200/60"
                style={{
                  animation: `cloudPoof 0.5s ease-out ${delay}ms forwards`,
                  transform: `rotate(${angle}deg) translateX(0)`,
                  transformOrigin: "center center",
                }}
              />
            );
          })}

          {/* Center flash */}
          <div
            className="absolute -inset-4 rounded-full bg-white/40"
            style={{
              animation: "cloudFlash 0.3s ease-out forwards",
            }}
          />

          {/* Sparkles */}
          {[...Array(12)].map((_, i) => {
            const angle = (i / 12) * 360;
            const distance = 20 + Math.random() * 30;
            return (
              <div
                key={`sparkle-${i}`}
                className="absolute w-1.5 h-1.5 rounded-full bg-amber-300"
                style={{
                  animation: `sparkle 0.6s ease-out ${i * 20}ms forwards`,
                  left: "50%",
                  top: "50%",
                  transform: `rotate(${angle}deg) translateX(${distance}px)`,
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Smoke wisps */}
      <div
        className={`absolute inset-0 transition-opacity duration-500 ${
          stage === "fade" ? "opacity-0" : "opacity-100"
        }`}
      >
        {[...Array(5)].map((_, i) => (
          <div
            key={`smoke-${i}`}
            className="absolute rounded-full bg-white/20"
            style={{
              width: `${15 + i * 5}px`,
              height: `${15 + i * 5}px`,
              left: `${30 + i * 10}%`,
              top: `${20 + i * 12}%`,
              animation: `smokeRise 0.8s ease-out ${i * 100}ms forwards`,
            }}
          />
        ))}
      </div>

      {/* CSS Keyframes injected via style tag */}
      <style jsx>{`
        @keyframes cloudPoof {
          0% {
            transform: rotate(var(--angle, 0deg)) translateX(0) scale(0.5);
            opacity: 1;
          }
          100% {
            transform: rotate(var(--angle, 0deg)) translateX(50px) scale(0);
            opacity: 0;
          }
        }

        @keyframes cloudFlash {
          0% {
            transform: scale(0.5);
            opacity: 1;
          }
          100% {
            transform: scale(3);
            opacity: 0;
          }
        }

        @keyframes sparkle {
          0% {
            transform: rotate(var(--angle, 0deg)) translateX(0) scale(1);
            opacity: 1;
          }
          100% {
            transform: rotate(var(--angle, 0deg)) translateX(60px) scale(0);
            opacity: 0;
          }
        }

        @keyframes smokeRise {
          0% {
            transform: translateY(0) scale(1);
            opacity: 0.6;
          }
          100% {
            transform: translateY(-40px) scale(1.5);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
