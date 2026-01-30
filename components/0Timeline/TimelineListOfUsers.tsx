"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import LoaderSpinSmall from "../sub/LoaderSpinSmall";

interface TimelineListOfUsersProps {
  users: TimelineUser[];
  loading: boolean;
  currentUserId?: string | null;
  onSelectUser: (user: TimelineUser) => void;
  onGoHome: () => void;
  onClose: () => void;
}

export default function TimelineListOfUsers({
  users,
  loading,
  currentUserId,
  onSelectUser,
  onGoHome,
  onClose,
}: TimelineListOfUsersProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Filter users based on search query
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const query = searchQuery.toLowerCase().trim();
    return users.filter(
      (user) =>
        user.displayName.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query),
    );
  }, [users, searchQuery]);

  // Get avatar initials
  const getInitials = (name: string) => {
    const parts = name.split(" ").filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Get avatar color based on name
  const getAvatarColor = (name: string) => {
    const colors = [
      "from-rose-500 to-pink-500",
      "from-orange-500 to-amber-500",
      "from-emerald-500 to-green-500",
      "from-cyan-500 to-blue-500",
      "from-violet-500 to-purple-500",
      "from-fuchsia-500 to-pink-500",
      "from-blue-500 to-indigo-500",
      "from-teal-500 to-cyan-500",
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div
      className="fixed inset-0 z-[1000010] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md max-h-[80vh] overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/95 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="text-xl">👥</span>
            <h2 className="text-lg font-semibold text-white">Browse Users</h2>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white transition-colors text-xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-4 pt-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2.5 pl-10 text-sm rounded-xl bg-neutral-800 border border-neutral-700 text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500 transition-colors"
              autoFocus
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-auto max-h-[50vh] p-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <LoaderSpinSmall color="cyan" />
            </div>
          ) : (
            <>
              {/* My Dashboard Button */}
              {currentUserId && (
                <button
                  onClick={() => {
                    onGoHome();
                    onClose();
                  }}
                  className="w-full mb-3 flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-cyan-600/20 to-blue-600/20 border border-cyan-500/30 hover:border-cyan-400/50 transition-all duration-200 group"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white text-lg shadow-lg shadow-cyan-500/20">
                    🏠
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-medium text-cyan-300 group-hover:text-cyan-200 transition-colors">
                      My Dashboard
                    </div>
                    <div className="text-xs text-neutral-400">
                      Return to your timelines
                    </div>
                  </div>
                  <svg
                    className="w-5 h-5 text-cyan-400 group-hover:translate-x-1 transition-transform"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              )}

              {/* Divider */}
              {currentUserId && filteredUsers.length > 0 && (
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex-1 h-px bg-neutral-700" />
                  <span className="text-xs text-neutral-500 uppercase tracking-wider">
                    All Users
                  </span>
                  <div className="flex-1 h-px bg-neutral-700" />
                </div>
              )}

              {/* User List */}
              <div className="space-y-2">
                {filteredUsers.length === 0 && (
                  <p className="text-neutral-500 text-sm text-center py-4">
                    {searchQuery
                      ? "No users found matching your search"
                      : "No users yet"}
                  </p>
                )}
                {filteredUsers.map((user) => {
                  const isCurrentUser = user.clerkUserId === currentUserId;
                  const timelineCount = user.timelineUids?.length ?? 0;

                  return (
                    <div
                      key={user.clerkUserId}
                      onClick={() => {
                        onSelectUser(user);
                        onClose();
                      }}
                      className={`group relative flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                        isCurrentUser
                          ? "bg-cyan-500/10 border border-cyan-500/30"
                          : "bg-white/5 border border-transparent hover:bg-white/10 hover:border-white/10"
                      }`}
                    >
                      {/* Avatar */}
                      {user.imageUrl ? (
                        <Image
                          src={user.imageUrl}
                          alt={user.displayName}
                          width={40}
                          height={40}
                          className="w-10 h-10 rounded-full object-cover ring-2 ring-white/10"
                        />
                      ) : (
                        <div
                          className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarColor(
                            user.displayName,
                          )} flex items-center justify-center text-white text-sm font-medium shadow-lg`}
                        >
                          {getInitials(user.displayName)}
                        </div>
                      )}

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-white truncate flex items-center gap-2">
                          {user.displayName}
                          {isCurrentUser && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 font-medium">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-neutral-400">
                          {timelineCount} timeline
                          {timelineCount !== 1 ? "s" : ""}
                        </div>
                      </div>

                      {/* Arrow */}
                      <svg
                        className="w-4 h-4 text-neutral-500 group-hover:text-white group-hover:translate-x-1 transition-all"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer - User count */}
        <div className="border-t border-white/10 px-5 py-3">
          <div className="text-xs text-neutral-500 text-center">
            {loading
              ? "Loading..."
              : `${filteredUsers.length} user${filteredUsers.length !== 1 ? "s" : ""}`}
            {searchQuery && ` matching "${searchQuery}"`}
          </div>
        </div>
      </div>
    </div>
  );
}
