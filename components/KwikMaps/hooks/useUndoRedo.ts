"use client";

import { useState, useCallback } from "react";
import type { ChatMessage, RouteSnapshot } from "../types/chat.types";

export function useUndoRedo(
  applyRouteState: (state: RouteSnapshot) => void,
) {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const handleUndoRouteChange = useCallback(
    (messageId: string) => {
      const msg = chatMessages.find((m) => m.id === messageId);
      if (!msg?.previousRoute) return;
      applyRouteState(msg.previousRoute);
      setChatMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, undone: true } : m)),
      );
    },
    [chatMessages, applyRouteState],
  );

  const handleRedoRouteChange = useCallback(
    (messageId: string) => {
      const msg = chatMessages.find((m) => m.id === messageId);
      if (!msg?.newRoute) return;
      applyRouteState(msg.newRoute);
      setChatMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, undone: false } : m)),
      );
    },
    [chatMessages, applyRouteState],
  );

  const handleDeleteMessage = useCallback(
    (messageId: string) => {
      const msg = chatMessages.find((m) => m.id === messageId);
      if (
        msg?.role === "assistant" &&
        msg.routeChanged &&
        msg.previousRoute &&
        !msg.undone
      ) {
        applyRouteState(msg.previousRoute);
      }
      setChatMessages((prev) => prev.filter((m) => m.id !== messageId));
    },
    [chatMessages, applyRouteState],
  );

  const handleRestoreOriginal = useCallback(
    (messageId: string) => {
      const msg = chatMessages.find((m) => m.id === messageId);
      if (!msg?.originalSnapshot) return;
      applyRouteState(msg.originalSnapshot);
      setChatMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, resent: false } : m)),
      );
    },
    [chatMessages, applyRouteState],
  );

  return {
    chatMessages,
    setChatMessages,
    handleUndoRouteChange,
    handleRedoRouteChange,
    handleDeleteMessage,
    handleRestoreOriginal,
  };
}
