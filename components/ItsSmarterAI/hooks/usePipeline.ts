"use client";

import { useState, useCallback, useRef } from "react";
import type {
  PipelineState,
  FocalPoint,
  TodoItem,
  ThinkingMode,
  ConversationTurn,
} from "../types/pipeline";
import { INITIAL_PIPELINE_STATE } from "../types/pipeline";
import {
  CONFIDENCE_THRESHOLD,
  MAX_RETRIES,
  REQUEST_DELAY_MS,
} from "../lib/constants";
import {
  apiDecompose,
  apiExecuteFocalPoint,
  apiGenerateTodos,
  apiExecuteTodo,
  apiSynthesize,
  apiFastChat,
  apiMediumSummary,
} from "../lib/api";
import { delay } from "../utils/delay";

let idCounter = 0;
function nextId(prefix: string) {
  return `${prefix}-${++idCounter}`;
}

/** Build a lightweight conversation history array from completed turns */
function buildHistory(turns: ConversationTurn[]): { role: string; content: string }[] {
  const history: { role: string; content: string }[] = [];
  for (const turn of turns) {
    if (turn.status !== "complete") continue;
    history.push({ role: "user", content: turn.prompt });
    if (turn.finalOutput) {
      history.push({ role: "assistant", content: turn.finalOutput });
    }
  }
  return history;
}

export function usePipeline() {
  const [state, setState] = useState<PipelineState>(INITIAL_PIPELINE_STATE);
  const abortRef = useRef(false);

  /* ───── Helpers to update a specific turn's data ───── */
  const updateTurn = useCallback(
    (turnId: string, patch: Partial<ConversationTurn>) => {
      setState((prev) => ({
        ...prev,
        turns: prev.turns.map((t) => (t.id === turnId ? { ...t, ...patch } : t)),
      }));
    },
    []
  );

  const updateFocalPointInTurn = useCallback(
    (turnId: string, fpId: string, patch: Partial<FocalPoint>) => {
      setState((prev) => ({
        ...prev,
        turns: prev.turns.map((t) =>
          t.id === turnId
            ? {
                ...t,
                focalPoints: t.focalPoints.map((fp) =>
                  fp.id === fpId ? { ...fp, ...patch } : fp
                ),
              }
            : t
        ),
      }));
    },
    []
  );

  const updateTodoInTurn = useCallback(
    (turnId: string, fpId: string, todoId: string, patch: Partial<TodoItem>) => {
      setState((prev) => ({
        ...prev,
        turns: prev.turns.map((t) =>
          t.id === turnId
            ? {
                ...t,
                focalPoints: t.focalPoints.map((fp) =>
                  fp.id === fpId
                    ? {
                        ...fp,
                        todos: fp.todos.map((td) =>
                          td.id === todoId ? { ...td, ...patch } : td
                        ),
                      }
                    : fp
                ),
              }
            : t
        ),
      }));
    },
    []
  );

  /* ───── Execute a focal point with retry (deep mode) ───── */
  const executeFocalPointWithRetry = useCallback(
    async (turnId: string, prompt: string, fp: FocalPoint) => {
      let retries = 0;
      let lastResponse = "";
      let lastConfidence = 0;
      let lastReasoning = "";

      while (retries <= MAX_RETRIES) {
        if (abortRef.current) return;
        updateFocalPointInTurn(turnId, fp.id, {
          status: retries === 0 ? "running" : "retrying",
          retryCount: retries,
        });

        try {
          const result = await apiExecuteFocalPoint(prompt, fp.text);
          lastResponse = result.response;
          lastConfidence = result.confidence;
          lastReasoning = result.confidenceReasoning;

          updateFocalPointInTurn(turnId, fp.id, {
            response: lastResponse,
            confidence: lastConfidence,
            confidenceReasoning: lastReasoning,
          });

          if (lastConfidence >= CONFIDENCE_THRESHOLD) break;
          if (retries >= MAX_RETRIES) break;
          retries++;
          await delay(REQUEST_DELAY_MS);
        } catch (err) {
          updateFocalPointInTurn(turnId, fp.id, {
            status: "failed",
            response: err instanceof Error ? err.message : "Unknown error",
            confidence: 0,
            confidenceReasoning: "Request failed",
          });
          return;
        }
      }

      updateFocalPointInTurn(turnId, fp.id, {
        status: "complete",
        response: lastResponse,
        confidence: lastConfidence,
        confidenceReasoning: lastReasoning,
        retryCount: retries,
      });
    },
    [updateFocalPointInTurn]
  );

  /* ───── Execute a todo with retry (deep mode) ───── */
  const executeTodoWithRetry = useCallback(
    async (turnId: string, prompt: string, fp: FocalPoint, todo: TodoItem) => {
      let retries = 0;
      let lastResponse = "";
      let lastConfidence = 0;
      let lastReasoning = "";

      while (retries <= MAX_RETRIES) {
        if (abortRef.current) return;
        updateTodoInTurn(turnId, fp.id, todo.id, {
          status: retries === 0 ? "running" : "retrying",
          retryCount: retries,
        });

        try {
          const result = await apiExecuteTodo(prompt, fp.text, todo.text);
          lastResponse = result.response;
          lastConfidence = result.confidence;
          lastReasoning = result.confidenceReasoning;

          updateTodoInTurn(turnId, fp.id, todo.id, {
            response: lastResponse,
            confidence: lastConfidence,
            confidenceReasoning: lastReasoning,
          });

          if (lastConfidence >= CONFIDENCE_THRESHOLD) break;
          if (retries >= MAX_RETRIES) break;
          retries++;
          await delay(REQUEST_DELAY_MS);
        } catch (err) {
          updateTodoInTurn(turnId, fp.id, todo.id, {
            status: "failed",
            response: err instanceof Error ? err.message : "Unknown error",
            confidence: 0,
            confidenceReasoning: "Request failed",
          });
          return;
        }
      }

      updateTodoInTurn(turnId, fp.id, todo.id, {
        status: "complete",
        response: lastResponse,
        confidence: lastConfidence,
        confidenceReasoning: lastReasoning,
        retryCount: retries,
      });
    },
    [updateTodoInTurn]
  );

  /* ═══════════════ FAST MODE ═══════════════ */
  const runFast = useCallback(
    async (turnId: string, prompt: string, history: { role: string; content: string }[]) => {
      setState((prev) => ({ ...prev, status: "thinking" }));
      updateTurn(turnId, { status: "thinking" });

      try {
        const reply = await apiFastChat(prompt, history);
        updateTurn(turnId, { status: "complete", finalOutput: reply });
        setState((prev) => ({ ...prev, status: "complete" }));
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Fast chat failed";
        updateTurn(turnId, { status: "error", error: msg });
        setState((prev) => ({ ...prev, status: "error" }));
      }
    },
    [updateTurn]
  );

  /* ═══════════════ MEDIUM MODE ═══════════════ */
  const runMedium = useCallback(
    async (turnId: string, prompt: string) => {
      setState((prev) => ({ ...prev, status: "decomposing" }));
      updateTurn(turnId, { status: "decomposing" });

      try {
        // Phase 1: Decompose
        const fpTexts = await apiDecompose(prompt);
        const focalPoints: FocalPoint[] = fpTexts.map((text) => ({
          id: nextId("fp"),
          text,
          status: "pending" as const,
          response: null,
          confidence: 0,
          confidenceReasoning: "",
          retryCount: 0,
          todos: [],
        }));

        updateTurn(turnId, { focalPoints, status: "processing-focal-points" });
        setState((prev) => ({ ...prev, status: "processing-focal-points" }));

        // Phase 2: For each focal point — generate todos + short summary
        for (const fp of focalPoints) {
          if (abortRef.current) return;
          updateFocalPointInTurn(turnId, fp.id, { status: "running" });

          try {
            // Generate todos
            const todoTexts = await apiGenerateTodos(fp.text, prompt);
            const todos: TodoItem[] = todoTexts.map((text) => ({
              id: nextId("todo"),
              focalPointId: fp.id,
              text,
              status: "complete" as const,
              response: null,
              confidence: 0,
              confidenceReasoning: "",
              retryCount: 0,
            }));

            updateFocalPointInTurn(turnId, fp.id, { todos });
            await delay(REQUEST_DELAY_MS);

            // Get a short summary instead of deep execution
            const summary = await apiMediumSummary(prompt, fp.text, todoTexts);
            updateFocalPointInTurn(turnId, fp.id, {
              status: "complete",
              response: summary,
              confidence: 75, // Medium mode skips confidence scoring
              confidenceReasoning: "Medium mode — summary only",
            });

            await delay(REQUEST_DELAY_MS);
          } catch (err) {
            updateFocalPointInTurn(turnId, fp.id, {
              status: "failed",
              response: err instanceof Error ? err.message : "Failed",
              confidence: 0,
              confidenceReasoning: "Request failed",
            });
          }
        }

        if (abortRef.current) return;

        // Phase 3: Quick synthesis
        setState((prev) => ({ ...prev, status: "synthesizing" }));
        updateTurn(turnId, { status: "synthesizing" });

        // Read latest turn state
        let latestFPs: FocalPoint[] = [];
        setState((prev) => {
          const turn = prev.turns.find((t) => t.id === turnId);
          if (turn) latestFPs = turn.focalPoints;
          return prev;
        });

        const analyses = latestFPs
          .filter((fp) => fp.response)
          .map((fp) => ({
            focalPoint: fp.text,
            analysis: fp.response!,
            todos: fp.todos.map((t) => ({ text: t.text, result: "" })),
          }));

        const synthesis = await apiSynthesize(prompt, analyses);
        updateTurn(turnId, { status: "complete", finalOutput: synthesis });
        setState((prev) => ({ ...prev, status: "complete" }));
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Pipeline failed";
        updateTurn(turnId, { status: "error", error: msg });
        setState((prev) => ({ ...prev, status: "error" }));
      }
    },
    [updateTurn, updateFocalPointInTurn]
  );

  /* ═══════════════ DEEP MODE (original) ═══════════════ */
  const runDeep = useCallback(
    async (turnId: string, prompt: string) => {
      setState((prev) => ({ ...prev, status: "decomposing" }));
      updateTurn(turnId, { status: "decomposing" });

      try {
        // Phase 1: Decompose
        const fpTexts = await apiDecompose(prompt);
        const focalPoints: FocalPoint[] = fpTexts.map((text) => ({
          id: nextId("fp"),
          text,
          status: "pending" as const,
          response: null,
          confidence: 0,
          confidenceReasoning: "",
          retryCount: 0,
          todos: [],
        }));

        updateTurn(turnId, { focalPoints, status: "processing-focal-points" });
        setState((prev) => ({ ...prev, status: "processing-focal-points" }));

        // Phase 2: Execute focal points with confidence/retry
        for (const fp of focalPoints) {
          if (abortRef.current) return;
          await executeFocalPointWithRetry(turnId, prompt, fp);
          await delay(REQUEST_DELAY_MS);
        }

        if (abortRef.current) return;

        // Phase 3: Generate and execute todos
        setState((prev) => ({ ...prev, status: "processing-todos" }));
        updateTurn(turnId, { status: "processing-todos" });

        let latestFPs: FocalPoint[] = [];
        setState((prev) => {
          const turn = prev.turns.find((t) => t.id === turnId);
          if (turn) latestFPs = turn.focalPoints;
          return prev;
        });

        for (const fp of latestFPs) {
          if (abortRef.current) return;
          if (!fp.response || fp.status === "failed") continue;

          try {
            const todoTexts = await apiGenerateTodos(fp.text, fp.response);
            const todos: TodoItem[] = todoTexts.map((text) => ({
              id: nextId("todo"),
              focalPointId: fp.id,
              text,
              status: "pending" as const,
              response: null,
              confidence: 0,
              confidenceReasoning: "",
              retryCount: 0,
            }));

            updateFocalPointInTurn(turnId, fp.id, { todos });
            await delay(REQUEST_DELAY_MS);

            for (const todo of todos) {
              if (abortRef.current) return;
              await executeTodoWithRetry(turnId, prompt, fp, todo);
              await delay(REQUEST_DELAY_MS);
            }
          } catch (err) {
            console.error(`Failed to generate todos for ${fp.id}:`, err);
          }
        }

        if (abortRef.current) return;

        // Phase 4: Synthesize
        setState((prev) => ({ ...prev, status: "synthesizing" }));
        updateTurn(turnId, { status: "synthesizing" });

        let finalFPs: FocalPoint[] = [];
        setState((prev) => {
          const turn = prev.turns.find((t) => t.id === turnId);
          if (turn) finalFPs = turn.focalPoints;
          return prev;
        });

        const analyses = finalFPs
          .filter((fp) => fp.response)
          .map((fp) => ({
            focalPoint: fp.text,
            analysis: fp.response!,
            todos: fp.todos
              .filter((t) => t.response)
              .map((t) => ({ text: t.text, result: t.response! })),
          }));

        const synthesis = await apiSynthesize(prompt, analyses);
        updateTurn(turnId, { status: "complete", finalOutput: synthesis });
        setState((prev) => ({ ...prev, status: "complete" }));
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Pipeline failed";
        updateTurn(turnId, { status: "error", error: msg });
        setState((prev) => ({ ...prev, status: "error" }));
      }
    },
    [updateTurn, updateFocalPointInTurn, executeFocalPointWithRetry, executeTodoWithRetry]
  );

  /* ═══════════════ Main entry point ═══════════════ */
  const runPipeline = useCallback(
    async (prompt: string) => {
      abortRef.current = false;

      const turnId = nextId("turn");
      const mode = state.mode;

      const newTurn: ConversationTurn = {
        id: turnId,
        mode,
        prompt,
        status: "idle",
        focalPoints: [],
        finalOutput: null,
        error: null,
      };

      setState((prev) => ({
        ...prev,
        status: "idle",
        turns: [...prev.turns, newTurn],
        activeTurnIndex: prev.turns.length,
      }));

      const history = buildHistory(state.turns);

      switch (mode) {
        case "fast":
          await runFast(turnId, prompt, history);
          break;
        case "medium":
          await runMedium(turnId, prompt);
          break;
        case "deep":
          await runDeep(turnId, prompt);
          break;
      }

      setState((prev) => ({ ...prev, activeTurnIndex: -1 }));
    },
    [state.mode, state.turns, runFast, runMedium, runDeep]
  );

  /* ───── Set thinking mode ───── */
  const setMode = useCallback((mode: ThinkingMode) => {
    setState((prev) => ({ ...prev, mode }));
  }, []);

  /* ───── Abort ───── */
  const abort = useCallback(() => {
    abortRef.current = true;
    setState((prev) => ({ ...prev, status: "error" }));
  }, []);

  /* ───── Reset (clear conversation) ───── */
  const reset = useCallback(() => {
    abortRef.current = true;
    idCounter = 0;
    setState(INITIAL_PIPELINE_STATE);
  }, []);

  return { state, runPipeline, setMode, abort, reset };
}
