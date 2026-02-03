"use client";

import { useCallback } from "react";
import { ref, runTransaction } from "firebase/database";
import { rtdb } from "@/lib/firebaseConfig";
import { ROOM_PATH } from "../constants";
import type { TttState } from "../types";

const WINNING_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export function useTicTacToe(slotId: "1" | "2" | null) {
  // Helper to convert Firebase board (object or array) to proper array
  const parseBoard = useCallback((boardData: unknown): Array<"1" | "2" | null> => {
    if (Array.isArray(boardData) && boardData.length === 9) {
      return boardData.map(v => v === "1" ? "1" : v === "2" ? "2" : null);
    }
    if (boardData && typeof boardData === 'object') {
      // Firebase stores arrays as objects with numeric keys
      const obj = boardData as Record<string, unknown>;
      return Array(9).fill(null).map((_, i) => {
        const v = obj[String(i)];
        return v === "1" ? "1" : v === "2" ? "2" : null;
      });
    }
    return Array(9).fill(null) as Array<"1" | "2" | null>;
  }, []);

  const getTttWinner = useCallback((board: Array<"1" | "2" | null>): { winner: "1" | "2" | null; line: number[] | null } => {
    for (const line of WINNING_LINES) {
      const [a, b, c] = line;
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return { winner: board[a], line };
      }
    }
    return { winner: null, line: null };
  }, []);

  const handleTttMove = useCallback(
    async (index: number) => {
      if (!slotId) return;

      const tttRef = ref(rtdb, `${ROOM_PATH}/ticTacToe`);
      try {
        await runTransaction(tttRef, (current) => {
          // Parse the board from Firebase (handles both array and object formats)
          const board = parseBoard(current?.board);
          
          // Get current turn, default to "1"
          const currentTurn = current?.turn === "2" ? "2" : "1";
          const existingWinner = current?.winner ?? null;

          if (existingWinner) return current;
          if (currentTurn !== slotId) return current;
          if (board[index]) return current;

          const nextBoard = [...board] as Array<"1" | "2" | null>;
          nextBoard[index] = slotId;
          const { winner: newWinner, line: winningLine } = getTttWinner(nextBoard);
          const isDraw = !newWinner && nextBoard.every(Boolean);
          return {
            board: nextBoard,
            turn: currentTurn === "1" ? "2" : "1",
            winner: newWinner ? newWinner : isDraw ? "draw" : null,
            winningLine: winningLine,
            resetVotes: {},
          };
        });
      } catch (err) {
        console.error("TTT move error:", err);
      }
    },
    [getTttWinner, parseBoard, slotId],
  );

  const handleTttReset = useCallback(async () => {
    if (!slotId) return;
    const tttRef = ref(rtdb, `${ROOM_PATH}/ticTacToe`);
    await runTransaction(tttRef, (current) => {
      const resetVotes = current?.resetVotes ?? {};
      const newVotes = { ...resetVotes, [slotId]: true };

      // If both players voted, reset the game
      if (newVotes["1"] && newVotes["2"]) {
        return {
          board: Array(9).fill(null),
          turn: "1",
          winner: null,
          winningLine: null,
          resetVotes: {},
        };
      }

      // Otherwise just record the vote
      return {
        ...current,
        resetVotes: newVotes,
      };
    });
  }, [slotId]);

  return {
    getTttWinner,
    handleTttMove,
    handleTttReset,
  };
}
