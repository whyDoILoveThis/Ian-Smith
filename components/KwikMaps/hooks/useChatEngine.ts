"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import type {
  Action,
  ChatMessage,
  RouteSnapshot,
  RouteState,
} from "../types/chat.types";
import { detectIntent } from "./useIntentDetection";
import { validateAIResponse } from "./useValidation";
import { executeActions } from "./useExecutionEngine";

interface UseChatEngineOpts {
  getRouteState: () => RouteState;
  applyRouteState: (state: RouteState) => void;
  chatMessages: ChatMessage[];
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}

export function useChatEngine({
  getRouteState,
  applyRouteState,
  chatMessages,
  setChatMessages,
}: UseChatEngineOpts) {
  const [chatInput, setChatInput] = useState("");
  const [isSendingChat, setIsSendingChat] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const pendingResendRef = useRef<string | null>(null);
  const pendingResendSnapshotRef = useRef<RouteSnapshot | null>(null);
  const lastChatRequestTimeRef = useRef<number>(0);
  const chatDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (chatDebounceTimerRef.current) clearTimeout(chatDebounceTimerRef.current);
    };
  }, []);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Auto-send on resend
  useEffect(() => {
    if (
      pendingResendRef.current &&
      chatInput === pendingResendRef.current &&
      !isSendingChat
    ) {
      pendingResendRef.current = null;
      handleSendChat();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatInput]);

  const handleResendMessage = useCallback(
    (messageId: string) => {
      const msg = chatMessages.find((m) => m.id === messageId);
      if (!msg || msg.role !== "user") return;

      const idx = chatMessages.findIndex((m) => m.id === messageId);
      let savedSnapshot: RouteSnapshot | undefined;
      const toRemove = new Set([messageId]);

      if (idx + 1 < chatMessages.length && chatMessages[idx + 1].role === "assistant") {
        const aiMsg = chatMessages[idx + 1];
        if (aiMsg.routeChanged && aiMsg.newRoute && !aiMsg.undone) {
          savedSnapshot = aiMsg.newRoute;
        }
        if (aiMsg.routeChanged && aiMsg.previousRoute && !aiMsg.undone) {
          applyRouteState(aiMsg.previousRoute);
        }
        toRemove.add(aiMsg.id);
      }

      setChatMessages((prev) => prev.filter((m) => !toRemove.has(m.id)));
      setChatInput(msg.content);
      pendingResendRef.current = msg.content;
      pendingResendSnapshotRef.current = savedSnapshot ?? null;
    },
    [chatMessages, setChatMessages, applyRouteState],
  );

  /**
   * Apply validated actions against current state, record snapshots for undo/redo.
   */
  const applyActions = useCallback(
    (
      actions: Action[],
      message: string,
      geocoded?: Map<string, { latitude: number; longitude: number }>,
    ) => {
      const prevState = getRouteState();
      const previousSnapshot: RouteSnapshot = {
        optimizedRoute: prevState.optimizedRoute,
        legs: prevState.legs,
        totalDistanceMiles: prevState.totalDistanceMiles,
        totalDistanceKm: prevState.totalDistanceKm,
        coordinates: [...prevState.coordinates],
      };

      const result = executeActions(actions, prevState, geocoded);

      const assistantMessage: ChatMessage = {
        id: uuidv4(),
        role: "assistant",
        content: message,
        routeChanged: result.routeChanged,
      };

      if (result.routeChanged) {
        const newSnapshot: RouteSnapshot = {
          optimizedRoute: result.newState.optimizedRoute,
          legs: result.newState.legs,
          totalDistanceMiles: result.newState.totalDistanceMiles,
          totalDistanceKm: result.newState.totalDistanceKm,
          coordinates: [...result.newState.coordinates],
        };

        assistantMessage.previousRoute = previousSnapshot;
        assistantMessage.newRoute = newSnapshot;

        applyRouteState(result.newState);
      }

      setChatMessages((prev) => [...prev, assistantMessage]);
    },
    [getRouteState, applyRouteState, setChatMessages],
  );

  const handleSendChat = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const msg = chatInput.trim();
    if (!msg || isSendingChat) return;

    if (chatDebounceTimerRef.current) {
      clearTimeout(chatDebounceTimerRef.current);
    }

    const routeState = getRouteState();
    const stopCount = (routeState.optimizedRoute ?? routeState.coordinates).length;
    const hasRoute = routeState.optimizedRoute !== null && routeState.optimizedRoute.length > 0;

    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: "user",
      content: msg,
      ...(pendingResendSnapshotRef.current && {
        resent: true,
        originalSnapshot: pendingResendSnapshotRef.current,
      }),
    };
    pendingResendSnapshotRef.current = null;
    setChatMessages((prev) => [...prev, userMessage]);
    setChatInput("");

    // ── Step 1: Local intent detection ──
    const localIntent = detectIntent(msg, stopCount, hasRoute);

    if (localIntent) {
      if (localIntent.type === "CLEAR_ROUTE") {
        // Special case: clear handled upstream
        const clearMsg: ChatMessage = {
          id: uuidv4(),
          role: "assistant",
          content: localIntent.message,
        };
        setChatMessages((prev) => [...prev, clearMsg]);
        return;
      }

      // Execute locally — no AI call needed
      applyActions(localIntent.actions, localIntent.message);
      return;
    }

    // ── Step 2: AI required — debounce + throttle ──
    chatDebounceTimerRef.current = setTimeout(async () => {
      setIsSendingChat(true);

      try {
        const now = Date.now();
        const elapsed = now - lastChatRequestTimeRef.current;
        if (elapsed < 500) {
          await new Promise((r) => setTimeout(r, 500 - elapsed));
        }
        lastChatRequestTimeRef.current = Date.now();

        // Build minimal stop data (name + index only — no lat/lng)
        const activeRoute = routeState.optimizedRoute ?? routeState.coordinates;
        const stops = activeRoute.map((c, i) => ({
          index: i + 1,
          name: c.name,
        }));

        // Limit history to last 5 messages
        const conversationHistory = chatMessages
          .slice(-5)
          .map((m) => ({ role: m.role, content: m.content }));

        const response = await fetch("/api/kwikmaps-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: msg,
            stops,
            hasRoute,
            conversationHistory,
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => null);
          throw new Error(errData?.error || "Failed to get AI response");
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || "Something went wrong");
        }

        // ── Step 3: Validate JSON ──
        const validationResult = validateAIResponse({
          actions: data.actions,
          message: data.message,
        });

        if (!validationResult.ok) {
          console.warn("[KwikMaps] AI response validation failed:", validationResult.error);
          const fallbackMsg: ChatMessage = {
            id: uuidv4(),
            role: "assistant",
            content: validationResult.fallbackMessage,
          };
          setChatMessages((prev) => [...prev, fallbackMsg]);
          return;
        }

        // ── Step 4: Build geocoded map from server response ──
        const geocoded = new Map<string, { latitude: number; longitude: number }>();
        if (data.geocoded && Array.isArray(data.geocoded)) {
          for (const loc of data.geocoded) {
            if (loc.name && typeof loc.latitude === "number" && typeof loc.longitude === "number") {
              geocoded.set(loc.name, { latitude: loc.latitude, longitude: loc.longitude });
            }
          }
        }

        // ── Step 5: Execute actions deterministically ──
        applyActions(validationResult.data.actions, validationResult.data.message, geocoded);
      } catch (err) {
        const errorMessage: ChatMessage = {
          id: uuidv4(),
          role: "assistant",
          content:
            err instanceof Error && err.message !== "Failed to get AI response"
              ? err.message
              : "Failed to reach AI. Please try again.",
        };
        setChatMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsSendingChat(false);
        chatInputRef.current?.focus();
      }
    }, 300);
  };

  return {
    chatInput,
    setChatInput,
    isSendingChat,
    chatEndRef,
    chatInputRef,
    handleSendChat,
    handleResendMessage,
  };
}
