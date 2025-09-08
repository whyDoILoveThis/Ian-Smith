"use client";

import React, { useMemo, useState } from "react";
import ItsConfettiCannon from "../sub/ItsConfettiCannon";
import { SPECIAL_DAYS } from "@/lib/globals";
import { DivideSquare } from "lucide-react";

interface Day {
  name: string;
  date: string;
}

// 📌 Utility function to get upcoming events with normalized year
function getUpcomingDays(days: Day[]) {
  const today = new Date();
  const todayYear = today.getFullYear();

  const upcoming = days.map((d) => {
    let eventDate = new Date(d.date);
    eventDate.setFullYear(todayYear);

    if (eventDate < today) eventDate.setFullYear(todayYear + 1);

    return { ...d, eventDate };
  });

  // Sort soonest first
  upcoming.sort((a, b) => a.eventDate.getTime() - b.eventDate.getTime());

  return upcoming;
}

// 📌 Calculate days left
function daysUntil(date: Date) {
  const today = new Date();
  return Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

const ConfettiCelebration = () => {
  const upcomingDays = useMemo(() => getUpcomingDays(SPECIAL_DAYS), []);
  const closestIndex = upcomingDays.findIndex(
    (d) => daysUntil(d.eventDate) >= 0
  );

  const [currentIndex, setCurrentIndex] = useState(
    closestIndex >= 0 ? closestIndex : 0
  );

  const currentDay = upcomingDays[currentIndex];
  const daysLeft = daysUntil(currentDay.eventDate);

  const prevDay = () =>
    setCurrentIndex((prev) =>
      prev === 0 ? upcomingDays.length - 1 : prev - 1
    );
  const nextDay = () =>
    setCurrentIndex((prev) =>
      prev === upcomingDays.length - 1 ? 0 : prev + 1
    );
  const goToNearest = () =>
    setCurrentIndex(closestIndex >= 0 ? closestIndex : 0);

  return (
    <article className="flex flex-col items-center gap-4 p-6 rounded-xl bg-white/10 border border-white/20">
      <div className="flex flex-col items-center justify-center">
        <ItsConfettiCannon />
        <span className="italic dark:text-slate-400">
          **Click to throw some confetti!!**
        </span>
      </div>

      <div className="flex flex-col items-center">
        <p className="text-lg h-10 font-semibold text-center">
          🎊 Only <span className="text-purple-500">{daysLeft}</span> days until{" "}
          <span className="text-blue-400">{currentDay.name}</span>!
        </p>
        {/* 📌 Navigation Buttons */}
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
    </article>
  );
};

export default ConfettiCelebration;
