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
  gradientColors: string[];
  handleGradientColorsChange: (colors: string[]) => void;
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
  hasMoreOnServer?: boolean;
  isLoadingAll?: boolean;
  loadAllProgress?: number;
  onLoadAll?: () => void;
};

export function ChatHeader({
  activeTab,
  setActiveTab,
  chatTheme,
  handleThemeChange,
  gradientColors,
  handleGradientColorsChange,
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
  hasMoreOnServer,
  isLoadingAll,
  loadAllProgress,
  onLoadAll,
}: ChatHeaderProps) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showGradientPicker, setShowGradientPicker] = useState(false);
  const [pendingGradient, setPendingGradient] = useState<string[]>([]);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const themePickerRef = useRef<HTMLDivElement>(null);
  const pencilButtonRef = useRef<HTMLButtonElement>(null);
  const themeButtonRef = useRef<HTMLButtonElement>(null);

  // Search state
  const [showSearch, setShowSearch] = useState(false);
  const [searchInput, setSearchInput] = useState(""); // instant typing
  const [searchQuery, setSearchQuery] = useState(""); // debounced for filtering
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [userFilter, setUserFilter] = useState<Set<"1" | "2">>(
    new Set<"1" | "2">(["1", "2"]),
  );
  const [currentResultIndex, setCurrentResultIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchPanelRef = useRef<HTMLDivElement>(null);

  // Debounce: update the actual search query 250ms after the user stops typing
  const handleSearchInputChange = useCallback((value: string) => {
    setSearchInput(value);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setSearchQuery(value);
    }, 250);
  }, []);

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, []);

  // Get unique sender names from slots
  const slot1Name = slots?.["1"]?.name || "User 1";
  const slot2Name = slots?.["2"]?.name || "User 2";

  // Cache for date search strings — computed once per message, reused across searches
  const dateSearchCacheRef = useRef<Map<string, string>>(new Map());

  // Lazily build the date search string for a message
  const getDateSearchString = useCallback((msg: Message): string => {
    const cache = dateSearchCacheRef.current;
    const cached = cache.get(msg.id);
    if (cached !== undefined) return cached;

    if (typeof msg.createdAt !== "number") {
      cache.set(msg.id, "");
      return "";
    }
    const date = new Date(msg.createdAt);
    if (Number.isNaN(date.getTime())) {
      cache.set(msg.id, "");
      return "";
    }
    // Combine all date formats into one searchable string
    const str = [
      date.toLocaleDateString([], { month: "short", day: "numeric" }),
      date.toLocaleDateString([], { month: "long", day: "numeric" }),
      date.toLocaleDateString([], {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      date.toLocaleDateString([], { month: "numeric", day: "numeric" }),
      date.toLocaleDateString([], {
        month: "numeric",
        day: "numeric",
        year: "numeric",
      }),
      date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
    ]
      .join(" ")
      .toLowerCase();

    cache.set(msg.id, str);
    return str;
  }, []);

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
      // Filter by date/time via cached string
      const dateStr = getDateSearchString(msg);
      if (dateStr && dateStr.includes(query)) return true;
      return false;
    });
  }, [messages, searchQuery, userFilter, getDateSearchString]);

  // Reset result index when results change
  useEffect(() => {
    setCurrentResultIndex(0);
  }, [searchResults.length, searchQuery, userFilter]);

  // Focus search input when opened
  useEffect(() => {
    if (showSearch) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    } else {
      setSearchInput("");
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
              activeTab === "room"
                ? "bg-amber-500"
                : chatTheme === "gradient"
                  ? ""
                  : `bg-${chatTheme}-500`
            }`}
            style={
              activeTab !== "room" &&
              chatTheme === "gradient" &&
              gradientColors.length >= 2
                ? {
                    background: `linear-gradient(to right, ${gradientColors.join(", ")})`,
                  }
                : undefined
            }
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
                Chat <span className="text-[8px]">v2.4</span>
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
                ...(chatTheme === "gradient" && gradientColors.length >= 2
                  ? {
                      background: `linear-gradient(135deg, ${gradientColors.join(", ")})`,
                      backgroundColor: undefined,
                    }
                  : {}),
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
                {/** hack for making color work in template strings with tailwind*/}
                <div className="border-[#a855f7]-400 border display-none" />
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
                        setShowGradientPicker(false);
                      }}
                      className={`w-6 h-6 rounded-full transition-transform hover:scale-110 ${
                        chatTheme === key
                          ? "ring-2 ring-white ring-offset-1 ring-offset-black/90 scale-110"
                          : ""
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                  {/* Gradient button */}
                  <button
                    type="button"
                    onClick={() => {
                      setPendingGradient(
                        gradientColors.length >= 2 ? [...gradientColors] : [],
                      );
                      setShowGradientPicker((v) => !v);
                    }}
                    className={`w-6 h-6 rounded-full transition-transform hover:scale-110 border border-white/20 ${
                      chatTheme === "gradient"
                        ? "ring-2 ring-white ring-offset-1 ring-offset-black/90 scale-110"
                        : ""
                    }`}
                    style={{
                      background:
                        gradientColors.length >= 2
                          ? `linear-gradient(135deg, ${gradientColors.join(", ")})`
                          : "conic-gradient(#ef4444, #f97316, #facc15, #22c55e, #3b82f6, #a855f7, #ec4899, #ef4444)",
                    }}
                    title="Gradient theme"
                  />
                </div>

                {/* Gradient color picker sub-panel */}
                {showGradientPicker && (
                  <div className="mt-2 pt-2 border-t border-white/10">
                    <div className="text-[10px] text-white/50 font-medium uppercase tracking-wider mb-1.5">
                      Pick{" "}
                      {pendingGradient.length >= 3
                        ? "3/3"
                        : `${pendingGradient.length}/3`}{" "}
                      colors
                    </div>

                    {/* Selected gradient preview + chips */}
                    {pendingGradient.length >= 1 && (
                      <div className="flex items-center gap-1.5 mb-2">
                        {pendingGradient.map((c, i) => (
                          <button
                            key={`${c}-${i}`}
                            type="button"
                            onClick={() => {
                              setPendingGradient((prev) =>
                                prev.filter((_, j) => j !== i),
                              );
                            }}
                            className="w-5 h-5 rounded-full ring-1 ring-white/30 hover:ring-red-400 transition-all relative group"
                            style={{ backgroundColor: c }}
                            title="Click to remove"
                          >
                            <span className="absolute inset-0 flex items-center justify-center text-[8px] text-white opacity-0 group-hover:opacity-100 font-bold drop-shadow">
                              ✕
                            </span>
                          </button>
                        ))}
                        {pendingGradient.length >= 2 && (
                          <div
                            className="flex-1 h-4 rounded-full"
                            style={{
                              background: `linear-gradient(to right, ${pendingGradient.join(", ")})`,
                            }}
                          />
                        )}
                      </div>
                    )}

                    {/* Color palette */}
                    <div className="flex flex-wrap gap-1">
                      {[
                        "#ef4444",
                        "#f97316",
                        "#facc15",
                        "#22c55e",
                        "#34d399",
                        "#06b6d4",
                        "#3b82f6",
                        "#6366f1",
                        "#a855f7",
                        "#ec4899",
                        "#f43f5e",
                        "#f472b6",
                        "#fb923c",
                        "#a3e635",
                        "#2dd4bf",
                        "#38bdf8",
                        "#818cf8",
                        "#c084fc",
                        "#ffffff",
                        "#000000",
                      ].map((c) => (
                        <button
                          key={c}
                          type="button"
                          disabled={pendingGradient.length >= 3}
                          onClick={() => {
                            if (pendingGradient.length < 3) {
                              setPendingGradient((prev) => [...prev, c]);
                            }
                          }}
                          className={`w-5 h-5 rounded-full transition-transform hover:scale-125 disabled:opacity-30 disabled:cursor-not-allowed ${
                            c === "#ffffff" ? "border border-white/30" : ""
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>

                    {/* Apply button */}
                    <button
                      type="button"
                      disabled={pendingGradient.length < 2}
                      onClick={() => {
                        handleGradientColorsChange(pendingGradient);
                        handleThemeChange("gradient");
                        setShowGradientPicker(false);
                        setShowThemePicker(false);
                      }}
                      className="mt-2 w-full py-1 rounded-lg text-[10px] font-semibold text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      style={{
                        background:
                          pendingGradient.length >= 2
                            ? `linear-gradient(to right, ${pendingGradient.join(", ")})`
                            : "rgba(255,255,255,0.1)",
                      }}
                    >
                      Apply Gradient
                    </button>
                  </div>
                )}
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
                value={searchInput}
                onChange={(e) => handleSearchInputChange(e.target.value)}
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
            {searchInput.trim() && (
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

          {/* User filter pills + Load All */}
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

            {/* Load All Messages button */}
            {hasMoreOnServer && !isLoadingAll && (
              <button
                type="button"
                onClick={onLoadAll}
                className="ml-auto px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-all border bg-emerald-500/15 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 flex items-center gap-1"
              >
                Find All Msgs
              </button>
            )}
            {isLoadingAll && (
              <div className="ml-auto flex items-center gap-2 min-w-[140px]">
                <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-emerald-400/80 rounded-full transition-all duration-300 ease-out"
                    style={{
                      width: `${Math.min(95, ((loadAllProgress || 0) / ((loadAllProgress || 0) + 200)) * 100)}%`,
                    }}
                  />
                </div>
                <span className="text-[10px] text-emerald-300 tabular-nums whitespace-nowrap">
                  {loadAllProgress?.toLocaleString()} loaded
                </span>
              </div>
            )}
            {!hasMoreOnServer && !isLoadingAll && (
              <span className="ml-auto text-[10px] text-emerald-400/60 flex items-center gap-1">
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                All {messages.length.toLocaleString()} msgs loaded
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
