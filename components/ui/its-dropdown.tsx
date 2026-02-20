"use client";

import { useState, useRef, useEffect } from "react";

interface Props {
  trigger: React.ReactNode;
  children: React.ReactNode;
  position?:
    | "down-left"
    | "down-right"
    | "up-left"
    | "up-right"
    | "up"
    | "down"
    | "left"
    | "right";
  className?: string;
  closeWhenItemClick?: boolean; // closes dropdown when clicking item
  contentNoCloseWhenClickedTop?: React.ReactNode;
  contentNoCloseWhenClickedBottom?: React.ReactNode;
}

export default function ItsDropdown({
  trigger,
  children,
  position = "down-left",
  className = "",
  closeWhenItemClick = false,
  contentNoCloseWhenClickedTop,
  contentNoCloseWhenClickedBottom,
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Don't close during tutorial mode
      if (document.body.dataset.tutorialActive) return;
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Content click handler
  const handleContentClick = (e: React.MouseEvent) => {
    if (!closeWhenItemClick) return;
    // Don't close during tutorial mode
    if (document.body.dataset.tutorialActive) return;

    const target = e.target as HTMLElement | null;
    if (!target) return;

    if (
      target.closest("input, textarea, select") ||
      target.closest(".no-close")
    ) {
      return;
    }

    setOpen(false);
  };

  // Position classes
  const positionClasses: Record<string, string> = {
    "down-left": "top-full left-0 mt-2 origin-top-left",
    "down-right": "top-full right-0 mt-2 origin-top-right",
    "up-left": "bottom-full left-0 mb-2 origin-bottom-left",
    "up-right": "bottom-full right-0 mb-2 origin-bottom-right",
    up: "bottom-full left-1/2 transform -translate-x-1/2 mb-2 origin-bottom",
    down: "top-full left-1/2 transform -translate-x-1/2 mt-2 origin-top",
    left: "top-1/2 right-full transform -translate-y-1/2 mr-2 origin-right",
    right: "top-1/2 left-full transform -translate-y-1/2 ml-2 origin-left",
  };

  return (
    <div ref={ref} className="relative inline-block">
      <div onClick={() => setOpen((prev) => !prev)}>{trigger}</div>

      <div
        className={`
          absolute min-w-[10rem] w-72 p-2 rounded-xl shadow-lg bg-white dark:bg-gray-900 border dark:border-gray-700 z-[999]
          transition-all duration-200 transform
          ${
            open
              ? "scale-100 opacity-100"
              : "scale-95 opacity-0 pointer-events-none"
          }
          ${positionClasses[position]}
          ${className}
          `}
        role="menu"
      >
        <div>{contentNoCloseWhenClickedTop}</div>
        <div onClick={handleContentClick}>{children}</div>
        <div>{contentNoCloseWhenClickedBottom}</div>
      </div>
    </div>
  );
}
