"use client";

import React, { useState, useRef, useEffect } from "react";
import { RING_COLORS, THEME_COLORS } from "../constants";
import type { Message, Slots, TttState, ThemeColors } from "../types";
import { WordSearchGame } from "./WordSearchGame";
import { ColorWheelPicker } from "./ColorWheelPicker";
import { PhotoGalleryOverlay } from "./PhotoGalleryOverlay";
import { DrawingGalleryOverlay } from "./DrawingGalleryOverlay";

// Calculate the winning line position and rotation
function WinningLineOverlay({
  line,
  winner,
}: {
  line: number[];
  winner: "1" | "2";
}) {
  // Cell size is 60px, grid is 180x180
  // Cell centers: col 0 = 30px, col 1 = 90px, col 2 = 150px
  // Row centers: row 0 = 30px, row 1 = 90px, row 2 = 150px

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
  ) => Promise<boolean>;
};

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
  const [leaveConfirmText, setLeaveConfirmText] = useState("");
  const [activeGame, setActiveGame] = useState<"ttt" | "wordsearch">("ttt");
  const [showPhotoGallery, setShowPhotoGallery] = useState(false);
  const [showDrawingGallery, setShowDrawingGallery] = useState(false);
  const photoCount = messages.filter((m) => m.imageUrl).length;
  const drawingCount = messages.filter(
    (m) => m.drawingData && m.drawingData.length > 0,
  ).length;
  const [showIndicatorColorPicker, setShowIndicatorColorPicker] =
    useState(false);
  const indicatorPickerRef = useRef<HTMLDivElement>(null);
  const indicatorButtonRef = useRef<HTMLButtonElement>(null);
  const LEAVE_CONFIRMATION = "yesireallywanttoactuallyleavefrfr";
  const canLeave = leaveConfirmText === LEAVE_CONFIRMATION;

  // Spot passkey / kick state
  const [passkeyModal, setPasskeyModal] = useState<{
    slot: "1" | "2";
    mode: "set" | "kick" | "claim";
  } | null>(null);
  const [passkeyInput, setPasskeyInput] = useState("");
  const [passkeyBusy, setPasskeyBusy] = useState(false);
  const [passkeySuccess, setPasskeySuccess] = useState<string | null>(null);

  // Migrate convo state
  const [showMigrateModal, setShowMigrateModal] = useState(false);
  const [migrateCombo, setMigrateCombo] = useState<
    [string, string, string, string]
  >(["", "", "", ""]);
  const [migrateBusy, setMigrateBusy] = useState(false);
  const [migrateSuccess, setMigrateSuccess] = useState<string | null>(null);

  // Custom disguise timeout input
  const [showCustomTimeout, setShowCustomTimeout] = useState(false);
  const [customTimeoutValue, setCustomTimeoutValue] = useState("");

  // Update notes toggle
  const [showUpdateNotes, setShowUpdateNotes] = useState(false);

  // Close indicator color picker when clicking outside
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

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="mx-auto max-w-md space-y-4">
        {/* Passkey Display */}
        {combo && (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
            <span className="text-xs text-neutral-400 mr-2">Passkey:</span>
            {combo.map((value, index) => (
              <span
                key={`combo-${index}`}
                className="text-lg font-bold"
                style={{ color: RING_COLORS[index] }}
              >
                {value}
              </span>
            ))}
            {onEditPasskey ? (
              <button
                type="button"
                onClick={onEditPasskey}
                className="ml-2 text-neutral-400 hover:text-white text-sm transition-colors"
              >
                ✎
              </button>
            ) : (
              <span
                className="ml-2 text-[10px] text-neutral-600"
                title="Timeout active — room switching locked until disguise returns"
              >
                🔒
              </span>
            )}
          </div>
        )}

        {/* Photo Gallery Button */}
        {slotId && (
          <button
            type="button"
            onClick={() => setShowPhotoGallery(true)}
            className="w-full flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white hover:bg-white/5 transition-colors"
          >
            <svg
              className="w-4 h-4 text-neutral-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span>Photos</span>
            {photoCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white/10 text-[10px] text-neutral-300 font-medium">
                {photoCount}
              </span>
            )}
          </button>
        )}

        {/* Drawing Gallery Button */}
        {slotId && (
          <button
            type="button"
            onClick={() => setShowDrawingGallery(true)}
            className="w-full flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white hover:bg-white/5 transition-colors"
          >
            <svg
              className="w-4 h-4 text-neutral-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
              />
            </svg>
            <span>Drawings</span>
            {drawingCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white/10 text-[10px] text-neutral-300 font-medium">
                {drawingCount}
              </span>
            )}
          </button>
        )}

        {/* Update Notes */}
        <button
          type="button"
          onClick={() => setShowUpdateNotes(!showUpdateNotes)}
          className="w-full flex items-center justify-center gap-2 rounded-2xl border border-indigo-500/20 bg-indigo-500/[0.06] px-4 py-3 text-sm font-medium text-indigo-300 hover:bg-indigo-500/10 active:scale-[0.98] transition-all duration-150"
        >
          <span>📋</span>
          <span>Update Notes</span>
          <span
            className={`ml-1 text-[10px] transition-transform duration-200 ${showUpdateNotes ? "rotate-180" : ""}`}
          >
            ▼
          </span>
        </button>
        {showUpdateNotes && (
          <div className="rounded-2xl border border-indigo-500/15 bg-gradient-to-br from-indigo-500/[0.06] to-transparent p-4 space-y-3 text-xs text-neutral-300 leading-relaxed">
            <h3 className="text-sm font-semibold text-indigo-300">
              What&apos;s New
            </h3>

            <div className="space-y-2.5">
              <div className="flex gap-2">
                <span className="text-indigo-400 shrink-0">🔑</span>
                <div>
                  <p className="font-medium text-white">Spot Passkeys</p>
                  <p className="text-neutral-400">
                    Set a passkey on your spot to protect it. Only the spot
                    owner can set or update the passkey.
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <span className="text-red-400 shrink-0">🚫</span>
                <div>
                  <p className="font-medium text-white">Kick with Passkey</p>
                  <p className="text-neutral-400">
                    Remove someone from a spot by entering the correct passkey.
                    Messages are preserved.
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <span className="text-sky-400 shrink-0">📲</span>
                <div>
                  <p className="font-medium text-white">
                    Claim Spot (Multi-Device)
                  </p>
                  <p className="text-neutral-400">
                    Use the same spot on another device by entering the passkey.
                    Your session syncs across devices.
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <span className="text-emerald-400 shrink-0">🔀</span>
                <div>
                  <p className="font-medium text-white">Migrate Conversation</p>
                  <p className="text-neutral-400">
                    Move all messages from the current room to a different room
                    by entering the destination combo.
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <span className="text-green-400 shrink-0">🟢</span>
                <div>
                  <p className="font-medium text-white">Last Seen Indicator</p>
                  <p className="text-neutral-400">
                    When the other person is offline, the header shows how long
                    ago they were last active.
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <span className="text-violet-400 shrink-0">🎭</span>
                <div>
                  <p className="font-medium text-white">Disguise Timeout</p>
                  <p className="text-neutral-400">
                    Set a timer to skip the AI disguise and go straight to your
                    room. When active, room switching is locked until the timer
                    expires and the disguise returns.
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <span className="text-amber-400 shrink-0">🔢</span>
                <div>
                  <p className="font-medium text-white">
                    Improved LockBox (Mobile)
                  </p>
                  <p className="text-neutral-400">
                    Tap any combo ring to type a number directly. Use ▲/▼
                    buttons for fine-tuning. Better friction and snapping for
                    easier mobile use.
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <span className="text-pink-400 shrink-0">👤</span>
                <div>
                  <p className="font-medium text-white">Per-Room Identity</p>
                  <p className="text-neutral-400">
                    Each room has its own separate screen name and session, so
                    you can be different people in different rooms.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <h2 className="text-lg font-semibold text-white text-center">
          Room Spots
        </h2>

        <div className="space-y-3">
          {(["1", "2"] as const).map((spotId) => {
            const isTaken =
              spotId === "1"
                ? availability.isSlot1Taken
                : availability.isSlot2Taken;
            const spotName = slots[spotId]?.name || "Available";
            const hasPasskey = !!slots[spotId]?.passkey;
            const isMySpot = slotId === spotId;
            return (
              <div
                key={spotId}
                className="group rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] px-4 py-3.5 text-sm text-white shadow-lg shadow-black/20 transition-all hover:border-white/15"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-2.5 w-2.5 rounded-full ${isTaken ? "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.4)]" : "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.4)]"}`}
                    />
                    <span className="font-medium tracking-wide">
                      Spot {spotId}
                    </span>
                  </div>
                  <span
                    className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${isTaken ? "bg-amber-400/10 text-amber-300 border border-amber-400/20" : "bg-emerald-400/10 text-emerald-300 border border-emerald-400/20"}`}
                  >
                    {spotName}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {isMySpot && (
                    <button
                      type="button"
                      onClick={() => {
                        setPasskeyInput("");
                        setPasskeySuccess(null);
                        setPasskeyModal({ slot: spotId, mode: "set" });
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-medium text-neutral-300 hover:bg-white/10 hover:text-white hover:border-white/20 active:scale-[0.97] transition-all duration-150"
                    >
                      <span>{hasPasskey ? "🔒" : "🔑"}</span>
                      <span>
                        {hasPasskey ? "Update Passkey" : "Set Passkey"}
                      </span>
                    </button>
                  )}
                  {isTaken && hasPasskey && (
                    <button
                      type="button"
                      onClick={() => {
                        setPasskeyInput("");
                        setPasskeySuccess(null);
                        setPasskeyModal({ slot: spotId, mode: "kick" });
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/[0.08] px-3 py-2 text-xs font-medium text-red-300 hover:bg-red-500/20 hover:text-red-200 hover:border-red-400/30 active:scale-[0.97] transition-all duration-150"
                    >
                      <span>🚫</span>
                      <span>Kick</span>
                    </button>
                  )}
                  {isTaken && hasPasskey && (
                    <button
                      type="button"
                      onClick={() => {
                        setPasskeyInput("");
                        setPasskeySuccess(null);
                        setPasskeyModal({ slot: spotId, mode: "claim" });
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-sky-500/20 bg-sky-500/[0.08] px-3 py-2 text-xs font-medium text-sky-300 hover:bg-sky-500/20 hover:text-sky-200 hover:border-sky-400/30 active:scale-[0.97] transition-all duration-150"
                    >
                      <span>📲</span>
                      <span>Claim Spot</span>
                    </button>
                  )}
                  {isTaken && !hasPasskey && (
                    <p className="flex-1 text-center text-[10px] text-neutral-500 italic py-1">
                      No passkey set — set one to enable kick &amp; claim
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {slotId ? (
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-200">
            <div className="flex items-center justify-between">
              <span>
                You are in spot {slotId} as{" "}
                <span className="font-semibold">{screenName}</span>
              </span>
              <div className="relative">
                <button
                  ref={indicatorButtonRef}
                  type="button"
                  onClick={() =>
                    setShowIndicatorColorPicker(!showIndicatorColorPicker)
                  }
                  className="w-6 h-6 rounded-full border-2 border-white/30 transition-all hover:scale-110"
                  style={{
                    backgroundColor:
                      indicatorColor ||
                      (slotId === "1" ? "#ff3d3f" : "#9d3dff"),
                  }}
                  title="Change your tap/swipe indicator color"
                />
                {showIndicatorColorPicker && (
                  <div
                    ref={indicatorPickerRef}
                    className="absolute right-0 top-8 bg-white/5 backdrop-blur-md rounded-2xl border border-white/20 shadow-2xl z-[200] min-w-[200px]"
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
          </div>
        ) : (
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Your screen name"
              value={screenName}
              onChange={(e) => setScreenName(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
            />
            <button
              onClick={handleJoin}
              disabled={availability.isFull || isJoining}
              className="w-full rounded-2xl bg-emerald-400/90 px-4 py-3 text-sm font-semibold text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {availability.isFull
                ? "Room Full"
                : isJoining
                  ? "Joining..."
                  : "Join Chat"}
            </button>
          </div>
        )}

        {/* Notifications Toggle */}
        {slotId && (
          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
            <div className="flex items-center gap-2">
              <svg
                className="w-4 h-4 text-neutral-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              <span className="text-sm text-white">Message Notifications</span>
            </div>
            <button
              type="button"
              onClick={onToggleNotifications}
              className={`relative h-6 w-11 rounded-full transition-colors duration-200 ${
                notificationsEnabled ? "bg-emerald-500" : "bg-neutral-600"
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-all duration-200 ease-out ${
                  notificationsEnabled
                    ? "left-[calc(100%-1.375rem)]"
                    : "left-0.5"
                }`}
              />
            </button>
          </div>
        )}

        {/* Migrate Convo Button */}
        {slotId && (
          <button
            type="button"
            onClick={() => {
              setMigrateCombo(["", "", "", ""]);
              setMigrateSuccess(null);
              setShowMigrateModal(true);
            }}
            className="w-full flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white hover:bg-white/5 transition-colors"
          >
            <svg
              className="w-4 h-4 text-neutral-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
              />
            </svg>
            <span>Migrate Convo</span>
          </button>
        )}

        {/* Disguise Timeout Settings */}
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm">🎭</span>
            <h3 className="text-sm font-semibold text-white">
              Disguise Timeout
            </h3>
          </div>
          <p className="text-[10px] text-neutral-400 leading-relaxed">
            Set a timeout to skip the AI disguise and go straight to your room.
            With a timeout active, room switching is locked until it expires.
          </p>
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
                className={`rounded-xl px-2 py-1.5 text-xs font-medium transition-all duration-150 active:scale-[0.97] ${
                  disguiseTimeout === opt.value && !showCustomTimeout
                    ? "bg-violet-500/80 text-white shadow-[0_0_8px_rgba(139,92,246,0.3)] border border-violet-400/30"
                    : "border border-white/10 bg-white/[0.04] text-neutral-400 hover:bg-white/10 hover:text-white"
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
                className={`rounded-xl px-2 py-1.5 text-xs font-medium transition-all duration-150 active:scale-[0.97] ${
                  disguiseTimeout === opt.value && !showCustomTimeout
                    ? "bg-violet-500/80 text-white shadow-[0_0_8px_rgba(139,92,246,0.3)] border border-violet-400/30"
                    : "border border-white/10 bg-white/[0.04] text-neutral-400 hover:bg-white/10 hover:text-white"
                }`}
              >
                {opt.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setShowCustomTimeout(!showCustomTimeout)}
              className={`rounded-xl px-2 py-1.5 text-xs font-medium transition-all duration-150 active:scale-[0.97] ${
                showCustomTimeout ||
                ![0, 5, 10, 30, 60, 120, 240].includes(disguiseTimeout)
                  ? "bg-violet-500/80 text-white shadow-[0_0_8px_rgba(139,92,246,0.3)] border border-violet-400/30"
                  : "border border-white/10 bg-white/[0.04] text-neutral-400 hover:bg-white/10 hover:text-white"
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
                className="flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-violet-400/40"
              />
              <button
                type="button"
                disabled={!customTimeoutValue || Number(customTimeoutValue) < 1}
                onClick={() => {
                  const mins = Math.max(
                    1,
                    Math.round(Number(customTimeoutValue)),
                  );
                  onSetDisguiseTimeout(mins);
                  setCustomTimeoutValue("");
                  setShowCustomTimeout(false);
                }}
                className="rounded-xl bg-violet-500/80 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-500 active:scale-[0.97] transition-all disabled:opacity-40"
              >
                Set
              </button>
            </div>
          )}
          {disguiseTimeout > 0 && (
            <p className="text-[10px] text-amber-300/60 text-center">
              Disguise skipped for{" "}
              {disguiseTimeout >= 60
                ? `${disguiseTimeout / 60}h`
                : `${disguiseTimeout}m`}{" "}
              — room switching locked
            </p>
          )}
          {disguiseTimeout === 0 && (
            <p className="text-[10px] text-violet-300/60 text-center">
              Disguise always shows — you can switch rooms freely
            </p>
          )}
        </div>

        <p className="text-xs text-neutral-400 text-center">
          Leaving clears all messages and images for both users.
        </p>

        {slotId && (
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Type confirmation phrase to leave..."
              value={leaveConfirmText}
              onChange={(e) => setLeaveConfirmText(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-2 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-red-400/40"
            />
            <p className="text-[10px] text-neutral-500 text-center">
              Type:{" "}
              <span className="font-mono text-neutral-400">
                yesireallywanttoactuallyleavefrfr
              </span>
            </p>
            <button
              onClick={() => {
                handleLeave();
                setLeaveConfirmText("");
              }}
              disabled={!canLeave || isLeaving}
              className={`w-full rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                canLeave
                  ? "border-red-400/30 bg-red-500/20 text-red-200 hover:bg-red-500/30"
                  : "border-neutral-700 bg-neutral-800/50 text-neutral-500 cursor-not-allowed"
              } disabled:opacity-50`}
            >
              {isLeaving ? "Leaving..." : "Leave & Clear Room"}
            </button>
          </div>
        )}

        {error && <p className="text-xs text-red-300 text-center">{error}</p>}

        {/* Games Section */}
        <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 overflow-hidden">
          {/* Game Tabs */}
          <div className="flex border-b border-white/10">
            <button
              type="button"
              onClick={() => setActiveGame("ttt")}
              className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
                activeGame === "ttt"
                  ? "bg-white/10 text-white"
                  : "text-neutral-400 hover:text-white hover:bg-white/5"
              }`}
            >
              ❌⭕ Tic Tac Toe
            </button>
            <button
              type="button"
              onClick={() => setActiveGame("wordsearch")}
              className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
                activeGame === "wordsearch"
                  ? "bg-white/10 text-white"
                  : "text-neutral-400 hover:text-white hover:bg-white/5"
              }`}
            >
              🔤 Word Search
            </button>
          </div>

          {/* Tic Tac Toe Game */}
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
              <p className="mt-1 text-[11px] text-neutral-400">
                Spot 1 is X • Spot 2 is O
              </p>

              {/* Turn indicator */}
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

              {/* Classic TTT grid with lines */}
              <div
                className="mt-3 relative mx-auto"
                style={{ width: "180px", height: "180px" }}
              >
                {/* Vertical lines */}
                <div className="absolute top-0 left-[60px] w-0.5 h-full bg-white/30" />
                <div className="absolute top-0 left-[120px] w-0.5 h-full bg-white/30" />
                {/* Horizontal lines */}
                <div className="absolute top-[60px] left-0 h-0.5 w-full bg-white/30" />
                <div className="absolute top-[120px] left-0 h-0.5 w-full bg-white/30" />

                {/* Winning line overlay */}
                {tttState?.winningLine &&
                  tttState.winner &&
                  tttState.winner !== "draw" && (
                    <WinningLineOverlay
                      line={tttState.winningLine}
                      winner={tttState.winner}
                    />
                  )}

                {/* Cells */}
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
                        } ${
                          isX
                            ? "text-emerald-400"
                            : isO
                              ? "text-amber-400"
                              : "text-white"
                        } disabled:cursor-default`}
                      >
                        {isX ? "X" : isO ? "O" : ""}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Word Search Game */}
          {activeGame === "wordsearch" && (
            <WordSearchGame
              slotId={slotId}
              themeColors={themeColors}
              slots={slots}
              roomPath={roomPath}
            />
          )}
        </div>
      </div>

      {/* Photo Gallery Overlay */}
      {showPhotoGallery && (
        <PhotoGalleryOverlay
          messages={messages}
          themeColors={themeColors}
          onClose={() => setShowPhotoGallery(false)}
        />
      )}

      {/* Drawing Gallery Overlay */}
      {showDrawingGallery && (
        <DrawingGalleryOverlay
          messages={messages}
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
                {passkeyBusy
                  ? "..."
                  : passkeyModal.mode === "set"
                    ? "Save"
                    : passkeyModal.mode === "kick"
                      ? "Kick"
                      : "Claim"}
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
              Enter the destination room combo. All messages will be moved from
              this room to the destination.
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
                  const ok = await onMigrateConvo(destCombo);
                  if (ok) {
                    setMigrateSuccess("Messages migrated!");
                    setTimeout(() => setShowMigrateModal(false), 1000);
                  }
                  setMigrateBusy(false);
                }}
                className="flex-1 rounded-xl bg-emerald-500/80 px-3 py-2 text-xs font-semibold text-black hover:bg-emerald-500 transition-colors disabled:opacity-50"
              >
                {migrateBusy ? "Migrating..." : "Migrate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
