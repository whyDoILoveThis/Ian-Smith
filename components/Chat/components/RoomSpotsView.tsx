"use client";

import React, { useState } from "react";
import { RING_COLORS } from "../constants";
import type { Slots, TttState } from "../types";

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
  onEditPasskey: () => void;
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
}: RoomSpotsViewProps) {
  const [leaveConfirmText, setLeaveConfirmText] = useState("");
  const LEAVE_CONFIRMATION = "yesireallywanttoactuallyleavefrfr";
  const canLeave = leaveConfirmText === LEAVE_CONFIRMATION;

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
            <button
              type="button"
              onClick={onEditPasskey}
              className="ml-2 text-neutral-400 hover:text-white text-sm transition-colors"
            >
              ✎
            </button>
          </div>
        )}

        <h2 className="text-lg font-semibold text-white text-center">
          Room Spots
        </h2>

        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white">
            <span>Spot 1</span>
            <span
              className={
                availability.isSlot1Taken
                  ? "text-amber-300"
                  : "text-emerald-300"
              }
            >
              {slots["1"]?.name || "Available"}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white">
            <span>Spot 2</span>
            <span
              className={
                availability.isSlot2Taken
                  ? "text-amber-300"
                  : "text-emerald-300"
              }
            >
              {slots["2"]?.name || "Available"}
            </span>
          </div>
        </div>

        {slotId ? (
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-200 text-center">
            You are in spot {slotId} as{" "}
            <span className="font-semibold">{screenName}</span>
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

        {/* Tic Tac Toe Game */}
        <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Tic Tac Toe</h3>
            <button
              type="button"
              onClick={handleTttReset}
              disabled={!slotId}
              className="relative text-xs text-neutral-400 hover:text-white transition-colors disabled:opacity-50"
            >
              Reset
              {/* Red dot if other player voted to reset */}
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
              {/* Check if you already voted */}
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
      </div>
    </div>
  );
}
