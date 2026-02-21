"use client";

import React, { useRef, useEffect } from "react";
import { Conversation } from "./types";

interface MobileSidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  setActiveId: (id: string) => void;
  editMode: boolean;
  setEditMode: (edit: boolean) => void;
  handleNewConversation: () => void;
  handleDeleteConversation: (id: string) => void;
  handleClearAll: () => void;
  setShow: (show: boolean) => void;
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
}

export const MobileSidebar: React.FC<MobileSidebarProps> = ({
  conversations,
  activeId,
  setActiveId,
  editMode,
  setEditMode,
  handleNewConversation,
  handleDeleteConversation,
  handleClearAll,
  setShow,
  menuOpen,
  setMenuOpen,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close when clicking outside
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen, setMenuOpen]);

  return (
    <div className="md:hidden glass-panel border-b border-white/[0.06] px-4 py-3 flex items-center justify-between gap-2 relative z-[1010]">
      {/* Toggle trigger */}
      <button
        ref={triggerRef}
        onClick={() => setMenuOpen(!menuOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-white/70 hover:text-white/90 bg-white/[0.06] hover:bg-white/[0.1] transition-all"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-4 h-4"
        >
          <path
            fillRule="evenodd"
            d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 10.5a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5a.75.75 0 01-.75-.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10z"
            clipRule="evenodd"
          />
        </svg>
        Chats
      </button>

      {/* Close chatbot button */}
      <button
        className="w-8 h-8 rounded-lg flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-all flex-shrink-0"
        onClick={() => setShow(false)}
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

      {/* Dropdown panel */}
      {menuOpen && (
        <div
          ref={panelRef}
          className="absolute top-full left-4 w-full max-w-[200px] mt-2 p-3 rounded-xl bg-[#151525]/95 backdrop-blur-2xl border border-white/10 shadow-xl z-[1010] max-h-[70vh] flex flex-col"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] text-white/30 tracking-widest uppercase font-medium">
              Conversations
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

          <button
            onClick={handleNewConversation}
            className="glow-btn w-full mb-3 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500/80 to-indigo-500/80 text-white text-sm font-medium"
          >
            <span className="relative z-10">+ New Chat</span>
          </button>

          <div className="space-y-0.5 flex-1 min-h-0 overflow-y-auto chat-scroll">
            {conversations.map((c) => (
              <div
                key={c.id}
                className={`conv-item flex justify-between items-center px-3 py-2.5 cursor-pointer group ${
                  c.id === activeId ? "conv-item-active" : ""
                }`}
                onClick={() => {
                  setActiveId(c.id);
                  setMenuOpen(false);
                }}
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
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="w-3.5 h-3.5"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.519.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>

          {editMode && (
            <button
              onClick={handleClearAll}
              className="mt-3 w-full px-3 py-2 rounded-xl text-red-400/70 hover:text-red-400 text-xs bg-red-500/[0.06] hover:bg-red-500/[0.12] transition-all"
            >
              Clear All
            </button>
          )}
        </div>
      )}
    </div>
  );
};
