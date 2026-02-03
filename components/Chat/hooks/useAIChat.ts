"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SECRET_PHRASE } from "../constants";
import type { AIMessage } from "../types";

export function useAIChat(
  combo: [number, number, number, number] | null,
  setShowRealChat: (show: boolean) => void,
) {
  const [aiMessages, setAiMessages] = useState<AIMessage[]>([]);
  const [aiInput, setAiInput] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const aiBottomRef = useRef<HTMLDivElement>(null);

  // Scroll AI chat to bottom
  useEffect(() => {
    aiBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [aiMessages]);

  // Build the secret passphrase from the current combo
  const getSecretPassphrase = useCallback(() => {
    if (!combo) return null;
    return combo.join("-") + SECRET_PHRASE;
  }, [combo]);

  // Handle AI chat send
  const handleAiSend = useCallback(async () => {
    const input = aiInput.trim();
    if (!input || isAiLoading) return;

    // Check if this is the secret phrase
    const secret = getSecretPassphrase();
    if (secret && input === secret) {
      setAiInput("");
      setShowRealChat(true);
      return;
    }

    // Otherwise, send to AI
    setAiInput("");
    const userMsg: AIMessage = { role: "user", content: input };
    setAiMessages((prev) => [...prev, userMsg]);
    setIsAiLoading(true);

    try {
      const response = await fetch("/api/its-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userMessages: [...aiMessages, userMsg],
        }),
      });

      const data = await response.json();
      const assistantContent =
        data.reply || data.error || "Sorry, I couldn't process that.";
      setAiMessages((prev) => [
        ...prev,
        { role: "assistant", content: assistantContent },
      ]);
    } catch {
      setAiMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Something went wrong. Try again." },
      ]);
    } finally {
      setIsAiLoading(false);
    }
  }, [aiInput, aiMessages, getSecretPassphrase, isAiLoading, setShowRealChat]);

  return {
    aiMessages,
    aiInput,
    setAiInput,
    isAiLoading,
    aiBottomRef,
    handleAiSend,
  };
}
