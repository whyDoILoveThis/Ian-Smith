import React, { useEffect, useRef, useState } from "react";
import HorizontalTimelineIcon from "../sub/HorizontalTimelineIcon";
import ItsDropdown from "../ui/its-dropdown";
import MenuIcon from "../sub/MenuIcon";
import { SignInButton, useAuth, UserButton } from "@clerk/nextjs";
import SettingsIcon from "../sub/SettingsIcon";

interface Props {
  scale: number;
  centerMs: number;
  showAllCards?: boolean;
  onToggleShowAll?: () => void;
  activeTimelineName?: string;
  onOpenTimelines?: () => void;
  onOpenSettings?: () => void;
  onOpenUsers?: () => void;
  hasActiveTimeline?: boolean;
  onCenterToday?: () => void;
  isOwner?: boolean; // Whether current user owns the active timeline
  viewingUser?: TimelineUser | null; // User whose timelines we're viewing (null = own)
  onGoHome?: () => void; // Return to own dashboard
}

export default function TimelineHeader({
  scale,
  centerMs,
  showAllCards,
  onToggleShowAll,
  activeTimelineName,
  onOpenTimelines,
  onOpenSettings,
  onOpenUsers,
  hasActiveTimeline,
  onCenterToday,
  isOwner,
  viewingUser,
  onGoHome,
}: Props) {
  // year pop UI
  const currentDate = new Date(centerMs);
  const currentYear = currentDate.getFullYear();
  const prevYearRef = useRef<number>(currentYear);
  const [yearPopping, setYearPopping] = useState(false);
  const { userId } = useAuth();
  const currentMonthDay = currentDate.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
  });

  useEffect(() => {
    if (prevYearRef.current !== currentYear) {
      setYearPopping(true);
      const t = setTimeout(() => setYearPopping(false), 500); // pop duration
      prevYearRef.current = currentYear;
      return () => clearTimeout(t);
    }
  }, [currentYear]);

  const Actions: React.FC<{ vertical?: boolean }> = ({ vertical }) => {
    return (
      <div
        className={`flex ${vertical ? "flex-col" : "flex-row flex-wrap"} justify-center items-center gap-4`}
      >
        {/* Viewing other user's dashboard indicator */}
        {viewingUser && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30">
            <span className="text-xs text-amber-400">Viewing:</span>
            <span className="text-sm font-medium text-amber-300">
              {viewingUser.displayName}
            </span>
            {onGoHome && (
              <button
                onClick={onGoHome}
                type="button"
                className="ml-1 text-amber-400 hover:text-amber-200 transition-colors"
                title="Return to your dashboard"
              >
                ✕
              </button>
            )}
          </div>
        )}

        {onOpenTimelines && (
          <button
            onClick={onOpenTimelines}
            type="button"
            aria-label="Open timelines"
            className="flex items-center gap-2 px-3 py-1 text-sm rounded-full border transition-all duration-200 bg-gradient-to-r from-violet-600/20 to-cyan-600/20 border-violet-500/30 hover:border-violet-400/50 text-violet-300 hover:text-violet-200 whitespace-nowrap"
          >
            <span className="text-base">📚</span>
            <span>{activeTimelineName || "Timelines"}</span>
          </button>
        )}

        {/* Users button */}
        {onOpenUsers && (
          <button
            onClick={onOpenUsers}
            type="button"
            aria-label="Browse users"
            className="flex items-center gap-2 px-3 py-1 text-sm rounded-full border transition-all duration-200 bg-gradient-to-r from-emerald-600/20 to-teal-600/20 border-emerald-500/30 hover:border-emerald-400/50 text-emerald-300 hover:text-emerald-200 whitespace-nowrap"
          >
            <span className="text-base">👥</span>
            <span>Users</span>
          </button>
        )}

        {onCenterToday && (
          <button
            onClick={onCenterToday}
            type="button"
            aria-label="Jump to today"
            className="px-3 py-1 text-sm rounded-full border transition-colors bg-transparent text-neutral-400 border-neutral-600 hover:border-cyan-400 hover:text-cyan-300 whitespace-nowrap"
            title="Jump to today"
          >
            Today
          </button>
        )}
        {onToggleShowAll && (
          <button
            onClick={onToggleShowAll}
            type="button"
            aria-pressed={!!showAllCards}
            className={`px-3 py-1 text-sm rounded-full border transition-colors whitespace-nowrap ${
              showAllCards
                ? "bg-cyan-500 text-black border-cyan-400"
                : "bg-transparent text-neutral-400 border-neutral-600 hover:border-neutral-400"
            }`}
          >
            {showAllCards ? "Hide All" : "Show All"}
          </button>
        )}
        {!vertical && <SettingsAndUserBtn />}
      </div>
    );
  };

  const SettingsAndUserBtn = () => {
    return (
      <div className="flex justify-end items-center gap-2 w-full">
        <span className="whitespace-nowrap">
          {userId ? (
            <span className="w-[32px] h-[32px] flex justify-center items-center">
              <UserButton />
            </span>
          ) : (
            <SignInButton mode="modal" />
          )}
        </span>
        {/* Only show settings if signed in AND is owner */}
        {userId && onOpenSettings && hasActiveTimeline && isOwner && (
          <button
            onClick={onOpenSettings}
            type="button"
            aria-label="Timeline settings"
            className="flex items-center justify-center w-8 h-8 text-sm rounded-full border transition-all duration-200 bg-neutral-800/50 border-neutral-600 hover:border-neutral-400 text-neutral-400 hover:text-white whitespace-nowrap"
            title="Timeline Settings"
          >
            <SettingsIcon />
          </button>
        )}
      </div>
    );
  };

  return (
    <header className="m-4 flex items-center justify-between">
      <div className="flex flex-col">
        <h1 className="relative text-2xl md:text-3xl text-nowrap font-semibold flex gap-1 items-center mr-2">
          <HorizontalTimelineIcon /> Timeline Engine{" "}
          <span className="pl-6 absolute right-0 top-[34px] text-xs md:text-sm text-neutral-400">
            Zoom: {scale.toFixed(2)}×
          </span>
        </h1>
        <div className="text-xs md:text-sm text-neutral-200 flex items-center gap-1">
          • Center:{" "}
          <span className="inline-block w-[45px] text-nowrap">
            {currentMonthDay}
          </span>
          <span
            className={`text-xl md:text-2xl inline-block font-bold w-[100px] ${yearPopping ? "year-pop" : ""}`}
          >
            {currentYear}
          </span>
        </div>
      </div>
      {/* Actions: Desktop */}
      <div className="hidden md:block">
        <Actions vertical={false} />
      </div>

      {/* Actions: Mobile */}
      <div className="md:hidden">
        <ItsDropdown
          trigger={
            <button
              type="button"
              className="flex items-center justify-center w-10 h-10 rounded-full border border-neutral-700 bg-neutral-800/60 text-neutral-300 hover:text-white hover:border-neutral-500"
              aria-label="Menu"
            >
              <MenuIcon size={20} />
            </button>
          }
          position="down-right"
          closeWhenItemClick
          className="bg-neutral-900/95 border-neutral-700 text-neutral-200 !z-[99999999999]"
          contentNoCloseWhenClickedBottom={<SettingsAndUserBtn />}
        >
          <div className="p-2">
            <Actions vertical />
          </div>
        </ItsDropdown>
      </div>
    </header>
  );
}
