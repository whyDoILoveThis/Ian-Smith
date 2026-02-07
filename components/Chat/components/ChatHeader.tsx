"use client";

import React, { useState } from "react";
import { Pencil, X } from "lucide-react";
import type { CallStatus, ChatTheme } from "../types";
import { CallButton } from "./CallButton";
import { DRAWING_COLORS } from "../hooks/useDrawing";
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

  const handlePencilClick = () => {
    if (selectedDrawingColor) {
      // If drawing mode is on, toggle color picker
      setShowColorPicker(!showColorPicker);
    } else {
      // If drawing mode is off, show color picker
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
              activeTab === "room" ? "bg-amber-500" : "bg-emerald-500"
            }`}
          >
            <span
              className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-md transition-all duration-200 ease-out ${
                activeTab === "room" ? "left-[calc(100%-1.625rem)]" : "left-0.5"
              }`}
            />
          </button>
          <span className="text-sm font-semibold text-white">
            {activeTab === "chat" ? "Chat v1.3" : "Room v1.4"}
          </span>
        </div>

        {/* Center: Call Button + Pencil */}
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
              type="button"
              onClick={handlePencilClick}
              className={`p-1.5 rounded-full transition-all ${
                selectedDrawingColor
                  ? "ring-2 ring-offset-1 ring-offset-black/60"
                  : "hover:bg-white/10"
              }`}
              style={
                selectedDrawingColor
                  ? { backgroundColor: selectedDrawingColor, color: "white" }
                  : { color: "white" }
              }
            >
              <Pencil className="w-5 h-5" />
            </button>

            {/* Color Picker Popup - fixed centered on screen */}
            {showColorPicker && (
              <div className="fixed left-1/2 top-14 -translate-x-1/2 p-2 bg-black/90 backdrop-blur-sm rounded-xl border border-white/20 shadow-xl z-[200]">
                <div className="flex items-center gap-1.5">
                  {DRAWING_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => handleColorSelect(color)}
                      className={`w-6 h-6 rounded-full transition-transform hover:scale-110 ${
                        selectedDrawingColor === color
                          ? "ring-2 ring-white ring-offset-1 ring-offset-black/90 scale-110"
                          : ""
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                  {/* Deselect button */}
                  <button
                    type="button"
                    onClick={handleDeselect}
                    className="w-6 h-6 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors ml-1"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Theme Switcher Dropdown */}
        <div className="relative">
          <button
            type="button"
            className={`h-7 w-7 rounded-full flex items-center justify-center transition-all border border-white/20
              active:ring-2 ring-white/20`}
            onClick={() => setShowThemePicker((v) => !v)}
            title="Change theme color"
          >
            <PaintBucketIcon />
          </button>
          {showThemePicker && (
            <div className="fixed right-4 top-14 p-2 bg-black/90 backdrop-blur-sm rounded-xl border border-white/20 shadow-xl z-[200]">
              <div className="flex items-center gap-1.5">
                {(["emerald", "blue", "purple", "rose"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      handleThemeChange(t);
                      setShowThemePicker(false);
                    }}
                    className={`w-6 h-6 rounded-full transition-transform hover:scale-110 ${
                      chatTheme === t
                        ? "ring-2 ring-white ring-offset-1 ring-offset-black/90 scale-110"
                        : ""
                    }`}
                    style={{
                      backgroundColor:
                        t === "emerald"
                          ? "#34d399"
                          : t === "blue"
                            ? "#3b82f6"
                            : t === "purple"
                              ? "#a855f7"
                              : "#f43f5e",
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
