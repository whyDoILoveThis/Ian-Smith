"use client";

import React, { useState, useRef, useEffect } from "react";
import { Pencil, X } from "lucide-react";
import type { CallStatus, ChatTheme } from "../types";
import { CallButton } from "./CallButton";
import { DRAWING_COLORS, NEON_COLORS } from "../hooks/useDrawing";
import ColorFilterIcon from "@/components/sub/ColorFilterIcon";
import PaintBucketIcon from "./PaintBucketIcon";

type ChatHeaderProps = {
  activeTab: "chat" | "room";
  setActiveTab: (tab: "chat" | "room") => void;
  chatTheme: ChatTheme;
  handleThemeChange: (theme: ChatTheme) => void;
  slotId: "1" | "2" | null;
  callStatus: CallStatus;
  otherPersonOnline: boolean;
  onStartCall: () => void;
  selectedDrawingColor: string | null;
  onSelectDrawingColor: (color: string | null) => void;
};

export function ChatHeader({
  activeTab,
  setActiveTab,
  chatTheme,
  handleThemeChange,
  slotId,
  callStatus,
  otherPersonOnline,
  onStartCall,
  selectedDrawingColor,
  onSelectDrawingColor,
}: ChatHeaderProps) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const themePickerRef = useRef<HTMLDivElement>(null);
  const pencilButtonRef = useRef<HTMLButtonElement>(null);
  const themeButtonRef = useRef<HTMLButtonElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;

      // Close color picker if clicking outside of it and the pencil button
      if (
        showColorPicker &&
        colorPickerRef.current &&
        !colorPickerRef.current.contains(target) &&
        pencilButtonRef.current &&
        !pencilButtonRef.current.contains(target)
      ) {
        setShowColorPicker(false);
      }

      // Close theme picker if clicking outside of it and the theme button
      if (
        showThemePicker &&
        themePickerRef.current &&
        !themePickerRef.current.contains(target) &&
        themeButtonRef.current &&
        !themeButtonRef.current.contains(target)
      ) {
        setShowThemePicker(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showColorPicker, showThemePicker]);

  const handlePencilClick = () => {
    if (showColorPicker) {
      // If color picker is open, close it and deselect
      setShowColorPicker(false);
      onSelectDrawingColor(null);
    } else {
      // If color picker is closed, open it
      setShowColorPicker(true);
    }
  };

  const handleColorSelect = (color: string) => {
    onSelectDrawingColor(color);
    setShowColorPicker(false);
  };

  const handleDeselect = () => {
    onSelectDrawingColor(null);
    setShowColorPicker(false);
  };

  return (
    <div className="flex-shrink-0 border-b border-white/10 bg-black/60 px-3 py-2 safe-area-inset-top">
      <div className="flex items-center justify-between gap-2">
        {/* Left: Toggle & Title */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab(activeTab === "chat" ? "room" : "chat")}
            className={`relative h-7 w-14 rounded-full transition-colors duration-200 ${
              activeTab === "room" ? "bg-amber-500" : `bg-${chatTheme}-500`
            }`}
          >
            <span
              className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-md transition-all duration-200 ease-out ${
                activeTab === "room" ? "left-[calc(100%-1.625rem)]" : "left-0.5"
              }`}
            />
          </button>
          <span className="text-sm font-semibold text-white flex items-center gap-1.5">
            {activeTab === "chat" ? (
              <span>
                Chat <span className="text-[8px]">v1.4</span>
              </span>
            ) : (
              <span>
                Room <span className="text-[8px]">v1.5</span>
              </span>
            )}
            {otherPersonOnline && (
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
              </span>
            )}
          </span>
        </div>

        {/* Right: Call, Pencil, Theme */}
        <div className="flex items-center gap-2">
          <CallButton
            slotId={slotId}
            callStatus={callStatus}
            otherPersonOnline={otherPersonOnline}
            onStartCall={onStartCall}
          />
          {/* Pencil Button */}
          <div className="relative">
            <button
              ref={pencilButtonRef}
              type="button"
              onClick={handlePencilClick}
              className={`h-7 w-7 rounded-full flex items-center justify-center transition-all active:ring-2 ring-white/20 ${
                selectedDrawingColor
                  ? "ring-2 ring-offset-1 ring-offset-black/60"
                  : "hover:bg-white/10"
              }`}
              style={
                selectedDrawingColor
                  ? { backgroundColor: selectedDrawingColor, color: "white" }
                  : { color: "white" }
              }
              title="Drawing color picker"
            >
              <Pencil className="w-5 h-5" />
            </button>
            {/* Color Picker Popup - rainbow palette grid with circles */}
            {showColorPicker && (
              <div
                ref={colorPickerRef}
                className="fixed left-1/2 top-14 -translate-x-1/2 p-3 bg-black/95 backdrop-blur-md rounded-2xl border border-white/20 shadow-2xl z-[200] max-w-[95vw]"
              >
                <div className="grid grid-cols-11 gap-1.5">
                  {DRAWING_COLORS.map((color, index) => {
                    const isNeon = NEON_COLORS.includes(color);
                    return (
                      <button
                        key={`${color}-${index}`}
                        type="button"
                        onClick={() => handleColorSelect(color)}
                        className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full transition-all hover:scale-125 hover:z-10 ${
                          selectedDrawingColor === color
                            ? "ring-2 ring-white ring-offset-1 ring-offset-black/90 scale-110 z-10"
                            : "hover:ring-1 hover:ring-white/50"
                        }`}
                        style={{
                          backgroundColor: color,
                          boxShadow: isNeon
                            ? `0 0 8px ${color}, 0 0 16px ${color}, 0 0 24px ${color}80`
                            : undefined,
                        }}
                        title={color}
                      />
                    );
                  })}
                </div>
                {/* Deselect button */}
                <button
                  type="button"
                  onClick={handleDeselect}
                  className="mt-2 w-full py-1.5 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center gap-2 transition-colors text-white text-xs font-medium"
                >
                  <X className="w-4 h-4" />
                  Clear Drawing Mode
                </button>
              </div>
            )}
          </div>
          {/* Theme Switcher Dropdown */}
          <div className="relative">
            <button
              ref={themeButtonRef}
              type="button"
              onClick={() => setShowThemePicker((v) => !v)}
              className={`h-7 w-7 rounded-full flex items-center justify-center transition-all active:ring-2 ring-white/20 ${
                chatTheme
                  ? "ring-2 ring-offset-1 ring-offset-black/60"
                  : "hover:bg-white/10"
              }`}
              style={{
                backgroundColor:
                  chatTheme === "red"
                    ? "#ef4444"
                    : chatTheme === "orange"
                      ? "#f97316"
                      : chatTheme === "yellow"
                        ? "#facc15"
                        : chatTheme === "green"
                          ? "#22c55e"
                          : chatTheme === "emerald"
                            ? "#34d399"
                            : chatTheme === "cyan"
                              ? "#06b6d4"
                              : chatTheme === "blue"
                                ? "#3b82f6"
                                : chatTheme === "purple"
                                  ? "#a855f7"
                                  : chatTheme === "pink"
                                    ? "#ec4899"
                                    : chatTheme === "rose"
                                      ? "#f43f5e"
                                      : undefined,
                color: "white",
              }}
              title="Change theme color"
            >
              <PaintBucketIcon />
            </button>
            {showThemePicker && (
              <div
                ref={themePickerRef}
                className="fixed right-4 top-14 p-2 bg-black/90 backdrop-blur-sm rounded-xl border border-white/20 shadow-xl z-[200]"
              >
                <div className="flex items-center gap-1.5">
                  {[
                    { key: "red", color: "#ef4444" },
                    { key: "orange", color: "#f97316" },
                    { key: "yellow", color: "#facc15" },
                    { key: "green", color: "#22c55e" },
                    { key: "emerald", color: "#34d399" },
                    { key: "cyan", color: "#06b6d4" },
                    { key: "blue", color: "#3b82f6" },
                    { key: "purple", color: "#a855f7" },
                    { key: "pink", color: "#ec4899" },
                    { key: "rose", color: "#f43f5e" },
                  ].map(({ key, color }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        handleThemeChange(key as ChatTheme);
                        setShowThemePicker(false);
                      }}
                      className={`w-6 h-6 rounded-full transition-transform hover:scale-110 ${
                        chatTheme === key
                          ? "ring-2 ring-white ring-offset-1 ring-offset-black/90 scale-110"
                          : ""
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
