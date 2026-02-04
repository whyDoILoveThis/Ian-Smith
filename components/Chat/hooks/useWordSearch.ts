"use client";

import { useCallback, useEffect, useState } from "react";
import { ref, onValue, set, runTransaction, update } from "firebase/database";
import { rtdb } from "@/lib/firebaseConfig";
import { ROOM_PATH } from "../constants";
import type { WordSearchState, WordCell, WordSearchWord } from "../types";

const WORD_SEARCH_PATH = `${ROOM_PATH}/wordSearch`;

const DEFAULT_STATE: WordSearchState = {
  grid: [],
  words: [],
  theme: "",
  gridSize: 12,
  scores: { "1": 0, "2": 0 },
  prompt: "",
  status: "idle",
  winner: null,
  currentSelection: null,
  resetVotes: {},
};

export function useWordSearch(slotId: "1" | "2" | null) {
  const [state, setState] = useState<WordSearchState>(DEFAULT_STATE);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Listen to Firebase state
  useEffect(() => {
    const wsRef = ref(rtdb, WORD_SEARCH_PATH);
    const unsub = onValue(wsRef, (snap) => {
      const data = snap.val();
      if (data) {
        // Parse grid from Firebase (might be object format)
        let grid = data.grid || [];
        if (grid && !Array.isArray(grid)) {
          // Convert object to array
          grid = Object.keys(grid)
            .sort((a, b) => Number(a) - Number(b))
            .map((key) => {
              const row = grid[key];
              if (Array.isArray(row)) return row;
              if (row && typeof row === "object") {
                return Object.keys(row)
                  .sort((a, b) => Number(a) - Number(b))
                  .map((k) => row[k]);
              }
              return [];
            });
        }

        // Parse words array
        let words = data.words || [];
        if (words && !Array.isArray(words)) {
          words = Object.keys(words)
            .sort((a, b) => Number(a) - Number(b))
            .map((key) => {
              const w = words[key];
              // Also parse cells if it's an object
              if (w && w.cells && !Array.isArray(w.cells)) {
                w.cells = Object.keys(w.cells)
                  .sort((a, b) => Number(a) - Number(b))
                  .map((k) => w.cells[k]);
              }
              return w;
            });
        }

        setState({
          grid,
          words,
          theme: data.theme || "",
          gridSize: data.gridSize || 12,
          scores: data.scores || { "1": 0, "2": 0 },
          prompt: data.prompt || "",
          status: data.status || "idle",
          generatedAt: data.generatedAt,
          winner: data.winner || null,
          currentSelection: data.currentSelection || null,
          resetVotes: data.resetVotes || {},
        });
      } else {
        setState(DEFAULT_STATE);
      }
    });
    return () => unsub();
  }, []);

  // Update shared prompt
  const updatePrompt = useCallback(async (newPrompt: string) => {
    try {
      await set(ref(rtdb, `${WORD_SEARCH_PATH}/prompt`), newPrompt);
    } catch (err) {
      console.error("Error updating prompt:", err);
    }
  }, []);

  // Generate new puzzle
  const generatePuzzle = useCallback(async () => {
    if (!state.prompt.trim()) {
      setError("Please enter a theme first!");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // Set status to generating
      await set(ref(rtdb, `${WORD_SEARCH_PATH}/status`), "generating");

      const response = await fetch("/api/generate-wordsearch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: state.prompt,
          gridSize: 12,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to generate puzzle");
      }

      const data = await response.json();

      // Save to Firebase
      await set(ref(rtdb, WORD_SEARCH_PATH), {
        grid: data.grid,
        words: data.words.map((w: WordSearchWord) => ({
          ...w,
          foundBy: null,
        })),
        theme: data.theme,
        gridSize: data.gridSize,
        scores: { "1": 0, "2": 0 },
        prompt: state.prompt,
        status: "playing",
        generatedAt: Date.now(),
        winner: null,
        currentSelection: null,
        resetVotes: {},
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate");
      await set(ref(rtdb, `${WORD_SEARCH_PATH}/status`), "prompting");
    } finally {
      setIsGenerating(false);
    }
  }, [state.prompt]);

  // Start prompting phase
  const startNewGame = useCallback(async () => {
    await set(ref(rtdb, WORD_SEARCH_PATH), {
      ...DEFAULT_STATE,
      status: "prompting",
    });
  }, []);

  // Check if cells form a word
  const checkWord = useCallback(
    (selectedCells: WordCell[]): WordSearchWord | null => {
      if (selectedCells.length < 3) return null;

      // Sort cells to check against word placements
      const cellKey = (c: WordCell) => `${c.row},${c.col}`;
      const selectedSet = new Set(selectedCells.map(cellKey));

      for (const wordData of state.words) {
        if (wordData.foundBy) continue; // Already found

        // Check if selected cells match this word's cells
        if (wordData.cells.length !== selectedCells.length) continue;

        const wordCellSet = new Set(wordData.cells.map(cellKey));
        const allMatch = selectedCells.every((c) => wordCellSet.has(cellKey(c)));
        const sameSize = wordCellSet.size === selectedSet.size;

        if (allMatch && sameSize) {
          return wordData;
        }
      }

      return null;
    },
    [state.words]
  );

  // Submit a word selection
  const submitSelection = useCallback(
    async (cells: WordCell[]) => {
      if (!slotId) return;

      const foundWord = checkWord(cells);
      if (!foundWord) return;

      // Update the word as found and add points
      const wsRef = ref(rtdb, WORD_SEARCH_PATH);
      await runTransaction(wsRef, (current) => {
        if (!current) return current;

        const words = current.words || [];
        const wordIndex = words.findIndex(
          (w: WordSearchWord) => w.word === foundWord.word
        );

        if (wordIndex === -1 || words[wordIndex].foundBy) {
          return current; // Already found or doesn't exist
        }

        // Mark word as found
        words[wordIndex] = {
          ...words[wordIndex],
          foundBy: slotId,
        };

        // Update score
        const scores = current.scores || { "1": 0, "2": 0 };
        scores[slotId] = (scores[slotId] || 0) + foundWord.points;

        // Check if all words are found
        const allFound = words.every((w: WordSearchWord) => w.foundBy);
        let winner = current.winner;
        let status = current.status;

        if (allFound) {
          status = "finished";
          if (scores["1"] > scores["2"]) {
            winner = "1";
          } else if (scores["2"] > scores["1"]) {
            winner = "2";
          } else {
            winner = "tie";
          }
        }

        return {
          ...current,
          words,
          scores,
          status,
          winner,
          currentSelection: null,
        };
      });
    },
    [slotId, checkWord]
  );

  // Update current selection (for showing other player's selection)
  const updateSelection = useCallback(
    async (cells: WordCell[] | null) => {
      if (!slotId) return;
      
      if (cells && cells.length > 0) {
        await set(ref(rtdb, `${WORD_SEARCH_PATH}/currentSelection`), {
          slotId,
          cells,
        });
      } else {
        await set(ref(rtdb, `${WORD_SEARCH_PATH}/currentSelection`), null);
      }
    },
    [slotId]
  );

  // Vote to reset
  const voteReset = useCallback(async () => {
    if (!slotId) return;

    await runTransaction(ref(rtdb, WORD_SEARCH_PATH), (current) => {
      if (!current) return DEFAULT_STATE;

      const resetVotes = current.resetVotes || {};
      const newVotes = { ...resetVotes, [slotId]: true };

      // If both players voted, reset to prompting
      if (newVotes["1"] && newVotes["2"]) {
        return {
          ...DEFAULT_STATE,
          status: "prompting",
        };
      }

      return {
        ...current,
        resetVotes: newVotes,
      };
    });
  }, [slotId]);

  // End game early
  const endGame = useCallback(async () => {
    const scores = state.scores;
    let winner: "1" | "2" | "tie" | null = null;
    
    if (scores["1"] > scores["2"]) {
      winner = "1";
    } else if (scores["2"] > scores["1"]) {
      winner = "2";
    } else if (scores["1"] > 0 || scores["2"] > 0) {
      winner = "tie";
    }

    await update(ref(rtdb, WORD_SEARCH_PATH), {
      status: "finished",
      winner,
    });
  }, [state.scores]);

  return {
    state,
    isGenerating,
    error,
    updatePrompt,
    generatePuzzle,
    startNewGame,
    submitSelection,
    updateSelection,
    voteReset,
    endGame,
  };
}
