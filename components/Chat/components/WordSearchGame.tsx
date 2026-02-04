"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useWordSearch } from "../hooks/useWordSearch";
import type { ThemeColors, WordCell, Slots } from "../types";

type WordSearchGameProps = {
  slotId: "1" | "2" | null;
  themeColors: ThemeColors;
  slots: Slots;
};

// Player colors
const PLAYER_COLORS = {
  "1": {
    bg: "bg-orange-500/70",
    border: "border-orange-400",
    text: "text-orange-400",
    highlight: "rgba(249, 115, 22, 0.4)", // orange-500
    selection: "rgba(249, 115, 22, 0.6)",
  },
  "2": {
    bg: "bg-cyan-500/70",
    border: "border-cyan-400",
    text: "text-cyan-400",
    highlight: "rgba(6, 182, 212, 0.4)", // cyan-500
    selection: "rgba(6, 182, 212, 0.6)",
  },
} as const;

function cellKey(cell: WordCell): string {
  return `${cell.row},${cell.col}`;
}

export function WordSearchGame({
  slotId,
  themeColors,
  slots,
}: WordSearchGameProps) {
  const {
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
  } = useWordSearch(slotId);

  const [localPrompt, setLocalPrompt] = useState("");
  const [selectedCells, setSelectedCells] = useState<WordCell[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<WordCell | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // Sync local prompt with Firebase
  useEffect(() => {
    setLocalPrompt(state.prompt);
  }, [state.prompt]);

  // Get cells in a line from start to end
  const getCellsInLine = useCallback(
    (start: WordCell, end: WordCell): WordCell[] => {
      const cells: WordCell[] = [];
      const rowDiff = end.row - start.row;
      const colDiff = end.col - start.col;
      const steps = Math.max(Math.abs(rowDiff), Math.abs(colDiff));

      if (steps === 0) {
        cells.push(start);
        return cells;
      }

      const rowStep = rowDiff === 0 ? 0 : rowDiff / Math.abs(rowDiff);
      const colStep = colDiff === 0 ? 0 : colDiff / Math.abs(colDiff);

      // Only allow straight lines (horizontal, vertical, diagonal)
      const isValidLine =
        rowDiff === 0 ||
        colDiff === 0 ||
        Math.abs(rowDiff) === Math.abs(colDiff);

      if (!isValidLine) {
        // Just return start if not a valid line
        cells.push(start);
        return cells;
      }

      for (let i = 0; i <= steps; i++) {
        cells.push({
          row: start.row + i * rowStep,
          col: start.col + i * colStep,
        });
      }

      return cells;
    },
    [],
  );

  // Handle cell interaction
  const getCellFromEvent = useCallback(
    (e: React.MouseEvent | React.TouchEvent): WordCell | null => {
      if (!gridRef.current) return null;

      const rect = gridRef.current.getBoundingClientRect();
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

      const x = clientX - rect.left;
      const y = clientY - rect.top;

      const cellSize = rect.width / state.gridSize;
      const col = Math.floor(x / cellSize);
      const row = Math.floor(y / cellSize);

      if (
        row >= 0 &&
        row < state.gridSize &&
        col >= 0 &&
        col < state.gridSize
      ) {
        return { row, col };
      }
      return null;
    },
    [state.gridSize],
  );

  const handleStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (state.status !== "playing" || !slotId) return;
      const cell = getCellFromEvent(e);
      if (cell) {
        setIsDragging(true);
        setDragStart(cell);
        setSelectedCells([cell]);
        updateSelection([cell]);
      }
    },
    [state.status, slotId, getCellFromEvent, updateSelection],
  );

  const handleMove = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDragging || !dragStart) return;
      const cell = getCellFromEvent(e);
      if (cell) {
        const cells = getCellsInLine(dragStart, cell);
        setSelectedCells(cells);
        updateSelection(cells);
      }
    },
    [isDragging, dragStart, getCellFromEvent, getCellsInLine, updateSelection],
  );

  const handleEnd = useCallback(() => {
    if (isDragging && selectedCells.length > 0) {
      submitSelection(selectedCells);
    }
    setIsDragging(false);
    setDragStart(null);
    setSelectedCells([]);
    updateSelection(null);
  }, [isDragging, selectedCells, submitSelection, updateSelection]);

  // Touch event handling for mobile
  useEffect(() => {
    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging) {
        e.preventDefault(); // Prevent scrolling while selecting
      }
    };
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    return () => document.removeEventListener("touchmove", handleTouchMove);
  }, [isDragging]);

  // Build a map of found cells for highlighting
  const foundCellsMap = new Map<string, "1" | "2">();
  for (const word of state.words) {
    if (word.foundBy) {
      for (const cell of word.cells) {
        foundCellsMap.set(cellKey(cell), word.foundBy);
      }
    }
  }

  // Current selection set
  const selectionSet = new Set(selectedCells.map(cellKey));

  // Other player's selection
  const otherSelection = state.currentSelection;
  const otherSelectionSet = new Set<string>();
  if (otherSelection && otherSelection.slotId !== slotId) {
    for (const cell of otherSelection.cells) {
      otherSelectionSet.add(cellKey(cell));
    }
  }

  // Prompt change handler with debounce
  const promptTimeoutRef = useRef<number | null>(null);
  const handlePromptChange = useCallback(
    (value: string) => {
      setLocalPrompt(value);
      if (promptTimeoutRef.current) {
        window.clearTimeout(promptTimeoutRef.current);
      }
      promptTimeoutRef.current = window.setTimeout(() => {
        updatePrompt(value);
      }, 300);
    },
    [updatePrompt],
  );

  const player1Name = slots["1"]?.name || "Player 1";
  const player2Name = slots["2"]?.name || "Player 2";

  // IDLE STATE - Show start button
  if (state.status === "idle") {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-6">
        <div className="text-center">
          <h3 className="text-xl font-bold text-white mb-2">🔤 Word Search</h3>
          <p className="text-sm text-neutral-400 mb-4">
            Compete to find words! Longer words = more points!
          </p>
        </div>
        <button
          type="button"
          onClick={startNewGame}
          className={`px-6 py-3 rounded-xl font-bold text-white ${themeColors.btn} hover:opacity-90 transition-opacity`}
        >
          Start Word Search
        </button>
      </div>
    );
  }

  // PROMPTING STATE - Show prompt input
  if (state.status === "prompting" || state.status === "generating") {
    return (
      <div className="flex flex-col gap-4 p-4">
        <div className="text-center">
          <h3 className="text-xl font-bold text-white mb-2">🔤 Word Search</h3>
          <p className="text-sm text-neutral-400">
            Enter a theme for your word search puzzle!
          </p>
        </div>

        <div className="relative">
          <input
            type="text"
            value={localPrompt}
            onChange={(e) => handlePromptChange(e.target.value)}
            placeholder="e.g., Space, Animals, Food, Movies..."
            className="w-full rounded-xl bg-white/10 border border-white/20 px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
            disabled={state.status === "generating"}
          />
          {localPrompt !== state.prompt && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-amber-400">
              syncing...
            </span>
          )}
        </div>

        <p className="text-center text-xs text-neutral-500">
          Both players see this input in real-time!
        </p>

        {error && <p className="text-center text-sm text-red-400">{error}</p>}

        <button
          type="button"
          onClick={generatePuzzle}
          disabled={!localPrompt.trim() || state.status === "generating"}
          className={`px-6 py-3 rounded-xl font-bold text-white ${themeColors.btn} hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
        >
          {state.status === "generating" ? (
            <>
              <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Generating...
            </>
          ) : (
            "Generate Puzzle 🎲"
          )}
        </button>
      </div>
    );
  }

  // PLAYING or FINISHED STATE
  return (
    <div className="flex flex-col gap-3 p-2">
      {/* Header with scores */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <div className={`h-3 w-3 rounded-full ${PLAYER_COLORS["1"].bg}`} />
          <span className="text-sm font-medium text-white truncate max-w-[80px]">
            {player1Name}
          </span>
          <span className={`text-lg font-bold ${PLAYER_COLORS["1"].text}`}>
            {state.scores["1"]}
          </span>
        </div>

        <div className="text-center">
          <p className="text-xs text-neutral-400">{state.theme}</p>
          {state.status === "finished" && (
            <p className="text-sm font-bold text-amber-400">
              {state.winner === "tie"
                ? "Tie Game!"
                : state.winner === "1"
                  ? `${player1Name} Wins!`
                  : `${player2Name} Wins!`}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className={`text-lg font-bold ${PLAYER_COLORS["2"].text}`}>
            {state.scores["2"]}
          </span>
          <span className="text-sm font-medium text-white truncate max-w-[80px]">
            {player2Name}
          </span>
          <div className={`h-3 w-3 rounded-full ${PLAYER_COLORS["2"].bg}`} />
        </div>
      </div>

      {/* Word Search Grid */}
      <div
        ref={gridRef}
        className="relative aspect-square w-full select-none touch-none rounded-lg overflow-hidden bg-black/30 border border-white/10"
        onMouseDown={handleStart}
        onMouseMove={handleMove}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
      >
        <div
          className="grid h-full w-full"
          style={{
            gridTemplateColumns: `repeat(${state.gridSize}, 1fr)`,
            gridTemplateRows: `repeat(${state.gridSize}, 1fr)`,
          }}
        >
          {state.grid.map((row, rowIdx) =>
            row.map((letter, colIdx) => {
              const key = cellKey({ row: rowIdx, col: colIdx });
              const foundBy = foundCellsMap.get(key);
              const isSelected = selectionSet.has(key);
              const isOtherSelected = otherSelectionSet.has(key);

              let bgColor = "";
              let borderColor = "";

              if (isSelected && slotId) {
                bgColor = PLAYER_COLORS[slotId].selection;
                borderColor = PLAYER_COLORS[slotId].border;
              } else if (isOtherSelected && otherSelection) {
                bgColor = PLAYER_COLORS[otherSelection.slotId].selection;
                borderColor = PLAYER_COLORS[otherSelection.slotId].border;
              } else if (foundBy) {
                bgColor = PLAYER_COLORS[foundBy].highlight;
              }

              return (
                <div
                  key={key}
                  className={`flex items-center justify-center text-base sm:text-lg md:text-xl font-bold text-white transition-colors duration-100 ${
                    borderColor ? `border-2 ${borderColor}` : ""
                  }`}
                  style={{ backgroundColor: bgColor }}
                >
                  {letter}
                </div>
              );
            }),
          )}
        </div>

        {/* Overlay for finished state */}
        {state.status === "finished" && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <div className="text-center p-4">
              <p className="text-3xl mb-2">🏆</p>
              <p className="text-xl font-bold text-white mb-1">Game Over!</p>
              <p className="text-lg text-amber-400">
                {state.winner === "tie"
                  ? "It's a tie!"
                  : state.winner === "1"
                    ? `${player1Name} wins!`
                    : `${player2Name} wins!`}
              </p>
              <p className="text-sm text-neutral-400 mt-2">
                {state.scores["1"]} - {state.scores["2"]}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Words to find */}
      <div className="rounded-lg bg-black/20 p-3">
        <p className="text-xs font-medium text-neutral-400 mb-2">
          Words to find ({state.words.filter((w) => w.foundBy).length}/
          {state.words.length}):
        </p>
        <div className="flex flex-wrap gap-1.5">
          {state.words.map((wordData) => (
            <span
              key={wordData.word}
              className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${
                wordData.foundBy
                  ? `${PLAYER_COLORS[wordData.foundBy].bg} text-white line-through opacity-70`
                  : "bg-white/10 text-white"
              }`}
            >
              {wordData.word}
              <span className="ml-1 opacity-60">+{wordData.points}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-2 px-1">
        {state.status === "playing" && (
          <>
            <button
              type="button"
              onClick={endGame}
              className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 text-xs font-medium hover:bg-amber-500/30 transition-colors"
            >
              End Game
            </button>
            <button
              type="button"
              onClick={voteReset}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                state.resetVotes?.[slotId || "1"]
                  ? "bg-red-500/40 text-red-300"
                  : "bg-red-500/20 text-red-400 hover:bg-red-500/30"
              }`}
            >
              {state.resetVotes?.[slotId || "1"]
                ? "Waiting for other..."
                : "New Puzzle"}
            </button>
          </>
        )}

        {state.status === "finished" && (
          <button
            type="button"
            onClick={startNewGame}
            className={`w-full px-4 py-2 rounded-xl font-bold text-white ${themeColors.btn} hover:opacity-90 transition-opacity`}
          >
            Play Again
          </button>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 text-xs text-neutral-500">
        <div className="flex items-center gap-1">
          <div className={`h-2 w-2 rounded-full ${PLAYER_COLORS["1"].bg}`} />
          <span>{player1Name}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className={`h-2 w-2 rounded-full ${PLAYER_COLORS["2"].bg}`} />
          <span>{player2Name}</span>
        </div>
      </div>
    </div>
  );
}
