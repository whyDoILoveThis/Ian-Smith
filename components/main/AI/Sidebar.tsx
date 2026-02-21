"use client";

import React from "react";
import { Conversation } from "./types";

interface SidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  setActiveId: (id: string) => void;
  editMode: boolean;
  setEditMode: (edit: boolean) => void;
  handleNewConversation: () => void;
  handleDeleteConversation: (id: string) => void;
  handleClearAll: () => void;
  setShow: (show: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  activeId,
  setActiveId,
  editMode,
  setEditMode,
  handleNewConversation,
  handleDeleteConversation,
  handleClearAll,
  setShow,
}) => {
  return (
    <div className="hidden md:flex w-64 flex-col glass-panel rounded-l-2xl min-h-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/[0.06]">
        <span className="text-[11px] text-white/30 tracking-widest uppercase font-medium">
          Chats
        </span>
        <button
          onClick={() => setEditMode(!editMode)}
          className={`text-xs px-2.5 py-1 rounded-lg transition-all ${
            editMode
              ? "bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30"
              : "text-white/40 hover:text-white/70 hover:bg-white/[0.06]"
          }`}
        >
          {editMode ? "Done" : "Edit"}
        </button>
      </div>

      {/* New Chat button */}
      <div className="px-3 pt-3 pb-2">
        <button
          onClick={handleNewConversation}
          className="glow-btn w-full px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500/80 to-indigo-500/80 text-white text-sm font-medium transition-transform active:scale-[0.97]"
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-4 h-4"
            >
              <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
            </svg>
            New Chat
          </span>
        </button>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto chat-scroll px-2 py-1 space-y-0.5">
        {conversations.map((c) => (
          <div
            key={c.id}
            className={`conv-item flex justify-between items-center px-3 py-2.5 cursor-pointer group ${
              c.id === activeId ? "conv-item-active" : ""
            }`}
            onClick={() => setActiveId(c.id)}
          >
            <span className="truncate text-sm text-white/70 group-hover:text-white/90 transition-colors">
              {c.title}
            </span>
            {editMode && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteConversation(c.id);
                }}
                className="text-red-400/60 hover:text-red-400 transition-colors flex-shrink-0 ml-2"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  className="w-3.5 h-3.5"
                >
                  <path
                    fillRule="evenodd"
                    d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5Z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Clear all (edit mode) */}
      {editMode && (
        <div className="px-3 pb-3 pt-2 border-t border-white/[0.06]">
          <button
            onClick={handleClearAll}
            className="w-full px-3 py-2 rounded-xl text-red-400/70 hover:text-red-400 text-xs bg-red-500/[0.06] hover:bg-red-500/[0.12] transition-all"
          >
            🗑️ Clear All
          </button>
        </div>
      )}
    </div>
  );
};
