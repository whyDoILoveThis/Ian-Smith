"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import { Conversation } from "./types";

interface ChatAreaProps {
  activeConversation: Conversation | undefined;
  input: string;
  setInput: (val: string) => void;
  handleSend: (e: React.FormEvent) => void;
  loading: boolean;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  activeConversation,
  input,
  setInput,
  handleSend,
  loading,
}) => {
  return (
    <div className="flex flex-col overflow-y-auto flex-1">
      <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-thumb-rounded-lg">
        {activeConversation?.messages.length === 0 && (
          <div className="p-6 text-center text-gray-600 dark:text-gray-300">
            <h2 className="text-xl font-bold mb-2">
              👋 Welcome to Ian’s PortfolioBot
            </h2>
            <p className="mb-4">
              This assistant knows about my skills, projects, and experience.
              Ask me anything!
            </p>
            <p className="italic text-sm">
              (All conversations are saved automatically.)
            </p>
          </div>
        )}

        {activeConversation?.messages.map((msg, idx) => (
          <div
            key={idx}
            className={`max-w-xs px-3 py-2 rounded-3xl break-words ${
              msg.role === "user"
                ? "bg-blue-500 text-white self-end ml-auto rounded-br-none"
                : "bg-gray-200 text-black self-start dark:bg-gray-800 dark:text-white rounded-bl-none"
            }`}
          >
            <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
              {msg.content}
            </ReactMarkdown>
          </div>
        ))}

        {loading && (
          <div className="bg-gray-200 text-black max-w-xs px-3 py-2 rounded-lg self-start animate-pulse dark:bg-gray-800 dark:text-white">
            typing...
          </div>
        )}
      </div>

      <form
        onSubmit={handleSend}
        className="flex border-t p-2 bg-gray-50 dark:bg-gray-800 transition-colors"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Ian about his projects..."
          className="flex-1 border rounded-lg px-3 py-2 mr-2 focus:outline-none dark:bg-gray-700 dark:text-white dark:border-gray-600"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
};
