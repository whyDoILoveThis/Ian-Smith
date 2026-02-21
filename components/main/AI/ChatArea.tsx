"use client";

import React, { useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import { Conversation } from "./types";

interface ChatAreaProps {
  activeConversation: Conversation | undefined;
  input: string;
  setInput: (val: string) => void;
  handleSend: (e: React.FormEvent) => void;
  loading: boolean;
  setShow: (show: boolean) => void;
  mobileMenuOpen?: boolean;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  activeConversation,
  input,
  setInput,
  handleSend,
  loading,
  setShow,
  mobileMenuOpen = false,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeConversation?.messages, loading]);

  return (
    <div className="flex flex-col flex-1 min-w-0 min-h-0 relative overflow-hidden">
      {/* Close button — hidden on mobile, only show on desktop */}
      {!mobileMenuOpen && (
        <button
          onClick={() => setShow(false)}
          className="hidden md:flex absolute top-4 right-6 z-10 w-8 h-8 rounded-lg items-center justify-center text-white/30 hover:text-white/70 hover:bg-white/[0.08] transition-all"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-4 h-4"
          >
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        </button>
      )}

      {/* Messages area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto chat-scroll px-4 py-6 md:px-8"
      >
        <div className="max-w-2xl mx-auto space-y-5">
          {activeConversation?.messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full min-h-[50vh] text-center">
              <div className="ambient-float">
                <div className="w-20 h-20 rounded-2xl glass-panel-strong flex items-center justify-center mb-6 mx-auto">
                  <span className="text-4xl">&#10022;</span>
                </div>
              </div>
              <h2 className="text-2xl md:text-3xl font-semibold text-white/90 mb-3 tracking-tight">
                Ian&apos;s PortfolioBot
              </h2>
              <p className="text-white/50 text-sm md:text-base max-w-sm leading-relaxed mb-2">
                Ask me about skills, projects, and experience.
              </p>
              <p className="text-white/30 text-xs">
                Conversations are saved automatically.
              </p>
            </div>
          )}

          {activeConversation?.messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex flex-col gap-1.5 msg-enter ${
                msg.role === "user" ? "items-end" : "items-start"
              }`}
            >
              <div
                className={`max-w-[85%] md:max-w-[75%] px-4 py-3 rounded-2xl break-words ${
                  msg.role === "user"
                    ? "msg-user text-white rounded-br-md"
                    : "msg-ai text-white/90 rounded-bl-md"
                }`}
              >
                <div className="prose prose-invert prose-sm max-w-none [&_pre]:bg-black/30 [&_pre]:rounded-lg [&_pre]:p-3 [&_code]:text-indigo-300 [&_p]:leading-relaxed [&_p]:my-1">
                  <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
                    {msg.content}
                  </ReactMarkdown>
                </div>
              </div>
              <span
                className={`text-[10px] text-white/25 px-1 ${
                  msg.role === "user" ? "text-right" : "text-left"
                }`}
              >
                {msg.timestamp && new Date(msg.timestamp).toLocaleTimeString()}
                {msg.timestamp && " \u00b7 "}
                {msg.timestamp && new Date(msg.timestamp).toLocaleDateString()}
              </span>
            </div>
          ))}

          {loading && (
            <div className="flex items-start msg-enter">
              <div className="msg-ai px-5 py-4 rounded-2xl rounded-bl-md flex items-center gap-1.5">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input bar — pinned to bottom */}
      <div className="flex-shrink-0 px-4 pb-4 pt-2 md:px-8 md:pb-6 bg-gradient-to-t from-[#0a0a14] via-[#0a0a14]/80 to-transparent">
        <form onSubmit={handleSend} className="max-w-2xl mx-auto">
          <div className="chat-input-bar flex items-center gap-3 rounded-2xl px-4 py-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Ian about his projects..."
              className="flex-1 bg-transparent text-white/90 placeholder-white/30 text-sm focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading}
              className="glow-btn flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-transform active:scale-90"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-4 h-4"
              >
                <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z" />
              </svg>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
