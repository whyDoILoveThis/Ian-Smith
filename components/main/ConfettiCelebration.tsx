"use client";

import React, { useEffect, useMemo, useState } from "react";
import ItsConfettiCannon from "../sub/ItsConfettiCannon";
import { SPECIAL_DAYS } from "@/lib/globals";

interface Day {
  name: string;
  date: string;
}

function getUpcomingDays(days: Day[]) {
  const today = new Date();
  const todayYear = today.getFullYear();

  const upcoming = days.map((d) => {
    let eventDate = new Date(d.date);
    eventDate.setFullYear(todayYear);
    if (eventDate < today) eventDate.setFullYear(todayYear + 1);
    return { ...d, eventDate };
  });

  upcoming.sort((a, b) => a.eventDate.getTime() - b.eventDate.getTime());
  return upcoming;
}

function daysUntil(date: Date) {
  const today = new Date();
  return Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

const STORAGE_KEY = "confetti_currentIndex_v1";

const ConfettiCelebration: React.FC = () => {
  const upcomingDays = useMemo(() => getUpcomingDays(SPECIAL_DAYS), []);
  const closestIndex = useMemo(() => {
    const idx = upcomingDays.findIndex((d) => daysUntil(d.eventDate) >= 0);
    return idx >= 0 ? idx : 0;
  }, [upcomingDays]);

  // IMPORTANT: initialize from closestIndex (server-friendly). Do NOT read localStorage here.
  const [currentIndex, setCurrentIndex] = useState<number>(closestIndex);

  // After mount, read localStorage and apply if valid — this avoids hydration mismatch.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw !== null) {
        const parsed = parseInt(raw, 10);
        if (!isNaN(parsed) && parsed >= 0 && parsed < upcomingDays.length) {
          // only update if different
          if (parsed !== currentIndex) setCurrentIndex(parsed);
        }
      }
    } catch (e) {
      // ignore (private mode, etc.)
    }
    // We intentionally include upcomingDays.length so if the list changes, we re-check storage.
    // We don't include currentIndex to avoid running this effect on every index change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upcomingDays.length, closestIndex]);

  // Persist index changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(currentIndex));
    } catch (e) {
      // ignore storage errors
    }
  }, [currentIndex]);

  // Clamp if list length changed and index is out-of-range
  useEffect(() => {
    if (upcomingDays.length === 0) return;
    if (currentIndex >= upcomingDays.length) {
      setCurrentIndex(0);
    }
  }, [upcomingDays.length, currentIndex]);

  if (!upcomingDays || upcomingDays.length === 0) {
    return (
      <article className="flex flex-col items-center gap-4 p-6 rounded-xl bg-white/10 border border-white/20">
        <p className="text-center">No special days configured.</p>
      </article>
    );
  }

  const currentDay = upcomingDays[currentIndex];
  const daysLeft = daysUntil(currentDay.eventDate);

  const prevDay = () =>
    setCurrentIndex((prev) =>
      prev === 0 ? upcomingDays.length - 1 : prev - 1,
    );
  const nextDay = () =>
    setCurrentIndex((prev) =>
      prev === upcomingDays.length - 1 ? 0 : prev + 1,
    );
  const goToNearest = () =>
    setCurrentIndex(closestIndex >= 0 ? closestIndex : 0);

  return (
    <article className="w-full flex justify-center">
      <div className="flex flex-col w-full max-w-[800px] items-center gap-4 p-6 rounded-xl bg-white/10 border border-white/20">
        <div className="flex flex-col items-center justify-center">
          <ItsConfettiCannon />
          <span className="italic dark:text-slate-400">
            **Click to throw some confetti!!**
          </span>
        </div>
        <div className="flex flex-col items-center">
          <p className="text-lg h-10 font-semibold text-center">
            🎊 Only <span className="text-purple-500">{daysLeft}</span> days
            until <span className="text-blue-400">{currentDay.name}</span>!
          </p>
          <span className="flex gap-3 mt-4">
            <button
              onClick={prevDay}
              className="btn !rounded-full btn-purple btn-squish btn-xs"
            >
              Prev
            </button>
            <button
              onClick={goToNearest}
              className="btn !rounded-full btn-blue btn-squish btn-xs"
            >
              Nearest
            </button>
            <button
              onClick={nextDay}
              className="btn !rounded-full btn-purple btn-squish btn-xs"
            >
              Next
            </button>
          </span>
        </div>
      </div>
    </article>
  );
};

export default ConfettiCelebration;
