"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { ref, get, query, orderByKey } from "firebase/database";
import { rtdb } from "@/lib/firebaseConfig";
import { RING_COLORS, THEME_COLORS } from "../constants";
import type { Message, Slots, TttState, ThemeColors } from "../types";
import { WordSearchGame } from "./WordSearchGame";
import { ColorWheelPicker } from "./ColorWheelPicker";
import { PhotoGalleryOverlay } from "./PhotoGalleryOverlay";
import { DrawingGalleryOverlay } from "./DrawingGalleryOverlay";

// ─── Tic-Tac-Toe winning line overlay ───────────────────────────────────────
function WinningLineOverlay({
  line,
  winner,
}: {
  line: number[];
  winner: "1" | "2";
}) {
  const getCellCenter = (idx: number) => {
    const row = Math.floor(idx / 3);
    const col = idx % 3;
    return { x: col * 60 + 30, y: row * 60 + 30 };
  };

  const start = getCellCenter(line[0]);
  const end = getCellCenter(line[2]);
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
  const centerX = (start.x + end.x) / 2;
  const centerY = (start.y + end.y) / 2;
  const color = winner === "1" ? "bg-emerald-400" : "bg-amber-400";

  return (
    <div
      className={`absolute ${color} rounded-full z-10`}
      style={{
        width: `${length + 20}px`,
        height: "4px",
        left: `${centerX}px`,
        top: `${centerY}px`,
        transform: `translate(-50%, -50%) rotate(${angle}deg)`,
      }}
    />
  );
}

// ─── Collapsible section wrapper ────────────────────────────────────────────
function Section({
  icon,
  title,
  children,
  badge,
  defaultOpen = true,
  accentColor,
}: {
  icon: string;
  title: string;
  children: React.ReactNode;
  badge?: React.ReactNode;
  defaultOpen?: boolean;
  accentColor?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2.5 px-4 py-3 text-left hover:bg-white/[0.03] transition-colors"
      >
        <span className="text-sm shrink-0">{icon}</span>
        <span
          className={`text-xs font-semibold flex-1 ${accentColor || "text-white"}`}
        >
          {title}
        </span>
        {badge}
        <span
          className={`text-[10px] text-neutral-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          ▼
        </span>
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 animate-in slide-in-from-top-1 duration-150">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Props ──────────────────────────────────────────────────────────────────
type RoomSpotsViewProps = {
  slots: Slots;
  slotId: "1" | "2" | null;
  screenName: string;
  setScreenName: (name: string) => void;
  availability: {
    isSlot1Taken: boolean;
    isSlot2Taken: boolean;
    isFull: boolean;
  };
  isJoining: boolean;
  isLeaving: boolean;
  error: string | null;
  handleJoin: () => void;
  handleLeave: () => void;
  tttState: TttState | null;
  handleTttMove: (index: number) => void;
  handleTttReset: () => void;
  combo: [number, number, number, number] | null;
  onEditPasskey?: () => void;
  disguiseTimeout: number;
  onSetDisguiseTimeout: (minutes: number) => void;
  themeColors: ThemeColors;
  indicatorColor?: string;
  onIndicatorColorChange: (color: string) => void;
  roomPath: string;
  messages: Message[];
  notificationsEnabled: boolean;
  onToggleNotifications: () => void;
  onSetSpotPasskey: (slot: "1" | "2", passkey: string) => Promise<void>;
  onKickSpot: (slot: "1" | "2", passkey: string) => Promise<boolean>;
  onClaimSpot: (slot: "1" | "2", passkey: string) => Promise<boolean>;
  onMigrateConvo: (
    destCombo: [number, number, number, number],
    onProgress?: (migrated: number, total: number) => void,
    destPassphrase?: string | null,
  ) => Promise<boolean>;
};

// ─── Component ──────────────────────────────────────────────────────────────
export function RoomSpotsView({
  slots,
  slotId,
  screenName,
  setScreenName,
  availability,
  isJoining,
  isLeaving,
  error,
  handleJoin,
  handleLeave,
  tttState,
  handleTttMove,
  handleTttReset,
  combo,
  onEditPasskey,
  themeColors,
  indicatorColor,
  onIndicatorColorChange,
  roomPath,
  messages,
  notificationsEnabled,
  onToggleNotifications,
  onSetSpotPasskey,
  onKickSpot,
  onClaimSpot,
  onMigrateConvo,
  disguiseTimeout,
  onSetDisguiseTimeout,
}: RoomSpotsViewProps) {
  // ── State ──────────────────────────────────────────────────────────────
  const [leaveConfirmText, setLeaveConfirmText] = useState("");
  const [activeGame, setActiveGame] = useState<"ttt" | "wordsearch">("ttt");
  const [showPhotoGallery, setShowPhotoGallery] = useState(false);
  const [showDrawingGallery, setShowDrawingGallery] = useState(false);
  const [showIndicatorColorPicker, setShowIndicatorColorPicker] =
    useState(false);
  const indicatorPickerRef = useRef<HTMLDivElement>(null);
  const indicatorButtonRef = useRef<HTMLButtonElement>(null);

  // Photo / Drawing loading state
  const [photoLoading, setPhotoLoading] = useState(false);
  const [drawingLoading, setDrawingLoading] = useState(false);
  const [photosReady, setPhotosReady] = useState(false);
  const [drawingsReady, setDrawingsReady] = useState(false);

  // All messages fetched from DB for gallery use
  const [allPhotoMessages, setAllPhotoMessages] = useState<Message[]>([]);
  const [allDrawingMessages, setAllDrawingMessages] = useState<Message[]>([]);

  // Counts — use full DB results when available, otherwise paginated
  const photoCount = photosReady
    ? allPhotoMessages.filter((m) => m.imageUrl).length
    : messages.filter((m) => m.imageUrl).length;
  const drawingCount = drawingsReady
    ? allDrawingMessages.filter(
        (m) => m.drawingData && m.drawingData.length > 0,
      ).length
    : messages.filter((m) => m.drawingData && m.drawingData.length > 0).length;

  const LEAVE_CONFIRMATION = "yesireallywanttoactuallyleavefrfr";
  const canLeave = leaveConfirmText === LEAVE_CONFIRMATION;

  // Passkey modal state
  const [passkeyModal, setPasskeyModal] = useState<{
    slot: "1" | "2";
    mode: "set" | "kick" | "claim";
  } | null>(null);
  const [passkeyInput, setPasskeyInput] = useState("");
  const [passkeyBusy, setPasskeyBusy] = useState(false);
  const [passkeySuccess, setPasskeySuccess] = useState<string | null>(null);

  // Migrate state
  const [showMigrateModal, setShowMigrateModal] = useState(false);
  const [migrateCombo, setMigrateCombo] = useState<
    [string, string, string, string]
  >(["", "", "", ""]);
  const [migratePassphrase, setMigratePassphrase] = useState("");
  const [migrateBusy, setMigrateBusy] = useState(false);
  const [migrateSuccess, setMigrateSuccess] = useState<string | null>(null);
  const [migrateProgress, setMigrateProgress] = useState<{
    migrated: number;
    total: number;
  } | null>(null);

  // Disguise custom timeout
  const [showCustomTimeout, setShowCustomTimeout] = useState(false);
  const [customTimeoutValue, setCustomTimeoutValue] = useState("");

  // Update notes
  const [showUpdateNotes, setShowUpdateNotes] = useState(false);

  // ── Effects ────────────────────────────────────────────────────────────
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        showIndicatorColorPicker &&
        indicatorPickerRef.current &&
        !indicatorPickerRef.current.contains(target) &&
        indicatorButtonRef.current &&
        !indicatorButtonRef.current.contains(target)
      ) {
        setShowIndicatorColorPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showIndicatorColorPicker]);

  // (photo/drawing ready states are remembered once loaded)

  // ── Fetch all messages from Firebase ────────────────────────────────────
  const fetchAllMessagesFromDB = useCallback(async (): Promise<Message[]> => {
    const messagesRef = ref(rtdb, `${roomPath}/messages`);
    const snap = await get(query(messagesRef, orderByKey()));
    const val = (snap.val() || {}) as Record<string, Omit<Message, "id">>;
    return Object.entries(val)
      .map(([id, data]) => ({ id, ...data }) as Message)
      .sort((a, b) => {
        const aTime = typeof a.createdAt === "number" ? a.createdAt : 0;
        const bTime = typeof b.createdAt === "number" ? b.createdAt : 0;
        return aTime - bTime;
      });
  }, [roomPath]);

  // ── Load photos handler (scan DB for all photos) ──────────────────────
  const handleLoadPhotos = useCallback(async () => {
    setPhotoLoading(true);
    try {
      const allMsgs = await fetchAllMessagesFromDB();
      setAllPhotoMessages(allMsgs);
      setPhotosReady(true);
    } catch {
      // silently fail
    } finally {
      setPhotoLoading(false);
    }
  }, [fetchAllMessagesFromDB]);

  // ── Load drawings handler (scan DB for all drawings) ───────────────────
  const handleLoadDrawings = useCallback(async () => {
    setDrawingLoading(true);
    try {
      const allMsgs = await fetchAllMessagesFromDB();
      setAllDrawingMessages(allMsgs);
      setDrawingsReady(true);
    } catch {
      // silently fail
    } finally {
      setDrawingLoading(false);
    }
  }, [fetchAllMessagesFromDB]);

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-4">
      <div className="mx-auto max-w-md space-y-3">
        {/* ═══════════════════════════════════════════════════════════════
            UPDATE NOTES (top of view)
           ═══════════════════════════════════════════════════════════════ */}
        <button
          type="button"
          onClick={() => setShowUpdateNotes(!showUpdateNotes)}
          className="w-full flex items-center justify-center gap-2 rounded-2xl border border-violet-500/30 bg-violet-500/[0.08] px-4 py-2.5 text-xs text-violet-300 hover:text-violet-100 hover:bg-violet-500/[0.15] active:scale-[0.98] transition-all relative"
        >
          <span>📋 Update Notes</span>
          <span className="relative flex items-center">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)] animate-pulse" />
            <span className="absolute -right-3 -top-1 h-4 w-4 rounded-full bg-emerald-500 text-[9px] font-bold text-white flex items-center justify-center leading-none">
              2
            </span>
          </span>
          <span
            className={`text-[10px] transition-transform duration-200 ${showUpdateNotes ? "rotate-180" : ""}`}
          >
            ▼
          </span>
        </button>
        {showUpdateNotes && (
          <div className="rounded-2xl border border-violet-500/30 bg-violet-500/[0.08] p-4 space-y-2 text-xs text-violet-300 leading-relaxed animate-in slide-in-from-top-1 duration-150">
            {[
              {
                icon: "⌨️",
                color: "text-emerald-400",
                title: "Reply Focus",
                desc: "Message input auto-focuses when you select a message to reply to.",
                isNew: true,
              },
              {
                icon: "🎯",
                color: "text-emerald-400",
                title: "Smart Scroll",
                desc: "Chat won't auto-scroll if you've manually scrolled in the last 2 seconds.",
                isNew: true,
              },
              {
                icon: "📷",
                color: "text-emerald-400",
                title: "Find All Media",
                desc: "Scan the entire DB for every photo & drawing — counts update in the badge.",
              },
              {
                icon: "⬇️",
                color: "text-sky-400",
                title: "Auto-Scroll",
                desc: "Chat always scrolls to the bottom on load & new messages.",
              },
              {
                icon: "⌨️",
                color: "text-amber-400",
                title: "Input Focus",
                desc: "Message input stays focused after sending.",
              },
              {
                icon: "🔑",
                color: "text-indigo-400",
                title: "Spot Passkeys",
                desc: "Protect your spot with a passkey.",
              },
              {
                icon: "🚫",
                color: "text-red-400",
                title: "Kick with Passkey",
                desc: "Remove someone using the correct passkey.",
              },
              {
                icon: "📲",
                color: "text-sky-400",
                title: "Claim Spot",
                desc: "Use the same spot on another device.",
              },
              {
                icon: "🔀",
                color: "text-emerald-400",
                title: "Migrate Convo",
                desc: "Move messages to a different room.",
              },
              {
                icon: "🟢",
                color: "text-green-400",
                title: "Last Seen",
                desc: "See when the other person was last active.",
              },
              {
                icon: "🎭",
                color: "text-violet-400",
                title: "Disguise Timeout",
                desc: "Skip the AI disguise for a set duration.",
              },
              {
                icon: "🔢",
                color: "text-amber-400",
                title: "Improved LockBox",
                desc: "Tap rings to type numbers directly.",
              },
              {
                icon: "👤",
                color: "text-pink-400",
                title: "Per-Room Identity",
                desc: "Different name in each room.",
              },
            ].map((note) => (
              <div key={note.title} className="flex items-start gap-2">
                {note.isNew && (
                  <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.6)] animate-pulse flex-shrink-0" />
                )}
                <span className={`${note.color} shrink-0`}>{note.icon}</span>
                <p>
                  <span className="font-medium text-white">{note.title}</span> —{" "}
                  {note.desc}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            ROOM IDENTITY — passkey + session status
           ═══════════════════════════════════════════════════════════════ */}
        <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.05] to-transparent overflow-visible">
          {/* Room code */}
          {combo && (
            <div className="flex items-center justify-center gap-3 px-4 py-3 border-b border-white/[0.05]">
              <span className="text-[10px] uppercase tracking-widest text-neutral-500">
                Room
              </span>
              <div className="flex items-center gap-1">
                {combo.map((value, index) => (
                  <span
                    key={`combo-${index}`}
                    className="text-lg font-bold tabular-nums"
                    style={{ color: RING_COLORS[index] }}
                  >
                    {value}
                  </span>
                ))}
              </div>
              {onEditPasskey ? (
                <button
                  type="button"
                  onClick={onEditPasskey}
                  className="text-neutral-500 hover:text-white text-sm transition-colors"
                  title="Change room"
                >
                  ✎
                </button>
              ) : (
                <span
                  className="text-[10px] text-neutral-600"
                  title="Timeout active — room switching locked"
                >
                  🔒
                </span>
              )}
            </div>
          )}

          {/* Session status / Join */}
          {slotId ? (
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                <span className="text-sm text-emerald-200">
                  Spot <span className="font-bold">{slotId}</span>{" "}
                  <span className="text-neutral-400">as</span>{" "}
                  <span className="font-semibold text-white">{screenName}</span>
                </span>
              </div>
              <div className="relative">
                <button
                  ref={indicatorButtonRef}
                  type="button"
                  onClick={() =>
                    setShowIndicatorColorPicker(!showIndicatorColorPicker)
                  }
                  className="w-7 h-7 rounded-full border-2 border-white/20 transition-all hover:scale-110 hover:border-white/40"
                  style={{
                    backgroundColor:
                      indicatorColor ||
                      (slotId === "1" ? "#ff3d3f" : "#9d3dff"),
                  }}
                  title="Change your indicator color"
                />
                {showIndicatorColorPicker && (
                  <div
                    ref={indicatorPickerRef}
                    className="absolute right-0 top-9 bg-white/5 backdrop-blur-md rounded-2xl border border-white/20 shadow-2xl z-[200] min-w-[200px]"
                  >
                    <ColorWheelPicker
                      currentColor={
                        indicatorColor ||
                        (slotId === "1" ? "#ff3d3f" : "#9d3dff")
                      }
                      onColorChange={onIndicatorColorChange}
                      onClose={() => setShowIndicatorColorPicker(false)}
                    />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="px-4 py-4 space-y-3">
              <input
                type="text"
                placeholder="Your screen name"
                value={screenName}
                onChange={(e) => setScreenName(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
              />
              <button
                onClick={handleJoin}
                disabled={availability.isFull || isJoining}
                className="w-full rounded-xl bg-emerald-400/90 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {availability.isFull ? (
                  "Room Full"
                ) : isJoining ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="h-4 w-4 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Joining...
                  </span>
                ) : (
                  "Join Chat"
                )}
              </button>
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            SPOTS — who's in the room
           ═══════════════════════════════════════════════════════════════ */}
        <div className="space-y-2">
          {(["1", "2"] as const).map((spotId) => {
            const isTaken =
              spotId === "1"
                ? availability.isSlot1Taken
                : availability.isSlot2Taken;
            const spotName = slots[spotId]?.name || "Empty";
            const hasPasskey = !!slots[spotId]?.passkey;
            const isMySpot = slotId === spotId;
            return (
              <div
                key={spotId}
                className={`rounded-2xl border px-4 py-3 text-sm text-white transition-all ${
                  isMySpot
                    ? "border-emerald-400/20 bg-emerald-400/[0.04]"
                    : "border-white/[0.08] bg-white/[0.02]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-2 w-2 rounded-full ${
                        isTaken
                          ? "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.4)]"
                          : "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.4)]"
                      }`}
                    />
                    <span className="font-medium text-xs">Spot {spotId}</span>
                    {isMySpot && (
                      <span className="text-[9px] uppercase tracking-wider text-emerald-400/80 font-semibold">
                        You
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-xs font-medium ${
                      isTaken ? "text-amber-300/80" : "text-emerald-300/60"
                    }`}
                  >
                    {spotName}
                  </span>
                </div>
                {/* Spot actions */}
                {(isMySpot || (isTaken && hasPasskey)) && (
                  <div className="flex items-center gap-1.5 mt-2.5 pt-2.5 border-t border-white/[0.06]">
                    {isMySpot && (
                      <button
                        type="button"
                        onClick={() => {
                          setPasskeyInput("");
                          setPasskeySuccess(null);
                          setPasskeyModal({ slot: spotId, mode: "set" });
                        }}
                        className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5 text-[11px] text-neutral-400 hover:bg-white/10 hover:text-white active:scale-[0.97] transition-all"
                      >
                        {hasPasskey ? "🔒 Change Key" : "🔑 Set Key"}
                      </button>
                    )}
                    {isTaken && hasPasskey && !isMySpot && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setPasskeyInput("");
                            setPasskeySuccess(null);
                            setPasskeyModal({ slot: spotId, mode: "kick" });
                          }}
                          className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-red-500/20 bg-red-500/[0.06] px-2 py-1.5 text-[11px] text-red-300/80 hover:bg-red-500/15 active:scale-[0.97] transition-all"
                        >
                          🚫 Kick
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPasskeyInput("");
                            setPasskeySuccess(null);
                            setPasskeyModal({ slot: spotId, mode: "claim" });
                          }}
                          className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-sky-500/20 bg-sky-500/[0.06] px-2 py-1.5 text-[11px] text-sky-300/80 hover:bg-sky-500/15 active:scale-[0.97] transition-all"
                        >
                          📲 Claim
                        </button>
                      </>
                    )}
                    {isMySpot && isTaken && hasPasskey && (
                      <button
                        type="button"
                        onClick={() => {
                          setPasskeyInput("");
                          setPasskeySuccess(null);
                          setPasskeyModal({ slot: spotId, mode: "kick" });
                        }}
                        className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-red-500/20 bg-red-500/[0.06] px-2 py-1.5 text-[11px] text-red-300/80 hover:bg-red-500/15 active:scale-[0.97] transition-all"
                      >
                        🚫 Kick
                      </button>
                    )}
                  </div>
                )}
                {isTaken && !hasPasskey && isMySpot && (
                  <p className="mt-2 text-[10px] text-neutral-600 text-center">
                    Set a passkey to enable kick &amp; multi-device claim
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            MEDIA — Photos & Drawings with load buttons + progress
           ═══════════════════════════════════════════════════════════════ */}
        {slotId && (
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
            <div className="px-4 py-3 border-b border-white/[0.05]">
              <span className="text-xs font-semibold text-white">Media</span>
            </div>
            <div className="p-3 grid grid-cols-2 gap-2">
              {/* Photos card */}
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 flex flex-col items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-lg">📷</span>
                  <span className="text-xs font-medium text-white">Photos</span>
                  {photoCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-white/10 text-[10px] text-neutral-300 font-medium tabular-nums">
                      {photoCount}
                    </span>
                  )}
                </div>

                {/* Loading indicator */}
                {photoLoading && (
                  <div className="w-full">
                    <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full w-full bg-emerald-400/60 rounded-full animate-pulse" />
                    </div>
                    <p className="text-[10px] text-neutral-500 text-center mt-1">
                      Searching DB...
                    </p>
                  </div>
                )}

                {/* Load / Open button */}
                <button
                  type="button"
                  onClick={
                    photosReady
                      ? () => setShowPhotoGallery(true)
                      : handleLoadPhotos
                  }
                  disabled={photoLoading}
                  className={`w-full rounded-lg px-3 py-1.5 text-[11px] font-medium transition-all active:scale-[0.97] disabled:opacity-30 disabled:cursor-not-allowed ${
                    photosReady
                      ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/30"
                      : "bg-white/[0.06] border border-white/10 text-neutral-300 hover:bg-white/10"
                  }`}
                >
                  {photoLoading
                    ? "Searching..."
                    : photosReady
                      ? `Open Gallery (${allPhotoMessages.filter((m) => m.imageUrl).length})`
                      : "Find All Photos"}
                </button>
              </div>

              {/* Drawings card */}
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 flex flex-col items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-lg">🎨</span>
                  <span className="text-xs font-medium text-white">
                    Drawings
                  </span>
                  {drawingCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-white/10 text-[10px] text-neutral-300 font-medium tabular-nums">
                      {drawingCount}
                    </span>
                  )}
                </div>

                {/* Loading indicator */}
                {drawingLoading && (
                  <div className="w-full">
                    <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full w-full bg-violet-400/60 rounded-full animate-pulse" />
                    </div>
                    <p className="text-[10px] text-neutral-500 text-center mt-1">
                      Searching DB...
                    </p>
                  </div>
                )}

                {/* Load / Open button */}
                <button
                  type="button"
                  onClick={
                    drawingsReady
                      ? () => setShowDrawingGallery(true)
                      : handleLoadDrawings
                  }
                  disabled={drawingLoading}
                  className={`w-full rounded-lg px-3 py-1.5 text-[11px] font-medium transition-all active:scale-[0.97] disabled:opacity-30 disabled:cursor-not-allowed ${
                    drawingsReady
                      ? "bg-violet-500/20 border border-violet-500/30 text-violet-300 hover:bg-violet-500/30"
                      : "bg-white/[0.06] border border-white/10 text-neutral-300 hover:bg-white/10"
                  }`}
                >
                  {drawingLoading
                    ? "Searching..."
                    : drawingsReady
                      ? `Open Gallery (${allDrawingMessages.filter((m) => m.drawingData && m.drawingData.length > 0).length})`
                      : "Find All Drawings"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            QUICK ACTIONS — Notifications, Migrate
           ═══════════════════════════════════════════════════════════════ */}
        {slotId && (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onToggleNotifications}
              className={`flex items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-xs active:scale-[0.98] transition-all ${
                notificationsEnabled
                  ? "border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-300"
                  : "border-white/[0.08] bg-white/[0.02] text-neutral-400"
              }`}
            >
              <span className="text-base">
                {notificationsEnabled ? "🔔" : "🔕"}
              </span>
              <span>{notificationsEnabled ? "Notifs On" : "Notifs Off"}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMigrateCombo(["", "", "", ""]);
                setMigratePassphrase("");
                setMigrateSuccess(null);
                setShowMigrateModal(true);
              }}
              className="flex items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.02] px-3 py-3 text-xs text-neutral-400 hover:bg-white/[0.04] hover:text-white active:scale-[0.98] transition-all"
            >
              <span className="text-base">🔀</span>
              <span>Migrate</span>
            </button>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            DISGUISE TIMEOUT
           ═══════════════════════════════════════════════════════════════ */}
        <Section
          icon="🎭"
          title="Disguise Timeout"
          defaultOpen={false}
          accentColor="text-violet-300"
          badge={
            disguiseTimeout > 0 ? (
              <span className="text-[10px] text-amber-300/70 font-medium">
                {disguiseTimeout >= 60
                  ? `${disguiseTimeout / 60}h`
                  : `${disguiseTimeout}m`}
              </span>
            ) : undefined
          }
        >
          <div className="space-y-2.5">
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { label: "Always", value: 0 },
                { label: "5m", value: 5 },
                { label: "10m", value: 10 },
                { label: "30m", value: 30 },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onSetDisguiseTimeout(opt.value);
                    setShowCustomTimeout(false);
                  }}
                  className={`rounded-lg px-2 py-1.5 text-[11px] font-medium transition-all active:scale-[0.97] ${
                    disguiseTimeout === opt.value && !showCustomTimeout
                      ? "bg-violet-500/80 text-white border border-violet-400/30"
                      : "border border-white/[0.08] bg-white/[0.03] text-neutral-500 hover:bg-white/[0.08] hover:text-white"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { label: "1h", value: 60 },
                { label: "2h", value: 120 },
                { label: "4h", value: 240 },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onSetDisguiseTimeout(opt.value);
                    setShowCustomTimeout(false);
                  }}
                  className={`rounded-lg px-2 py-1.5 text-[11px] font-medium transition-all active:scale-[0.97] ${
                    disguiseTimeout === opt.value && !showCustomTimeout
                      ? "bg-violet-500/80 text-white border border-violet-400/30"
                      : "border border-white/[0.08] bg-white/[0.03] text-neutral-500 hover:bg-white/[0.08] hover:text-white"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setShowCustomTimeout(!showCustomTimeout)}
                className={`rounded-lg px-2 py-1.5 text-[11px] font-medium transition-all active:scale-[0.97] ${
                  showCustomTimeout ||
                  ![0, 5, 10, 30, 60, 120, 240].includes(disguiseTimeout)
                    ? "bg-violet-500/80 text-white border border-violet-400/30"
                    : "border border-white/[0.08] bg-white/[0.03] text-neutral-500 hover:bg-white/[0.08] hover:text-white"
                }`}
              >
                Custom
              </button>
            </div>
            {showCustomTimeout && (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  placeholder="Minutes..."
                  value={customTimeoutValue}
                  onChange={(e) => setCustomTimeoutValue(e.target.value)}
                  className="flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-violet-400/40"
                />
                <button
                  type="button"
                  disabled={
                    !customTimeoutValue || Number(customTimeoutValue) < 1
                  }
                  onClick={() => {
                    const mins = Math.max(
                      1,
                      Math.round(Number(customTimeoutValue)),
                    );
                    onSetDisguiseTimeout(mins);
                    setCustomTimeoutValue("");
                    setShowCustomTimeout(false);
                  }}
                  className="rounded-lg bg-violet-500/80 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-500 active:scale-[0.97] transition-all disabled:opacity-40"
                >
                  Set
                </button>
              </div>
            )}
            <p className="text-[10px] text-neutral-600 text-center">
              {disguiseTimeout === 0
                ? "Disguise always shows — switch rooms freely"
                : `Disguise bypassed — room locked for ${disguiseTimeout >= 60 ? `${disguiseTimeout / 60}h` : `${disguiseTimeout}m`}`}
            </p>
          </div>
        </Section>

        {/* ═══════════════════════════════════════════════════════════════
            GAMES — Tic Tac Toe & Word Search
           ═══════════════════════════════════════════════════════════════ */}
        <div className="rounded-2xl border border-white/[0.08] bg-black/20 overflow-hidden">
          <div className="flex border-b border-white/[0.06]">
            <button
              type="button"
              onClick={() => setActiveGame("ttt")}
              className={`flex-1 px-4 py-2.5 text-xs font-medium transition-colors ${
                activeGame === "ttt"
                  ? "bg-white/10 text-white"
                  : "text-neutral-500 hover:text-white hover:bg-white/5"
              }`}
            >
              ❌⭕ Tic Tac Toe
            </button>
            <button
              type="button"
              onClick={() => setActiveGame("wordsearch")}
              className={`flex-1 px-4 py-2.5 text-xs font-medium transition-colors ${
                activeGame === "wordsearch"
                  ? "bg-white/10 text-white"
                  : "text-neutral-500 hover:text-white hover:bg-white/5"
              }`}
            >
              🔤 Word Search
            </button>
          </div>

          {activeGame === "ttt" && (
            <div className="p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">
                  Tic Tac Toe
                </h3>
                <button
                  type="button"
                  onClick={handleTttReset}
                  disabled={!slotId}
                  className="relative text-xs text-neutral-400 hover:text-white transition-colors disabled:opacity-50"
                >
                  Reset
                  {slotId &&
                    tttState?.resetVotes &&
                    ((slotId === "1" &&
                      tttState.resetVotes["2"] &&
                      !tttState.resetVotes["1"]) ||
                      (slotId === "2" &&
                        tttState.resetVotes["1"] &&
                        !tttState.resetVotes["2"])) && (
                      <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                    )}
                  {slotId && tttState?.resetVotes?.[slotId] && (
                    <span className="ml-1 text-emerald-400">✓</span>
                  )}
                </button>
              </div>
              <p className="mt-1 text-[11px] text-neutral-500">
                Spot 1 is X &bull; Spot 2 is O
              </p>

              <div className="mt-2 text-center">
                {tttState?.winner === "draw" ? (
                  <span className="text-sm font-semibold text-neutral-300">
                    Draw game!
                  </span>
                ) : tttState?.winner === "1" ? (
                  <span className="text-sm font-semibold text-emerald-300">
                    X wins! 🎉
                  </span>
                ) : tttState?.winner === "2" ? (
                  <span className="text-sm font-semibold text-amber-300">
                    O wins! 🎉
                  </span>
                ) : tttState?.turn === slotId ? (
                  <span className="text-sm font-semibold text-emerald-300">
                    Your turn! ({slotId === "1" ? "X" : "O"})
                  </span>
                ) : (
                  <span className="text-sm text-neutral-400">
                    Waiting for {tttState?.turn === "1" ? "X" : "O"}...
                  </span>
                )}
              </div>

              <div
                className="mt-3 relative mx-auto"
                style={{ width: "180px", height: "180px" }}
              >
                <div className="absolute top-0 left-[60px] w-0.5 h-full bg-white/30" />
                <div className="absolute top-0 left-[120px] w-0.5 h-full bg-white/30" />
                <div className="absolute top-[60px] left-0 h-0.5 w-full bg-white/30" />
                <div className="absolute top-[120px] left-0 h-0.5 w-full bg-white/30" />

                {tttState?.winningLine &&
                  tttState.winner &&
                  tttState.winner !== "draw" && (
                    <WinningLineOverlay
                      line={tttState.winningLine}
                      winner={tttState.winner}
                    />
                  )}

                <div className="grid grid-cols-3 h-full">
                  {(tttState?.board ?? Array(9).fill(null)).map((cell, idx) => {
                    const isX = cell === "1";
                    const isO = cell === "2";
                    const isMyTurn = tttState?.turn === slotId;
                    const canClick =
                      slotId && !tttState?.winner && isMyTurn && !cell;
                    return (
                      <button
                        key={`ttt-${idx}`}
                        type="button"
                        onClick={() => handleTttMove(idx)}
                        disabled={!canClick}
                        className={`flex items-center justify-center text-3xl font-bold transition-colors ${
                          canClick ? "hover:bg-white/5 cursor-pointer" : ""
                        } ${isX ? "text-emerald-400" : isO ? "text-amber-400" : "text-white"} disabled:cursor-default`}
                      >
                        {isX ? "X" : isO ? "O" : ""}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeGame === "wordsearch" && (
            <WordSearchGame
              slotId={slotId}
              themeColors={themeColors}
              slots={slots}
              roomPath={roomPath}
            />
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            LEAVE ROOM — danger zone (collapsible)
           ═══════════════════════════════════════════════════════════════ */}
        {slotId && (
          <Section
            icon="⚠️"
            title="Leave & Clear Room"
            defaultOpen={false}
            accentColor="text-red-300/80"
          >
            <div className="space-y-3">
              <p className="text-[10px] text-neutral-500 text-center leading-relaxed">
                This clears all messages and images for both users. Type the
                confirmation phrase to unlock.
              </p>
              <input
                type="text"
                placeholder="Type confirmation phrase..."
                value={leaveConfirmText}
                onChange={(e) => setLeaveConfirmText(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-red-400/30"
              />
              <p className="text-[10px] text-neutral-600 text-center font-mono">
                yesireallywanttoactuallyleavefrfr
              </p>
              <button
                onClick={() => {
                  handleLeave();
                  setLeaveConfirmText("");
                }}
                disabled={!canLeave || isLeaving}
                className={`w-full rounded-xl px-4 py-2.5 text-xs font-semibold transition-all active:scale-[0.98] ${
                  canLeave
                    ? "border border-red-400/30 bg-red-500/20 text-red-200 hover:bg-red-500/30"
                    : "border border-neutral-800 bg-neutral-900/50 text-neutral-600 cursor-not-allowed"
                } disabled:opacity-50`}
              >
                {isLeaving ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="h-3.5 w-3.5 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Leaving...
                  </span>
                ) : (
                  "Leave & Clear Room"
                )}
              </button>
            </div>
          </Section>
        )}

        {error && <p className="text-xs text-red-300 text-center">{error}</p>}
      </div>

      {/* ════════════════════════════════════════════════════════════════
          OVERLAYS & MODALS
         ════════════════════════════════════════════════════════════════ */}

      {/* Photo Gallery — uses all messages fetched from DB */}
      {showPhotoGallery && (
        <PhotoGalleryOverlay
          messages={allPhotoMessages.length > 0 ? allPhotoMessages : messages}
          themeColors={themeColors}
          onClose={() => setShowPhotoGallery(false)}
        />
      )}

      {/* Drawing Gallery — uses all messages fetched from DB */}
      {showDrawingGallery && (
        <DrawingGalleryOverlay
          messages={
            allDrawingMessages.length > 0 ? allDrawingMessages : messages
          }
          themeColors={themeColors}
          onClose={() => setShowDrawingGallery(false)}
        />
      )}

      {/* Passkey / Kick Modal */}
      {passkeyModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-xs rounded-2xl border border-white/10 bg-neutral-900 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white text-center">
              {passkeyModal.mode === "set"
                ? `Set Passkey for Spot ${passkeyModal.slot}`
                : passkeyModal.mode === "kick"
                  ? `Kick from Spot ${passkeyModal.slot}`
                  : `Claim Spot ${passkeyModal.slot}`}
            </h3>
            <p className="text-xs text-neutral-400 text-center">
              {passkeyModal.mode === "set"
                ? "Enter a passkey that can be used to kick the user from this spot."
                : passkeyModal.mode === "kick"
                  ? "Enter the passkey to remove this user from the spot. No messages will be deleted."
                  : "Enter the passkey to use this spot on this device."}
            </p>
            <input
              type="password"
              autoFocus
              placeholder={
                passkeyModal.mode === "set"
                  ? "New passkey..."
                  : "Enter passkey to " +
                    (passkeyModal.mode === "kick" ? "kick..." : "claim...")
              }
              value={passkeyInput}
              onChange={(e) => setPasskeyInput(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
            />
            {passkeySuccess && (
              <p className="text-xs text-emerald-400 text-center">
                {passkeySuccess}
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPasskeyModal(null)}
                disabled={passkeyBusy}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-neutral-300 hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!passkeyInput.trim() || passkeyBusy}
                onClick={async () => {
                  if (!passkeyInput.trim()) return;
                  setPasskeyBusy(true);
                  if (passkeyModal.mode === "set") {
                    await onSetSpotPasskey(
                      passkeyModal.slot,
                      passkeyInput.trim(),
                    );
                    setPasskeySuccess("Passkey set!");
                    setTimeout(() => setPasskeyModal(null), 800);
                  } else if (passkeyModal.mode === "kick") {
                    const ok = await onKickSpot(
                      passkeyModal.slot,
                      passkeyInput.trim(),
                    );
                    if (ok) {
                      setPasskeySuccess("User kicked!");
                      setTimeout(() => setPasskeyModal(null), 800);
                    }
                  } else {
                    const ok = await onClaimSpot(
                      passkeyModal.slot,
                      passkeyInput.trim(),
                    );
                    if (ok) {
                      setPasskeySuccess("Spot claimed!");
                      setTimeout(() => setPasskeyModal(null), 800);
                    }
                  }
                  setPasskeyBusy(false);
                }}
                className={`flex-1 rounded-xl px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-50 ${
                  passkeyModal.mode === "set"
                    ? "bg-emerald-500/80 text-black hover:bg-emerald-500"
                    : passkeyModal.mode === "kick"
                      ? "bg-red-500/80 text-white hover:bg-red-500"
                      : "bg-sky-500/80 text-white hover:bg-sky-500"
                }`}
              >
                {passkeyBusy ? (
                  <span className="flex items-center justify-center gap-1.5">
                    <svg
                      className="h-3.5 w-3.5 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Working...
                  </span>
                ) : passkeyModal.mode === "set" ? (
                  "Save"
                ) : passkeyModal.mode === "kick" ? (
                  "Kick"
                ) : (
                  "Claim"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Migrate Convo Modal */}
      {showMigrateModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-xs rounded-2xl border border-white/10 bg-neutral-900 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white text-center">
              Migrate Conversation
            </h3>
            <p className="text-xs text-neutral-400 text-center">
              Enter the destination room combo and passphrase. All messages will
              be moved from this room to the destination.
            </p>
            <div className="flex items-center justify-center gap-2">
              {([0, 1, 2, 3] as const).map((i) => (
                <input
                  key={`migrate-combo-${i}`}
                  type="number"
                  autoFocus={i === 0}
                  placeholder="0"
                  value={migrateCombo[i]}
                  onChange={(e) => {
                    const next = [...migrateCombo] as [
                      string,
                      string,
                      string,
                      string,
                    ];
                    next[i] = e.target.value;
                    setMigrateCombo(next);
                  }}
                  className="w-16 rounded-xl border border-white/10 bg-black/40 px-2 py-2.5 text-sm text-center text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  style={{ color: RING_COLORS[i] }}
                />
              ))}
            </div>
            <input
              type="text"
              placeholder="Passphrase (optional — lowercase, no spaces)"
              value={migratePassphrase}
              onChange={(e) =>
                setMigratePassphrase(
                  e.target.value.toLowerCase().replace(/[^a-z]/g, ""),
                )
              }
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-center text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
            />
            {migrateProgress && (
              <div className="space-y-1">
                <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.round((migrateProgress.migrated / migrateProgress.total) * 100)}%`,
                    }}
                  />
                </div>
                <p className="text-[10px] text-neutral-400 text-center">
                  {migrateProgress.migrated} / {migrateProgress.total} messages
                </p>
              </div>
            )}
            {migrateSuccess && (
              <p className="text-xs text-emerald-400 text-center">
                {migrateSuccess}
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowMigrateModal(false)}
                disabled={migrateBusy}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-neutral-300 hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={
                  migrateBusy ||
                  migrateCombo.some((v) => v === "" || isNaN(Number(v)))
                }
                onClick={async () => {
                  const destCombo = migrateCombo.map(Number) as [
                    number,
                    number,
                    number,
                    number,
                  ];
                  setMigrateBusy(true);
                  setMigrateProgress(null);
                  const ok = await onMigrateConvo(
                    destCombo,
                    (migrated, total) =>
                      setMigrateProgress({ migrated, total }),
                    migratePassphrase || null,
                  );
                  if (ok) {
                    setMigrateSuccess("Messages migrated!");
                    setTimeout(() => {
                      setShowMigrateModal(false);
                      setMigrateProgress(null);
                    }, 1000);
                  } else {
                    setMigrateProgress(null);
                  }
                  setMigrateBusy(false);
                }}
                className="flex-1 rounded-xl bg-emerald-500/80 px-3 py-2 text-xs font-semibold text-black hover:bg-emerald-500 transition-colors disabled:opacity-50"
              >
                {migrateBusy ? (
                  <span className="flex items-center justify-center gap-1.5">
                    <svg
                      className="h-3.5 w-3.5 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Migrating...
                  </span>
                ) : (
                  "Migrate"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
