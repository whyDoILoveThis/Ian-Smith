"use client";

import React from "react";
import type { AIMessage } from "../types";

type AIChatDisguiseProps = {
  aiMessages: AIMessage[];
  aiInput: string;
  setAiInput: (input: string) => void;
  isAiLoading: boolean;
  aiBottomRef: React.RefObject<HTMLDivElement>;
  handleAiSend: () => void;
  onOpenLockBox: () => void;
};

export function AIChatDisguise({
  aiMessages,
  aiInput,
  setAiInput,
  isAiLoading,
  aiBottomRef,
  handleAiSend,
  onOpenLockBox,
}: AIChatDisguiseProps) {
  return (
    <div className="fixed inset-0 flex flex-col bg-gradient-to-br from-neutral-950 via-neutral-900 to-black overflow-hidden">
      <div className="flex-1 flex flex-col justify-center items-center px-2 pb-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-white">
            Ian
            <span onClick={onOpenLockBox}>&apos;</span>s AI Assistant{" "}
            <span className="text-sm">v0.9</span>
          </h1>
          <p className="mt-2 text-neutral-400">
            Ask me anything about web development, my projects, or how I can
            help.
          </p>
        </div>
        <div className="w-full max-w-3xl flex flex-col justify-center items-center">
          <div className="flex min-h-[520px] flex-col rounded-3xl border border-white/10 bg-white/5 backdrop-blur w-full">
            <div className="border-b border-white/10 px-6 py-4">
              <h2 className="text-lg font-semibold text-white">Chat with AI</h2>
              <p className="text-xs text-neutral-400">
                Powered by Groq • Ask me anything
              </p>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto max-h-[60vh] px-3 sm:px-6 py-6">
              {aiMessages.length === 0 && (
                <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-6 text-center text-sm text-neutral-400">
                  Start a conversation. Ask about my skills, projects, or how I
                  can help with yours.
                </div>
              )}
              {aiMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-lg ${
                      msg.role === "user"
                        ? "bg-emerald-400/90 text-black"
                        : "bg-white/10 text-white"
                    }`}
                  >
                    <p className="text-[11px] uppercase tracking-wide opacity-70">
                      {msg.role === "user" ? "You" : "Ian AI"}
                    </p>
                    <p className="mt-1 whitespace-pre-line">{msg.content}</p>
                  </div>
                </div>
              ))}
              {isAiLoading && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-2xl bg-white/10 px-4 py-3 text-sm text-white shadow-lg">
                    <p className="text-[11px] uppercase tracking-wide opacity-70">
                      Ian AI
                    </p>
                    <p className="mt-1 animate-pulse">Thinking...</p>
                  </div>
                </div>
              )}
              <div ref={aiBottomRef} />
            </div>
            <div className="border-t border-white/10 px-6 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <input
                  type="text"
                  placeholder="Ask me anything..."
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleAiSend();
                    }
                  }}
                  disabled={isAiLoading}
                  className="flex-1 rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 disabled:opacity-50"
                />
                {/* Clipboard button */}
                <button
                  type="button"
                  className="flex-shrink-0 rounded-full border border-white/10 p-3 ml-2 text-white transition hover:bg-white/10"
                  title="Paste from clipboard"
                  disabled={isAiLoading}
                  onClick={async () => {
                    try {
                      const text = await navigator.clipboard.readText();
                      if (text) setAiInput(text);
                    } catch {
                      // ignore
                    }
                  }}
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m4 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2h2m2 0h4"
                    />
                  </svg>
                </button>
                <button
                  onClick={handleAiSend}
                  disabled={isAiLoading || !aiInput.trim()}
                  className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isAiLoading ? "..." : "Send"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
