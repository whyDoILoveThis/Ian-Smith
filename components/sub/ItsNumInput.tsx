"use client";

import React, { useEffect, useState } from "react";

interface ItsNumInputProps {
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  ariaLabel?: string;
}

/**
 * ItsNumInput
 * - visible, typable input
 * - hides native spinner controls
 * - custom tiny up/down buttons
 * - small, glassy default styling via Tailwind
 */
export default function ItsNumInput({
  value,
  onChange,
  min = Number.MIN_SAFE_INTEGER,
  max = Number.MAX_SAFE_INTEGER,
  step = 1,
  className = "",
  ariaLabel = "Number input",
}: ItsNumInputProps) {
  // local string state allows smooth typing (empty, partial numbers, etc.)
  const [str, setStr] = useState<string>(() => String(value ?? ""));

  // keep local string in sync when parent value changes externally
  useEffect(() => {
    // avoid stomping while user types the same visible value
    if (String(value) !== str) setStr(String(value ?? ""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const clamp = (n: number) => Math.min(max, Math.max(min, n));

  const commitNumeric = (raw: string) => {
    // allow '-' or '' while typing; only commit on valid number
    if (raw === "" || raw === "-" || raw === "+") return;
    const parsed = Number(raw);
    if (!isNaN(parsed)) {
      const next = clamp(parsed);
      onChange(next);
      setStr(String(next));
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    // allow typing; update visible text
    setStr(v);
    // if valid numeric right now, propagate
    const parsed = Number(v);
    if (!isNaN(parsed)) {
      onChange(clamp(parsed));
    }
  };

  const handleBlur = () => {
    // on blur, ensure value is a valid number display
    if (str === "" || str === "-" || str === "+") {
      setStr(String(value ?? ""));
      return;
    }
    commitNumeric(str);
  };

  const increment = () => {
    const base = Number(str) || value || 0;
    const next = clamp(base + step);
    onChange(next);
    setStr(String(next));
  };

  const decrement = () => {
    const base = Number(str) || value || 0;
    const next = clamp(base - step);
    onChange(next);
    setStr(String(next));
  };

  return (
    <>
      {/* hide native spinners for number inputs across browsers */}
      <style jsx>{`
        /* Chrome, Safari, Edge, Opera */
        input[type="number"]::-webkit-outer-spin-button,
        input[type="number"]::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        /* Firefox */
        input[type="number"] {
          -moz-appearance: textfield;
        }
      `}</style>

      <div
        className={`inline-flex items-center gap-2 rounded-md py-[4px] text-[12px] select-none ${className}`}
        role="group"
        aria-label={ariaLabel}
      >
        {/* glassy container styling (default) */}
        <div className="relative flex items-center rounded-md bg-white/6 dark:bg-gray-900/10 backdrop-blur-sm border border-gray-300 dark:border-gray-700 px-2">
          {/* visible, typable input */}
          <input
            type="number"
            inputMode="numeric"
            value={str}
            onChange={handleInput}
            onBlur={handleBlur}
            min={min}
            max={max}
            step={step}
            aria-label={ariaLabel}
            className="bg-transparent outline-none appearance-none text-black dark:text-white placeholder-gray-500 dark:placeholder-gray-400 w-14 text-right text-sm"
          />

          {/* tiny custom arrows */}
          <div className="flex flex-col ml-2 -mr-1">
            <button
              type="button"
              onClick={increment}
              aria-label="Increment"
              className="w-3 h-3 flex items-center justify-center rounded-sm text-[10px] bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 active:translate-y-[1px] border border-gray-300 dark:border-gray-700"
            >
              ▲
            </button>
            <button
              type="button"
              onClick={decrement}
              aria-label="Decrement"
              className="w-3 h-3 flex items-center justify-center rounded-sm mt-1 text-[10px] bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 active:translate-y-[-1px] border border-gray-300 dark:border-gray-700"
            >
              ▼
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
