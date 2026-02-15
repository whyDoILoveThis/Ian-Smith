"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { Pencil, X, Search, ChevronUp, ChevronDown } from "lucide-react";
import type { CallStatus, ChatTheme, Message, Slots } from "../types";
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
  otherLastSeen: number | null;
  onStartCall: () => void;
  selectedDrawingColor: string | null;
  onSelectDrawingColor: (color: string | null) => void;
  isRecordingDrawing: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  // Search props
  messages: Message[];
  slots: Slots;
  onScrollToMessage?: (messageId: string) => void;
};

export function ChatHeader({
  activeTab,
  setActiveTab,
  chatTheme,
  handleThemeChange,
  slotId,
  callStatus,
  otherPersonOnline,
  otherLastSeen,
  onStartCall,
  selectedDrawingColor,
  onSelectDrawingColor,
  isRecordingDrawing,
  onStartRecording,
  onStopRecording,
  messages,
  slots,
  onScrollToMessage,
}: ChatHeaderProps) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const themePickerRef = useRef<HTMLDivElement>(null);
  const pencilButtonRef = useRef<HTMLButtonElement>(null);
  const themeButtonRef = useRef<HTMLButtonElement>(null);

  // Search state
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [userFilter, setUserFilter] = useState<Set<"1" | "2">>(
    new Set<"1" | "2">(["1", "2"]),
  );
  const [currentResultIndex, setCurrentResultIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchPanelRef = useRef<HTMLDivElement>(null);

  // Get unique sender names from slots
  const slot1Name = slots?.["1"]?.name || "User 1";
  const slot2Name = slots?.["2"]?.name || "User 2";

  // Search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return messages.filter((msg) => {
      // Filter by user
      if (!userFilter.has(msg.slotId)) return false;
      // Filter by text content
      const text = msg.decryptedText?.toLowerCase() || "";
      if (text.includes(query)) return true;
      // Filter by date/time
      if (typeof msg.createdAt === "number") {
        const date = new Date(msg.createdAt);
        if (!Number.isNaN(date.getTime())) {
          // Match against multiple date formats so users can type naturally
          const formats = [
            date.toLocaleDateString([], { month: "short", day: "numeric" }), // "Feb 10"
            date.toLocaleDateString([], { month: "long", day: "numeric" }), // "February 10"
            date.toLocaleDateString([], {
              month: "short",
              day: "numeric",
              year: "numeric",
            }), // "Feb 10, 2026"
            date.toLocaleDateString([], { month: "numeric", day: "numeric" }), // "2/10"
            date.toLocaleDateString([], {
              month: "numeric",
              day: "numeric",
              year: "numeric",
            }), // "2/10/2026"
            date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), // "10:30 AM"
            date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }), // "10:30 AM"
          ].map((s) => s.toLowerCase());
          if (formats.some((f) => f.includes(query))) return true;
        }
      }
      return false;
    });
  }, [messages, searchQuery, userFilter]);

  // Reset result index when results change
  useEffect(() => {
    setCurrentResultIndex(0);
  }, [searchResults.length, searchQuery, userFilter]);

  // Focus search input when opened
  useEffect(() => {
    if (showSearch) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    } else {
      setSearchQuery("");
      setCurrentResultIndex(0);
      setUserFilter(new Set<"1" | "2">(["1", "2"]));
    }
  }, [showSearch]);

  // Navigate to current result
  const navigateToResult = useCallback(
    (index: number) => {
      if (searchResults.length === 0) return;
      const clamped = Math.max(0, Math.min(index, searchResults.length - 1));
      setCurrentResultIndex(clamped);
      onScrollToMessage?.(searchResults[clamped].id);
    },
    [searchResults, onScrollToMessage],
  );

  const toggleUserFilter = (slot: "1" | "2") => {
    setUserFilter((prev) => {
      const next = new Set<"1" | "2">(prev);
      if (next.has(slot)) {
        // Don't allow deselecting both
        if (next.size > 1) next.delete(slot);
      } else {
        next.add(slot);
      }
      return next;
    });
  };

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
                Chat <span className="text-[8px]">v2.0</span>
              </span>
            ) : (
              <span>
                Room <span className="text-[8px]">v2.0</span>
              </span>
            )}
            {otherPersonOnline ? (
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
              </span>
            ) : otherLastSeen ? (
              <span className="text-[9px] font-normal text-neutral-500 ml-0.5">
                last seen{" "}
                {(() => {
                  const now = Date.now();
                  const diff = now - otherLastSeen;
                  const mins = Math.floor(diff / 60000);
                  const hours = Math.floor(diff / 3600000);
                  const days = Math.floor(diff / 86400000);
                  if (mins < 1) return "just now";
                  if (mins < 60) return `${mins}m ago`;
                  if (hours < 24) return `${hours}h ago`;
                  if (days < 7) return `${days}d ago`;
                  return new Date(otherLastSeen).toLocaleDateString([], {
                    month: "short",
                    day: "numeric",
                  });
                })()}
              </span>
            ) : null}
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
          <div className="relative flex items-center gap-1">
            {/* Recording indicator - dark grey circle with pulsing red dot */}
            {isRecordingDrawing && (
              <button
                type="button"
                onClick={onStopRecording}
                className="h-6 w-6 rounded-full bg-neutral-700 flex items-center justify-center hover:bg-neutral-600 transition-colors"
                title="Stop recording"
              >
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
                </span>
              </button>
            )}
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
                {/* Record Drawing button */}
                <button
                  type="button"
                  onClick={() => {
                    onStartRecording();
                    setShowColorPicker(false);
                  }}
                  disabled={!selectedDrawingColor || isRecordingDrawing}
                  className="mt-2 w-full py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 flex items-center justify-center gap-2 transition-colors text-red-300 text-xs font-medium disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                  </span>
                  Record Drawing
                </button>
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
          {/* Search Button */}
          <button
            type="button"
            onClick={() => setShowSearch((v) => !v)}
            className={`h-7 w-7 rounded-full flex items-center justify-center transition-all active:ring-2 ring-white/20 ${
              showSearch
                ? "bg-white/20 ring-2 ring-offset-1 ring-offset-black/60 ring-white/40"
                : "hover:bg-white/10"
            }`}
            style={{ color: "white" }}
            title="Search messages"
          >
            <Search className="w-5 h-5" />
          </button>
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

      {/* Search Panel */}
      {showSearch && (
        <div
          ref={searchPanelRef}
          className="mt-2 flex flex-col gap-2 animate-in slide-in-from-top-2 duration-200"
        >
          {/* Search input + navigation */}
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    if (e.shiftKey) {
                      navigateToResult(currentResultIndex - 1);
                    } else {
                      navigateToResult(currentResultIndex + 1);
                    }
                  } else if (e.key === "Escape") {
                    setShowSearch(false);
                  }
                }}
                placeholder="Search messages..."
                className="w-full pl-8 pr-3 py-1.5 text-sm bg-white/10 border border-white/10 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-white/30 focus:bg-white/15 transition-colors"
              />
            </div>
            {/* Result count + nav arrows */}
            {searchQuery.trim() && (
              <div className="flex items-center gap-1">
                <span className="text-[11px] text-neutral-400 whitespace-nowrap min-w-[3rem] text-center">
                  {searchResults.length === 0
                    ? "0/0"
                    : `${currentResultIndex + 1}/${searchResults.length}`}
                </span>
                <button
                  type="button"
                  onClick={() => navigateToResult(currentResultIndex - 1)}
                  disabled={
                    searchResults.length === 0 || currentResultIndex === 0
                  }
                  className="h-6 w-6 rounded flex items-center justify-center text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => navigateToResult(currentResultIndex + 1)}
                  disabled={
                    searchResults.length === 0 ||
                    currentResultIndex >= searchResults.length - 1
                  }
                  className="h-6 w-6 rounded flex items-center justify-center text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={() => setShowSearch(false)}
              className="h-6 w-6 rounded flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* User filter pills */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-neutral-500 uppercase tracking-wider">
              Filter:
            </span>
            <button
              type="button"
              onClick={() => toggleUserFilter("1")}
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-all border ${
                userFilter.has("1")
                  ? "bg-white/15 border-white/30 text-white"
                  : "bg-transparent border-white/10 text-neutral-500"
              }`}
            >
              {slot1Name}
            </button>
            <button
              type="button"
              onClick={() => toggleUserFilter("2")}
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-all border ${
                userFilter.has("2")
                  ? "bg-white/15 border-white/30 text-white"
                  : "bg-transparent border-white/10 text-neutral-500"
              }`}
            >
              {slot2Name}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
