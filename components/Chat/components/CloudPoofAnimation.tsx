"use client";

import React, { useEffect, useState } from "react";

type CloudPoofAnimationProps = {
  onComplete: () => void;
};

export function CloudPoofAnimation({ onComplete }: CloudPoofAnimationProps) {
  const [stage, setStage] = useState<"poof" | "fade">("poof");

  useEffect(() => {
    const poofTimer = setTimeout(() => {
      setStage("fade");
    }, 600);

    const completeTimer = setTimeout(() => {
      onComplete();
    }, 1100);

    return () => {
      clearTimeout(poofTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div className="relative flex items-center justify-center w-full h-full overflow-visible">
      {/* Cloud poof particles */}
      <div
        className={`absolute inset-0 flex items-center justify-center transition-all duration-600 ${
          stage === "fade" ? "opacity-0 scale-150" : "opacity-100 scale-100"
        }`}
      >
        {/* Center cloud burst */}
        <div className="relative">
          {/* Primary cloud puffs — large, 12 directions */}
          {[...Array(12)].map((_, i) => {
            const angle = (i / 12) * 360;
            const delay = i * 25;
            return (
              <div
                key={`cloud-${i}`}
                className="absolute w-6 h-6 rounded-full bg-gradient-to-br from-white/80 to-purple-200/60"
                style={{
                  animation: `cloudPoof 0.7s ease-out ${delay}ms forwards`,
                  transform: `rotate(${angle}deg) translateX(0)`,
                  transformOrigin: "center center",
                }}
              />
            );
          })}

          {/* Secondary mini puffs — smaller, offset angles, staggered */}
          {[...Array(16)].map((_, i) => {
            const angle = (i / 16) * 360 + 11.25;
            const delay = 40 + i * 20;
            return (
              <div
                key={`mini-${i}`}
                className="absolute w-3 h-3 rounded-full bg-gradient-to-br from-white/60 to-purple-300/40"
                style={{
                  animation: `cloudPoofSmall 0.6s ease-out ${delay}ms forwards`,
                  transform: `rotate(${angle}deg) translateX(0)`,
                  transformOrigin: "center center",
                }}
              />
            );
          })}

          {/* Micro debris particles — tiny dots flying out fast */}
          {[...Array(20)].map((_, i) => {
            const angle = (i / 20) * 360 + i * 7;
            const delay = 20 + i * 15;
            return (
              <div
                key={`debris-${i}`}
                className="absolute w-1 h-1 rounded-full bg-white/70"
                style={{
                  animation: `debrisFly 0.55s ease-out ${delay}ms forwards`,
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
              animation: "cloudFlash 0.45s ease-out forwards",
            }}
          />

          {/* Sparkles — more of them */}
          {[...Array(18)].map((_, i) => {
            const angle = (i / 18) * 360;
            const distance = 20 + Math.random() * 35;
            return (
              <div
                key={`sparkle-${i}`}
                className="absolute w-1.5 h-1.5 rounded-full bg-amber-300"
                style={{
                  animation: `sparkle 0.85s ease-out ${i * 15}ms forwards`,
                  left: "50%",
                  top: "50%",
                  transform: `rotate(${angle}deg) translateX(${distance}px)`,
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Smoke wisps — more and spread wider */}
      <div
        className={`absolute inset-0 transition-opacity duration-700 ${
          stage === "fade" ? "opacity-0" : "opacity-100"
        }`}
      >
        {[...Array(8)].map((_, i) => (
          <div
            key={`smoke-${i}`}
            className="absolute rounded-full bg-white/20"
            style={{
              width: `${12 + i * 4}px`,
              height: `${12 + i * 4}px`,
              left: `${15 + i * 10}%`,
              top: `${15 + i * 10}%`,
              animation: `smokeRise 1.1s ease-out ${i * 80}ms forwards`,
            }}
          />
        ))}
      </div>

      {/* CSS Keyframes */}
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

        @keyframes cloudPoofSmall {
          0% {
            transform: rotate(var(--angle, 0deg)) translateX(0) scale(0.4);
            opacity: 0.9;
          }
          100% {
            transform: rotate(var(--angle, 0deg)) translateX(35px) scale(0);
            opacity: 0;
          }
        }

        @keyframes debrisFly {
          0% {
            transform: rotate(var(--angle, 0deg)) translateX(0) scale(1);
            opacity: 1;
          }
          100% {
            transform: rotate(var(--angle, 0deg)) translateX(70px) scale(0);
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
