"use client";

import { useCallback } from "react";
import { ref, runTransaction } from "firebase/database";
import { rtdb } from "@/lib/firebaseConfig";
import { ROOM_PATH } from "../constants";
import type { TttState } from "../types";

export function useTicTacToe(slotId: "1" | "2" | null) {
  const getTttWinner = useCallback((board: Array<"1" | "2" | null>) => {
    const lines = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ];
    for (const [a, b, c] of lines) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return board[a];
      }
    }
    return null;
  }, []);

  const handleTttMove = useCallback(
    async (index: number) => {
      console.log("handleTttMove called", { index, slotId });
      if (!slotId) {
        console.log("No slotId, returning");
        return;
      }

      const tttRef = ref(rtdb, `${ROOM_PATH}/ticTacToe`);
      try {
        const result = await runTransaction(tttRef, (current) => {
          console.log("Transaction current state:", current);
          
          // Get or create board
          let board: Array<"1" | "2" | null>;
          if (!current || !Array.isArray(current.board) || current.board.length !== 9) {
            console.log("Creating new board");
            board = Array(9).fill(null) as Array<"1" | "2" | null>;
          } else {
            board = current.board as Array<"1" | "2" | null>;
          }
          
          // Get current turn, default to "1"
          const currentTurn = current?.turn === "2" ? "2" : "1";
          const winner = current?.winner ?? null;

          if (winner) {
            console.log("Game already won, returning current");
            return current;
          }
          if (currentTurn !== slotId) {
            console.log("Not your turn", { currentTurn, slotId });
            return current;
          }
          if (board[index]) {
            console.log("Cell already occupied");
            return current;
          }

          console.log("Making move");
          const nextBoard = [...board] as Array<"1" | "2" | null>;
          nextBoard[index] = slotId;
          const newWinner = getTttWinner(nextBoard);
          const isDraw = !newWinner && nextBoard.every(Boolean);
          return {
            board: nextBoard,
            turn: currentTurn === "1" ? "2" : "1",
            winner: newWinner ? newWinner : isDraw ? "draw" : null,
            resetVotes: {},
          };
        });
        console.log("Transaction result:", result);
      } catch (err) {
        console.error("Transaction error:", err);
      }
    },
    [getTttWinner, slotId],
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
