"use client";

import React from "react";
import { RING_COLORS } from "../constants";
import type { ChatTheme } from "../types";

type ChatHeaderProps = {
  activeTab: "chat" | "room";
  setActiveTab: (tab: "chat" | "room") => void;
  combo: [number, number, number, number] | null;
  chatTheme: ChatTheme;
  handleThemeChange: (theme: ChatTheme) => void;
  onEditPasskey: () => void;
};

export function ChatHeader({
  activeTab,
  setActiveTab,
  combo,
  chatTheme,
  handleThemeChange,
  onEditPasskey,
}: ChatHeaderProps) {
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
            {activeTab === "chat" ? "Chat" : "Room"}
          </span>
        </div>

        {/* Center: Passkey */}
        {combo && (
          <div className="flex items-center gap-1.5">
            {combo.map((value, index) => (
              <span
                key={`${value}-${index}`}
                className="text-xs font-bold"
                style={{ color: RING_COLORS[index] }}
              >
                {value}
              </span>
            ))}
            <button
              type="button"
              onClick={onEditPasskey}
              className="ml-1 text-neutral-400 hover:text-white text-xs"
            >
              ✎
            </button>
          </div>
        )}

        {/* Right: Theme Switcher */}
        <div className="flex gap-1">
          {(["emerald", "blue", "purple", "rose"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => handleThemeChange(t)}
              className={`h-4 w-4 rounded-full transition-transform ${
                t === "emerald"
                  ? "bg-emerald-400"
                  : t === "blue"
                    ? "bg-blue-500"
                    : t === "purple"
                      ? "bg-purple-500"
                      : "bg-rose-500"
              } ${chatTheme === t ? "ring-2 ring-white scale-110" : "opacity-50"}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
