"use client";

import React, { useEffect, useState } from "react";

export type Toast = {
  id: string;
  message: string;
  type: "error" | "success" | "info";
};

type ErrorToastProps = {
  toasts: Toast[];
  onDismiss: (id: string) => void;
};

export function ErrorToast({ toasts, onDismiss }: ErrorToastProps) {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[500] flex flex-col gap-2 w-[90vw] max-w-sm pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: string) => void;
}) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onDismiss(toast.id), 300);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const colors =
    toast.type === "error"
      ? "bg-red-500/90 border-red-400/30 text-white"
      : toast.type === "success"
        ? "bg-emerald-500/90 border-emerald-400/30 text-white"
        : "bg-blue-500/90 border-blue-400/30 text-white";

  const icon =
    toast.type === "error" ? "✕" : toast.type === "success" ? "✓" : "ℹ";

  return (
    <div
      className={`pointer-events-auto flex items-center gap-2.5 rounded-xl border px-4 py-3 shadow-2xl backdrop-blur-md transition-all duration-300 ${colors} ${
        isExiting
          ? "opacity-0 translate-y-[-10px] scale-95"
          : "opacity-100 translate-y-0 scale-100 animate-in slide-in-from-top-2"
      }`}
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20 text-[10px] font-bold">
        {icon}
      </span>
      <p className="flex-1 text-sm font-medium leading-tight">
        {toast.message}
      </p>
      <button
        type="button"
        onClick={() => {
          setIsExiting(true);
          setTimeout(() => onDismiss(toast.id), 300);
        }}
        className="shrink-0 rounded-full p-1 hover:bg-white/20 transition-colors"
      >
        <svg
          className="h-3.5 w-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={3}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
}
