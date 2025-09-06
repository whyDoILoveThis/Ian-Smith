// components/sub/ItsToast.tsx
"use client";

import { useEffect, useState } from "react";
import { IoClose } from "react-icons/io5";

interface ToastProps {
  children: React.ReactNode;
  delay?: number; // in ms
  onClose?: () => void;
}

export default function ItsToast({
  children,
  delay = 5000,
  onClose,
}: ToastProps) {
  const [entered, setEntered] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [countdown, setCountdown] = useState(Math.ceil(delay / 1000));

  useEffect(() => {
    // smooth mount
    const tick = setTimeout(() => setEntered(true), 20);

    // countdown
    const countdownInterval = setInterval(() => {
      setCountdown((s) => {
        if (s <= 1) {
          // ⏱ start leaving immediately when countdown hits 0
          clearInterval(countdownInterval);
          setLeaving(true);
          setTimeout(() => {
            if (onClose) onClose();
          }, 1600); // match exit animation
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => {
      clearTimeout(tick);
      clearInterval(countdownInterval);
    };
  }, [delay, onClose]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-16 right-4 z-50
        max-w-[92vw]
        w-auto rounded-lg shadow-lg
        backdrop-blur-md
        border border-white/10 bg-white/5 dark:bg-gray-800/70 dark:border-gray-700
        overflow-hidden
        pointer-events-auto
        transition-all
        ${
          leaving
            ? "animate-toast-exit"
            : entered
            ? "translate-x-0 opacity-100"
            : "translate-x-6 opacity-0"
        }
      `}
    >
      {/* countdown */}
      <span className="absolute top-2 left-2 text-xs text-white/70 tabular-nums">
        {"closing in"} {countdown}
        {"s"}
      </span>

      {/* close */}
      <button
        aria-label="Close"
        onClick={() => {
          setLeaving(true);
          setTimeout(() => {
            if (onClose) onClose();
          }, 1600);
        }}
        className="absolute top-0 right-2 text-white/70 hover:text-white p-1"
      >
        <IoClose size={16} />
      </button>

      {/* content */}
      {children}
    </div>
  );
}
