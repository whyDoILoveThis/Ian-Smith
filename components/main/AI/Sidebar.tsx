"use client";

import React from "react";
import ItsDropdown from "@/components/ui/its-dropdown";
import SettingsIcon from "@/components/sub/SettingsIcon";
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
    <div className="hidden md:flex w-56 border-r dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-2 flex-col">
      <div className="flex w-full justify-between items-center mb-4">
        <button
          className="btn btn-squish btn-sm"
          onClick={() => setShow(false)}
        >
          Close
        </button>
        <ItsDropdown
          closeWhenItemClick
          trigger={
            <button className="btn btn-squish">
              <SettingsIcon />
            </button>
          }
        >
          <button
            className="btn btn-ghost !w-full"
            onClick={() => setEditMode(!editMode)}
          >
            {!editMode ? "Edit" : "Stop Edit"}
          </button>
        </ItsDropdown>
      </div>

      <button
        onClick={handleNewConversation}
        className="mb-2 px-3 py-2 bg-blue-500 text-white rounded-lg"
      >
        ➕ New Chat
      </button>

      <div className="flex-1 overflow-y-auto space-y-1">
        {conversations.map((c) => (
          <div
            key={c.id}
            className={`flex justify-between items-center px-2 py-1 rounded cursor-pointer ${
              c.id === activeId
                ? "bg-blue-100 dark:bg-blue-500/30"
                : "hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
            onClick={() => setActiveId(c.id)}
          >
            <span className="truncate">{c.title}</span>
            {editMode && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteConversation(c.id);
                }}
                className="text-red-500 hover:text-red-700"
              >
                ✖
              </button>
            )}
          </div>
        ))}
      </div>

      {editMode && (
        <button
          onClick={handleClearAll}
          className="btn btn-red btn-squish place-self-end btn-sm mt-2"
        >
          🗑️ Clear All
        </button>
      )}
    </div>
  );
};
