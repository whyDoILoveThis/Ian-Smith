"use client";

import React from "react";
import ItsDropdown from "@/components/ui/its-dropdown";
import SettingsIcon from "@/components/sub/SettingsIcon";
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
}) => {
  return (
    <div className="md:hidden border-b dark:border-gray-700 bg-gray-100 dark:bg-gray-800 p-2 flex items-center justify-between">
      <ItsDropdown
        className="-translate-y-1"
        trigger={
          <button className="px-3 py-2 bg-blue-500 text-white rounded-lg">
            ☰ Chats
          </button>
        }
      >
        <ItsDropdown
          closeWhenItemClick
          trigger={
            <button className="btn btn-squish mb-4">
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

        <button
          onClick={handleNewConversation}
          className="w-full mb-2 px-3 py-2 bg-blue-500 text-white rounded-lg"
        >
          ➕ New Chat
        </button>

        {conversations.map((c) => (
          <div
            key={c.id}
            className={`flex justify-between items-center px-2 py-1 rounded cursor-pointer ${
              c.id === activeId
                ? "bg-blue-100 dark:bg-blue-800"
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

        {editMode && (
          <button
            onClick={handleClearAll}
            className="mt-4 btn btn-red btn-squish place-self-end btn-sm"
          >
            🗑️ Clear All
          </button>
        )}
      </ItsDropdown>

      <button
        className="btn btn-round -translate-y-1 !border-red-400 !border-opacity-60 dark:!border-opacity-50 !text-red-300 dark:!text-red-200 text-opacity-65 dark:text-opacity-100 z-50"
        onClick={() => setShow(false)}
      >
        ✖
      </button>
    </div>
  );
};
