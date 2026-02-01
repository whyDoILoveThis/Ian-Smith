// components/0Timeline/TimelineAI/AILoadingAnimation.tsx
"use client";

import React, { useEffect, useState } from "react";
import { Sparkles, Brain, Lightbulb, Zap } from "lucide-react";

interface AILoadingAnimationProps {
  prompt: string;
}

const loadingSteps = [
  { icon: Brain, text: "Analyzing your request..." },
  { icon: Lightbulb, text: "Generating timeline structure..." },
  { icon: Zap, text: "Creating events and milestones..." },
  { icon: Sparkles, text: "Adding finishing touches..." },
];

export default function AILoadingAnimation({
  prompt,
}: AILoadingAnimationProps) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) =>
        prev < loadingSteps.length - 1 ? prev + 1 : prev,
      );
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-12">
      {/* Main animation */}
      <div className="relative">
        {/* Outer ring */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-violet-500 via-cyan-500 to-pink-500 animate-spin-slow opacity-20 blur-xl" />

        {/* Inner circle */}
        <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-violet-600 to-cyan-600 flex items-center justify-center shadow-xl">
          <div className="absolute inset-1 rounded-full bg-gray-900 flex items-center justify-center">
            <Sparkles className="w-10 h-10 text-white animate-pulse" />
          </div>
        </div>

        {/* Orbiting dots */}
        <div className="absolute inset-0 animate-spin-slow">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 w-3 h-3 rounded-full bg-violet-500 shadow-lg shadow-violet-500/50" />
        </div>
        <div className="absolute inset-0 animate-spin-slower">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-2 w-2 h-2 rounded-full bg-cyan-500 shadow-lg shadow-cyan-500/50" />
        </div>
        <div className="absolute inset-0 animate-spin-reverse">
          <div className="absolute top-1/2 right-0 translate-x-2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-pink-500 shadow-lg shadow-pink-500/50" />
        </div>
      </div>

      {/* Progress text */}
      <div className="mt-8 text-center space-y-3">
        <div className="flex items-center justify-center gap-2 text-gray-600 dark:text-gray-300">
          {React.createElement(loadingSteps[currentStep].icon, {
            size: 18,
            className: "animate-bounce",
          })}
          <span className="text-sm font-medium">
            {loadingSteps[currentStep].text}
          </span>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5">
          {loadingSteps.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index <= currentStep
                  ? "bg-gradient-to-r from-violet-500 to-cyan-500 scale-100"
                  : "bg-gray-300 dark:bg-gray-700 scale-75"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Prompt preview */}
      <div className="mt-6 px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 max-w-sm">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
          Your prompt:
        </p>
        <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
          &ldquo;{prompt}&rdquo;
        </p>
      </div>

      {/* Custom animation styles */}
      <style jsx>{`
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes spin-slower {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes spin-reverse {
          from {
            transform: rotate(360deg);
          }
          to {
            transform: rotate(0deg);
          }
        }
        :global(.animate-spin-slow) {
          animation: spin-slow 3s linear infinite;
        }
        :global(.animate-spin-slower) {
          animation: spin-slower 5s linear infinite;
        }
        :global(.animate-spin-reverse) {
          animation: spin-reverse 4s linear infinite;
        }
      `}</style>
    </div>
  );
}
