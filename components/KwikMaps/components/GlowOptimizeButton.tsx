"use client";

import React from "react";
import { Loader, Navigation2 } from "lucide-react";

type GlowOptimizeButtonProps = {
  onClick: () => void;
  isOptimizing: boolean;
  disabled?: boolean;
  label?: string;
  loadingLabel?: string;
  className?: string;
};

export const GlowOptimizeButton: React.FC<GlowOptimizeButtonProps> = ({
  onClick,
  isOptimizing,
  disabled = false,
  label = "Map Out Route",
  loadingLabel = "Optimizing...",
  className = "",
}) => {
  const isDisabled = disabled || isOptimizing;

  return (
    <>
      <style jsx>{`
        @keyframes shine {
          0% {
            transform: translateX(-300%);
            opacity: 0;
          }
          30% {
            opacity: 0.25;
          }
          50% {
            opacity: 0.45;
          }
          70% {
            opacity: 0.25;
          }
          100% {
            transform: translateX(300%);
            opacity: 0;
          }
        }

        @keyframes pulseGlow {
          0%,
          100% {
            opacity: 0.4;
            transform: scale(1);
          }
          50% {
            opacity: 0.75;
            transform: scale(1.08);
          }
        }

        @keyframes gradientShift {
          0% {
            background-position: 0% 50%;
          }
          10% {
            background-position: 200% 50%;
          }
          90% {
            background-position: 200% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
      `}</style>

      <button
        onClick={onClick}
        disabled={isDisabled}
        className={`group relative w-[240px] h-[80px] place-self-center flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-bold text-white shrink-0 overflow-hidden transition-all duration-300 ease-out ${
          isDisabled
            ? "bg-gray-700 text-gray-400 shadow-none cursor-not-allowed"
            : "shadow-[0_0_25px_rgba(34,197,94,0.4)] hover:shadow-[0_0_40px_rgba(34,197,94,0.8)] hover:scale-[1.05] active:scale-[0.97]"
        } ${className}`}
        style={
          !isDisabled
            ? {
                background:
                  "linear-gradient(110deg,#10b981,#22c55e,#10b981,#34d399)",
                backgroundSize: "200% 100%",
                animation: "gradientShift 3.3s ease infinite",
              }
            : undefined
        }
      >
        {/* 💚 FABULOUS BREATHING AURA */}
        {!isDisabled && (
          <span
            className="absolute inset-0 rounded-2xl blur-2xl bg-green-400/50 pointer-events-none"
            style={{
              animation: "pulseGlow 0.5s ease-in-out infinite",
            }}
          />
        )}

        {/* ✨ ULTRA SMOOTH SLOW SHINE */}
        {!isDisabled && (
          <span className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
            <span
              className="absolute top-0 left-0 h-full w-full pointer-events-none"
              style={{
                background:
                  "linear-gradient(to right, transparent, rgba(255,255,255,0.25), transparent)",
                animation: "shine 2s ease-in-out infinite",
              }}
            />
          </span>
        )}

        {/* 🌟 INNER GLOW */}
        {!isDisabled && (
          <span className="absolute inset-[1px] rounded-2xl bg-gradient-to-r from-white/10 to-transparent opacity-40 pointer-events-none" />
        )}

        {/* 🔘 CONTENT */}
        <span className="relative flex items-center gap-2">
          {isOptimizing ? (
            <>
              <Loader size={15} className="animate-spin" />
              {loadingLabel}
            </>
          ) : (
            <>
              <Navigation2 size={15} />
              {label}
            </>
          )}
        </span>
      </button>
    </>
  );
};
