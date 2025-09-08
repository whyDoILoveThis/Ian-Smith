"use client";

import React, { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import ItsThreeDots from "../sub/ItsThreeDots";

import {
  fbGetAllUserSessions, // 🔹 new: fetch all user docs with summaries
  fbGetUserSessionsById, // 🔹 new: fetch full sessions for one user
  fbDeleteUserSessionByConversationId, // 🔹 new: delete a single conversation inside a user doc
  SessionFull,
  UserSummary,
} from "@/firebase/fbGetConversationsSessionsGrouped";

export default function AiConversationsCMS() {
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [errorUsers, setErrorUsers] = useState<string | null>(null);

  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [activeUserSessions, setActiveUserSessions] =
    useState<SessionFull | null>(null);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [expandedConvId, setExpandedConvId] = useState<string | null>(null);

  // 🔹 Fetch all user docs
  const loadUsers = async () => {
    setLoadingUsers(true);
    setErrorUsers(null);
    try {
      const res = await fbGetAllUserSessions();
      setUsers(res);
      if (res.length > 0) setActiveUserId(res[0].id);
      else setActiveUserId(null);
    } catch (err: any) {
      setErrorUsers(String(err?.message || err));
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // 🔹 Load sessions for selected user
  useEffect(() => {
    if (!activeUserId) {
      setActiveUserSessions(null);
      return;
    }
    let mounted = true;
    const loadOne = async () => {
      setLoadingSessions(true);
      setSessionError(null);
      try {
        const sessions = await fbGetUserSessionsById(activeUserId);
        if (!mounted) return;
        setActiveUserSessions(sessions);
      } catch (err: any) {
        if (mounted) setSessionError(String(err?.message || err));
      } finally {
        if (mounted) setLoadingSessions(false);
      }
    };
    loadOne();
    return () => {
      mounted = false;
    };
  }, [activeUserId]);

  // 🔹 Delete conversation from user doc
  const handleDeleteConversation = async (conversationId: string) => {
    if (!activeUserId) return;
    const confirmed = window.confirm("Delete this conversation?");
    if (!confirmed) return;

    try {
      await fbDeleteUserSessionByConversationId(activeUserId, conversationId);
      const sessions = await fbGetUserSessionsById(activeUserId);
      setActiveUserSessions(sessions);
    } catch (err: any) {
      alert("Failed to delete conversation: " + String(err?.message || err));
    }
  };

  return (
    <div className="w-full flex flex-col md:flex-row gap-4 max-w-5xl p-4">
      {/* Left: users list */}
      <aside className="w-full md:w-72 border rounded-lg p-2 bg-white dark:bg-gray-800">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">Users</h3>
          <button
            onClick={loadUsers}
            className="text-xs text-blue-600 hover:underline"
          >
            Refresh
          </button>
        </div>

        {loadingUsers && (
          <div className="text-xs text-gray-500">Loading...</div>
        )}
        {errorUsers && <div className="text-xs text-red-500">{errorUsers}</div>}

        <div className="flex flex-col gap-1 max-h-[60vh] overflow-y-auto">
          {users.length === 0 && !loadingUsers && (
            <div className="text-xs text-gray-500">No users found.</div>
          )}

          {users.map((u) => (
            <div
              key={u.id}
              className={`flex items-center justify-between px-3 py-2 rounded-md cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition ${
                u.id === activeUserId ? "bg-blue-50 dark:bg-blue-900/40" : ""
              }`}
            >
              <button
                onClick={() => setActiveUserId(u.id)}
                className="text-left flex-1 truncate"
              >
                <div className="text-sm font-medium truncate">{u.id}</div>
                <div className="text-xs text-gray-500">
                  {u.sessionCount ?? 0} conversations
                </div>
              </button>
            </div>
          ))}
        </div>
      </aside>

      {/* Right: user's conversations */}
      <main className="flex-1 border rounded-lg p-4 bg-white dark:bg-gray-900 min-h-[300px]">
        {loadingSessions && (
          <div className="text-sm text-gray-500">
            Loading sessions{<ItsThreeDots />}
          </div>
        )}
        {sessionError && (
          <div className="text-sm text-red-500">{sessionError}</div>
        )}

        {!activeUserSessions && !loadingSessions && (
          <div className="text-sm text-gray-500">
            Select a user to view sessions.
          </div>
        )}

        {activeUserSessions && !loadingSessions && (
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
            {activeUserSessions.sessions.length === 0 && (
              <div className="text-sm text-gray-500">No conversations.</div>
            )}

            {activeUserSessions.sessions.map((conv) => {
              const isOpen = expandedConvId === conv.id;

              return (
                <div
                  key={conv.id}
                  className="border rounded-lg bg-gray-50 dark:bg-gray-800 overflow-hidden transition-all duration-300"
                >
                  {/* Header */}
                  <div
                    className="flex justify-between items-center px-3 py-2 cursor-pointer bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                    onClick={() => setExpandedConvId(isOpen ? null : conv.id)}
                  >
                    <div>
                      <div className="text-sm font-medium">{conv.title}</div>
                      <div className="text-xs text-gray-400">
                        {conv.messages?.length ?? 0} messages
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteConversation(conv.id);
                        }}
                        className="text-red-500 hover:text-red-700 text-xs"
                      >
                        ✖
                      </button>
                      <button className="text-xs text-blue-500 hover:text-blue-700">
                        {isOpen ? "▲ Hide" : "▼ Expand"}
                      </button>
                    </div>
                  </div>

                  {/* Collapsible content */}
                  <div
                    className={`transition-all duration-500 ease-in-out ${
                      isOpen
                        ? "max-h-[600px] opacity-100 p-3"
                        : "max-h-0 opacity-0"
                    } overflow-hidden`}
                  >
                    <div className="flex flex-col gap-2">
                      {conv.messages.map((m, i) => (
                        <div
                          key={i}
                          className={`flex ${
                            m.role === "user" ? "justify-end" : "justify-start"
                          }`}
                        >
                          <div
                            className={`max-w-xs px-4 py-2 rounded-2xl shadow text-sm ${
                              m.role === "user"
                                ? "bg-blue-500 text-white rounded-br-none"
                                : "bg-gray-200 dark:bg-gray-600 text-black dark:text-white rounded-bl-none"
                            }`}
                          >
                            <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
                              {m.content}
                            </ReactMarkdown>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
