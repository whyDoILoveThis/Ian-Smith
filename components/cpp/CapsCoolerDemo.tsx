"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import CapsCoolerIcon from "@/images/icon--caps-cooler.ico";

const DEFAULT_TIMEOUT_MS = 5000; // default delay before fake caps turns off
const TIMER_TICK_MS = 100; // visual countdown tick

export default function CapsCoolerDemo() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const tickRef = useRef<number | null>(null);
  const endRef = useRef<number | null>(null);
  const shiftDownRef = useRef<boolean>(false);

  // Use a ref that always has the immediate truth to avoid race conditions
  const fakeCapsOnRef = useRef<boolean>(false);
  const [fakeCapsOn, setFakeCapsOn] = useState(false);
  const [value, setValue] = useState("");
  const [remainingMs, setRemainingMs] = useState(0);
  const [timeoutMs, setTimeoutMs] = useState(DEFAULT_TIMEOUT_MS);
  const timeoutMsRef = useRef(DEFAULT_TIMEOUT_MS);

  // Setter that keeps ref & state in sync immediately
  const setFakeCapsState = (next: boolean) => {
    fakeCapsOnRef.current = next;
    setFakeCapsOn(next);
  };

  // Keep ref in sync so timer callbacks always read the latest value
  const handleTimeoutChange = (ms: number) => {
    const clamped = Math.max(500, ms);
    setTimeoutMs(clamped);
    timeoutMsRef.current = clamped;
  };

  // Start or (re)start the single ticking loop using an end timestamp
  const startTimer = () => {
    endRef.current = Date.now() + timeoutMsRef.current;
    setRemainingMs(timeoutMsRef.current);

    // if a tick is already running, don't create another one
    if (tickRef.current != null) return;

    tickRef.current = window.setInterval(() => {
      if (!endRef.current) {
        if (tickRef.current != null) {
          window.clearInterval(tickRef.current);
          tickRef.current = null;
        }
        setRemainingMs(0);
        return;
      }
      const rem = Math.max(0, endRef.current - Date.now());
      setRemainingMs(rem);

      if (rem <= 0) {
        // turn off using the ref-aware setter to avoid races
        setFakeCapsState(false);
        setRemainingMs(0);
        endRef.current = null;
        if (tickRef.current != null) {
          window.clearInterval(tickRef.current);
          tickRef.current = null;
        }
      }
    }, TIMER_TICK_MS);
  };

  // Stop and clear the tick + end
  const clearTimer = () => {
    if (tickRef.current != null) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
    endRef.current = null;
    setRemainingMs(0);
  };

  // Reset timer (update end) if currently on — uses ref to avoid stale reads
  const resetTimer = () => {
    if (!fakeCapsOnRef.current) return;
    endRef.current = Date.now() + timeoutMsRef.current;
    setRemainingMs(timeoutMsRef.current);
    if (tickRef.current == null) startTimer();
  };

  // Toggle fake Caps (UI or key)
  const toggleFakeCaps = (val?: boolean) => {
    const next = typeof val === "boolean" ? val : !fakeCapsOnRef.current;
    setFakeCapsState(next);
    if (next) startTimer();
    else clearTimer();
    inputRef.current?.focus();
  };

  // Helper to insert text at selection while preserving caret
  const insertAtSelection = (str: string) => {
    const input = inputRef.current;
    if (!input) {
      setValue((v) => v + str);
      return;
    }
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? start;
    const newVal = input.value.slice(0, start) + str + input.value.slice(end);
    setValue(newVal);
    window.requestAnimationFrame(() => {
      const pos = start + str.length;
      input.setSelectionRange(pos, pos);
    });
  };

  // handle printable key insertion + backspace/delete management
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Shift") {
      shiftDownRef.current = true;
      return;
    }

    if (e.key === "CapsLock") {
      e.preventDefault();
      toggleFakeCaps();
      resetTimer();
      return;
    }

    if (
      e.key === "Backspace" ||
      e.key === "Delete" ||
      e.key === "Enter" ||
      e.key === "Tab" ||
      e.key === "ArrowLeft" ||
      e.key === "ArrowRight" ||
      e.key === "Home" ||
      e.key === "End"
    ) {
      resetTimer();
      return;
    }

    if (e.key.length === 1) {
      e.preventDefault();
      // use ref for immediate accurate state
      const shouldUpper = fakeCapsOnRef.current
        ? !shiftDownRef.current
        : shiftDownRef.current;
      let char = e.key;
      if (/^[a-zA-Z]$/.test(char)) {
        char = shouldUpper ? char.toUpperCase() : char.toLowerCase();
      }
      insertAtSelection(char);
      resetTimer();
      return;
    }
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Shift") shiftDownRef.current = false;
    resetTimer();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Accept value as-is — casing for printable keys is handled in handleKeyDown,
    // and paste is handled in handlePaste. This avoids re-casing the entire
    // string on backspace/delete.
    setValue(e.target.value);
    resetTimer();
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const paste = e.clipboardData.getData("text");
    const transformed = fakeCapsOnRef.current
      ? paste.toUpperCase()
      : paste.toLowerCase();
    const input = inputRef.current;
    if (!input) {
      setValue((v) => v + transformed);
      return;
    }
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? start;
    const newVal =
      input.value.slice(0, start) + transformed + input.value.slice(end);
    setValue(newVal);
    window.requestAnimationFrame(() => {
      const pos = start + transformed.length;
      input.setSelectionRange(pos, pos);
    });
    resetTimer();
  };

  // cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // when fakeCapsOn toggles off (via manual control), ensure timers are cleared
  useEffect(() => {
    if (!fakeCapsOnRef.current) clearTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fakeCapsOn]);

  // UI helpers
  const pctRemaining = fakeCapsOnRef.current
    ? Math.max(0, Math.round((remainingMs / timeoutMsRef.current) * 100))
    : 0;
  const statusColorClass = fakeCapsOnRef.current
    ? "text-red-700"
    : "text-green-800";
  const statusEmoji = fakeCapsOnRef.current ? "🔥" : "❄️";

  return (
    <div
      className="max-w-md mx-auto mt-6 select-none"
      style={{ fontFamily: 'Tahoma, "Segoe UI", sans-serif' }}
    >
      {/* Outer XP-style window - Perfect Luna Frame */}
      <div
        className="rounded-t-[8px] shadow-[4px_4px_10px_rgba(0,0,0,0.3)] overflow-hidden"
        style={{
          background: "#ece9d8",
          border: "3px solid #0054e3",
          borderTopWidth: "1px",
        }}
      >
        {/* Title bar - Multi-stop Royal Blue Gradient */}
        <div
          className="flex items-center justify-between px-2"
          style={{
            background:
              "linear-gradient(to bottom, #0058e6 0%, #003dbd 4%, #0055e5 6%, #08c 40%, #005ae7 88%, #005ae7 93%, #003dbd 95%, #003dbd 100%)",
            height: "28px",
            boxShadow: "inset 0 1px 1px rgba(255,255,255,0.5)",
          }}
        >
          <div className="flex justify-center items-center gap-1">
            <Image width={18} height={18} src={CapsCoolerIcon} alt={"icon"} />
            <div
              className="font-bold text-[13px] text-white tracking-wide"
              style={{ textShadow: "1px 1px 1px #000" }}
            >
              CapsCooler — Demo
            </div>
          </div>

          {/* Window buttons (decorative) - Authentic XP Styles */}
          <div className="flex items-center gap-[2px] pr-[3px] select-none">
            {/* Minimize Button */}
            <button
              aria-hidden
              className="w-[21px] h-[21px] flex items-center justify-center rounded-[3px] border border-white shadow-[1px_1px_1px_rgba(0,0,0,0.3)] active:brightness-90 transition-all"
              style={{
                background:
                  "linear-gradient(180deg, #4d89fa 0%, #2561e1 25%, #1049d3 50%, #063bb7 80%, #0c46d3 100%)",
              }}
            >
              <div
                style={{
                  width: "8px",
                  height: "3px",
                  background: "white",
                  alignSelf: "flex-end",
                  marginBottom: "3px",
                  filter: "drop-shadow(1px 1px 0px rgba(0,0,0,0.5))",
                }}
              />
            </button>

            {/* Maximize Button */}
            <button
              aria-hidden
              className="w-[21px] h-[21px] flex items-center justify-center rounded-[3px] border border-white shadow-[1px_1px_1px_rgba(0,0,0,0.3)] active:brightness-90 transition-all"
              style={{
                background:
                  "linear-gradient(180deg, #4d89fa 0%, #2561e1 25%, #1049d3 50%, #063bb7 80%, #0c46d3 100%)",
              }}
            >
              <div
                style={{
                  width: "9px",
                  height: "9px",
                  border: "2px solid white",
                  borderTopWidth: "3px",
                  filter: "drop-shadow(1px 1px 0px rgba(0,0,0,0.5))",
                }}
              />
            </button>

            {/* Close Button - Perfect Luna Red */}
            <button
              aria-hidden
              className="w-[21px] h-[21px] flex items-center justify-center rounded-[3px] border border-white shadow-[1px_1px_1px_rgba(0,0,0,0.4)] active:brightness-90 transition-all"
              style={{
                background:
                  "linear-gradient(180deg, #f3a08d 0%, #f1684a 25%, #d13a1a 50%, #b1250a 80%, #d43d1a 100%)",
              }}
            >
              <svg
                width="11"
                height="11"
                viewBox="0 0 11 11"
                fill="none"
                xmlns="http://www.w3.org"
                style={{ filter: "drop-shadow(1px 1px 0px rgba(0,0,0,0.5))" }}
              >
                <path
                  d="M1 1L9.5 9.5M9.5 1L1 9.5"
                  stroke="white"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Window content (panel) - Dialog Gray Body */}
        <div className="p-3" style={{ background: "#ece9d8" }}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-[14px] font-bold text-black uppercase tracking-tight">
                CAPS COOLER {statusEmoji}
              </h2>
              <div className="mt-1 text-xs" style={{ color: "#000" }}>
                Simulated Caps Lock inside this input only. <br /> This demo
                does <em>not</em> change your system Caps Lock state.
              </div>

              <div className="sr-only" role="status" aria-live="polite">
                Caps Cooler is {fakeCapsOnRef.current ? "ON" : "OFF"}.
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              <button
                type="button"
                onClick={() => toggleFakeCaps()}
                className="xp-button-perfect px-[12px] py-[3px] text-[11px]"
                style={{
                  fontFamily: "Tahoma, sans-serif",
                  color: "#000",
                  /* Exact Luna "Whiteish" button palette */
                  backgroundColor: "#f0f0f0",
                  backgroundImage:
                    "linear-gradient(to bottom, #fff 0%, #f0f0f0 10%, #f0f0f0 90%, #d8d2bd 100%)",
                  border: "1px solid #003c74", // The deep blue outer border
                  borderRadius: "3px",
                  boxShadow: "inset 1px 1px 0 #fff, inset -1px -1px 0 #d8d2bd",
                  outline: "none",
                  position: "relative",
                }}
                onMouseEnter={(e) => {
                  /* Hover State: Subtle Blue Highlight */
                  e.currentTarget.style.backgroundImage =
                    "linear-gradient(to bottom, #e5f1ff 0%, #cce4ff 10%, #cce4ff 90%, #a3c7f0 100%)";
                  e.currentTarget.style.borderColor = "#27408b";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundImage =
                    "linear-gradient(to bottom, #fff 0%, #f0f0f0 10%, #f0f0f0 90%, #d8d2bd 100%)";
                  e.currentTarget.style.borderColor = "#003c74";
                }}
                onMouseDown={(e) => {
                  /* Active State: The 1px "Physical" Push Shift */
                  e.currentTarget.style.padding = "4px 11px 2px 13px";
                  e.currentTarget.style.boxShadow =
                    "inset 1px 1px 0 #888, inset -1px -1px 0 #fff";
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.padding = "3px 12px 3px 12px";
                }}
              >
                {fakeCapsOnRef.current ? "ON — Turn OFF" : "Turn ON"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setValue("");
                  inputRef.current?.focus();
                }}
                className="xp-button-perfect px-[12px] py-[3px] text-[11px]"
                style={{
                  fontFamily: "Tahoma, sans-serif",
                  color: "#000",
                  backgroundColor: "#f0f0f0",
                  backgroundImage:
                    "linear-gradient(to bottom, #fff 0%, #f0f0f0 10%, #f0f0f0 90%, #d8d2bd 100%)",
                  border: "1px solid #003c74",
                  borderRadius: "3px",
                  boxShadow: "inset 1px 1px 0 #fff, inset -1px -1px 0 #d8d2bd",
                  outline: "none",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundImage =
                    "linear-gradient(to bottom, #e5f1ff 0%, #cce4ff 10%, #cce4ff 90%, #a3c7f0 100%)";
                  e.currentTarget.style.borderColor = "#27408b";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundImage =
                    "linear-gradient(to bottom, #fff 0%, #f0f0f0 10%, #f0f0f0 90%, #d8d2bd 100%)";
                  e.currentTarget.style.borderColor = "#003c74";
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.padding = "4px 11px 2px 13px";
                  e.currentTarget.style.boxShadow =
                    "inset 1px 1px 0 #888, inset -1px -1px 0 #fff";
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.padding = "3px 12px 3px 12px";
                }}
              >
                Clear
              </button>
            </div>
          </div>

          {/* Input row */}
          <div className="mt-4">
            <label
              htmlFor="caps-input"
              className="block text-[11px] mb-1 text-black"
            >
              Type (press CapsLock)
            </label>
            <input
              id="caps-input"
              ref={inputRef}
              type="text"
              value={value}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onKeyUp={handleKeyUp}
              onPaste={handlePaste}
              placeholder="Type here… (demo only)"
              className="w-full px-2 py-1 text-sm border-2"
              style={{
                background: "white",
                borderColor: "#7f9db9", // Official XP Input Border
                outline: "none",
                borderRadius: 0,
              }}
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
            />
          </div>

          {/* timer + progress */}
          <div className="mt-4 flex items-center justify-between gap-4 select-none">
            <div
              style={{
                color: "#000",
                fontFamily: "Tahoma, sans-serif",
                fontSize: "11px",
                fontWeight: "bold",
              }}
            >
              {fakeCapsOnRef.current ? (
                <>Auto-turn-off in {Math.ceil(remainingMs / 1000)}s</>
              ) : (
                <>Demo idle timeout</>
              )}
            </div>

            <div
              style={{
                width: 160,
                height: 18,
                backgroundColor: "#fff",
                border: "1px solid #7f9db9",
                padding: "2px 1px 2px 2px",
                display: "grid",
                gridTemplateColumns: "repeat(16, 1fr)",
                gap: "2px",
                boxShadow: "inset 1px 1px 1px rgba(0,0,0,0.1)",
              }}
            >
              {[...Array(16)].map((_, i) => {
                const isVisible = (i + 1) / 16 <= pctRemaining / 100;
                return (
                  <div
                    key={i}
                    style={{
                      height: "100%",
                      width: "8px",
                      opacity: isVisible ? 1 : 0,
                      background:
                        "linear-gradient(to bottom, " +
                        "#90e044 0%, " +
                        "#63b318 20%, " +
                        "#46a610 45%, " +
                        "#285a00 50%, " +
                        "#388a08 55%, " +
                        "#85d045 100%)",
                      boxShadow: "inset 1px 1px 0 rgba(255,255,255,0.4)",
                      borderRadius: "1px",
                    }}
                  />
                );
              })}
            </div>
          </div>

          <p className="mt-1 mb-2 text-xs" style={{ color: "#000" }}>
            The actual app runs in the background as a tray app, and does not
            have any visual idle timer.
          </p>

          {/* Delay config input */}
          <div
            className="mb-6 flex items-center gap-2"
            style={{ fontFamily: "Tahoma, sans-serif" }}
          >
            <label
              htmlFor="delay-input"
              className="text-[11px] text-black font-bold whitespace-nowrap"
            >
              Delay (ms):
            </label>
            <input
              id="delay-input"
              type="number"
              min={500}
              step={500}
              value={timeoutMs}
              onChange={(e) => handleTimeoutChange(Number(e.target.value))}
              className="w-[72px] px-1 py-[2px] text-[11px] border"
              style={{
                background: "white",
                borderColor: "#7f9db9",
                outline: "none",
                borderRadius: 0,
                fontFamily: "Tahoma, sans-serif",
                color: "#000",
              }}
            />
            <span className="text-[10px] text-black">
              Simulates the{" "}
              <code
                style={{
                  background: "#ddd",
                  padding: "0 2px",
                  fontSize: "10px",
                }}
              >
                delay_ms
              </code>{" "}
              value from the config file.
            </span>
          </div>

          <p className="mt-3 text-xs" style={{ color: "#000" }}>
            ⚠️ <strong>Note:</strong> This demo simulates only the effect of
            CapsCooler. The code running this simulator is in no way similar to
            the actual C++ code of my CapsCooler program. This is only meant to
            replicate the typing experience.
          </p>
        </div>
      </div>
    </div>
  );
}
