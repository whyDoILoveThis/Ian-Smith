"use client";

import Nav from "@/components/main/Nav";
import React, { useEffect, useState } from "react";

// Cities with weight (higher weight = bigger font size)
export const cities = [
  { city: "New York", tz: "America/New_York", weight: 5 },
  { city: "Los Angeles", tz: "America/Los_Angeles", weight: 4 },
  { city: "Chicago", tz: "America/Chicago", weight: 4 },
  { city: "Denver", tz: "America/Denver", weight: 3 },
  { city: "Toronto", tz: "America/Toronto", weight: 3 },
  { city: "Mexico City", tz: "America/Mexico_City", weight: 4 },
  { city: "São Paulo", tz: "America/Sao_Paulo", weight: 3 },
  { city: "Buenos Aires", tz: "America/Argentina/Buenos_Aires", weight: 3 },
  { city: "Lima", tz: "America/Lima", weight: 2 },
  { city: "Santiago", tz: "America/Santiago", weight: 2 },
  { city: "Bogota", tz: "America/Bogota", weight: 2 },
  { city: "Caracas", tz: "America/Caracas", weight: 2 },
  { city: "Anchorage", tz: "America/Anchorage", weight: 1 },
  { city: "Honolulu", tz: "Pacific/Honolulu", weight: 1 },

  // 🌍 Europe
  { city: "London", tz: "Europe/London", weight: 5 },
  { city: "Paris", tz: "Europe/Paris", weight: 4 },
  { city: "Berlin", tz: "Europe/Berlin", weight: 3 },
  { city: "Rome", tz: "Europe/Rome", weight: 3 },
  { city: "Madrid", tz: "Europe/Madrid", weight: 3 },
  { city: "Moscow", tz: "Europe/Moscow", weight: 3 },
  { city: "Helsinki", tz: "Europe/Helsinki", weight: 2 },
  { city: "Warsaw", tz: "Europe/Warsaw", weight: 2 },
  { city: "Vienna", tz: "Europe/Vienna", weight: 2 },
  { city: "Reykjavik", tz: "Atlantic/Reykjavik", weight: 1 },
  { city: "Lisbon", tz: "Europe/Lisbon", weight: 2 },
  { city: "Athens", tz: "Europe/Athens", weight: 2 },

  // 🌏 Asia
  { city: "Tokyo", tz: "Asia/Tokyo", weight: 5 },
  { city: "Seoul", tz: "Asia/Seoul", weight: 4 },
  { city: "Shanghai", tz: "Asia/Shanghai", weight: 4 },
  { city: "Beijing", tz: "Asia/Shanghai", weight: 4 },
  { city: "Hong Kong", tz: "Asia/Hong_Kong", weight: 4 },
  { city: "Bangkok", tz: "Asia/Bangkok", weight: 3 },
  { city: "Singapore", tz: "Asia/Singapore", weight: 3 },
  { city: "Kolkata", tz: "Asia/Kolkata", weight: 3 },
  { city: "Dubai", tz: "Asia/Dubai", weight: 3 },
  { city: "Jakarta", tz: "Asia/Jakarta", weight: 2 },
  { city: "Kuala Lumpur", tz: "Asia/Kuala_Lumpur", weight: 2 },
  { city: "Manila", tz: "Asia/Manila", weight: 2 },
  { city: "Riyadh", tz: "Asia/Riyadh", weight: 2 },

  // 🌏 Oceania
  { city: "Sydney", tz: "Australia/Sydney", weight: 3 },
  { city: "Melbourne", tz: "Australia/Melbourne", weight: 3 },
  { city: "Brisbane", tz: "Australia/Brisbane", weight: 2 },
  { city: "Auckland", tz: "Pacific/Auckland", weight: 3 },
  { city: "Fiji", tz: "Pacific/Fiji", weight: 1 },

  // 🌍 Africa
  { city: "Cape Town", tz: "Africa/Johannesburg", weight: 2 },
  { city: "Nairobi", tz: "Africa/Nairobi", weight: 2 },
  { city: "Cairo", tz: "Africa/Cairo", weight: 3 },
  { city: "Casablanca", tz: "Africa/Casablanca", weight: 2 },

  // 🌎 Other
  { city: "UTC", tz: "Etc/UTC", weight: 5 },
  { city: "GMT", tz: "Etc/GMT", weight: 4 },
  { city: "Atlantic/Azores", tz: "Atlantic/Azores", weight: 1 },
  { city: "Pacific/Guam", tz: "Pacific/Guam", weight: 1 },
  { city: "Pacific/Tahiti", tz: "Pacific/Tahiti", weight: 1 },
  { city: "Pacific/Chatham", tz: "Pacific/Chatham", weight: 1 },
  { city: "Pacific/Marquesas", tz: "Pacific/Marquesas", weight: 1 },
  { city: "Pacific/Noumea", tz: "Pacific/Noumea", weight: 1 },
];

export default function Page() {
  const [hours, setHours] = useState("00");
  const [minutes, setMinutes] = useState("00");
  const [seconds, setSeconds] = useState("00");
  const [ampm, setAmpm] = useState("AM");
  const [countSeconds, setCountSeconds] = useState(true);
  const [timezone, setTimezone] = useState<string>(
    Intl.DateTimeFormat().resolvedOptions().timeZone
  );

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
        timeZone: timezone,
      };
      const parts = new Intl.DateTimeFormat(undefined, options)
        .formatToParts(now)
        .reduce((acc, part) => {
          if (part.type === "hour") acc.hour = part.value;
          if (part.type === "minute") acc.minute = part.value;
          if (part.type === "second") acc.second = part.value;
          if (part.type === "dayPeriod") acc.dayPeriod = part.value;
          return acc;
        }, {} as any);

      setHours(parts.hour);
      setMinutes(parts.minute);
      setSeconds(parts.second);
      setAmpm(parts.dayPeriod);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [timezone]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 pb-6">
      <Nav />

      <div className="h-20"></div>
      {/* TIME */}
      <h1
        className="
          font-extrabold tracking-tight text-gray-900 dark:text-white drop-shadow-xl
          text-[15vw] leading-none text-center flex items-center justify-center
        "
      >
        {/* HOURS */}
        <span className="w-[2ch] tabular-nums text-right">{hours}</span>
        <span className="mx-1">:</span>

        {/* MINUTES */}
        <span className="w-[2ch] tabular-nums text-right">{minutes}</span>

        {countSeconds && (
          <>
            <span className="mx-1">:</span>
            <span className="w-[2ch] tabular-nums text-right">{seconds}</span>
          </>
        )}

        {/* AM/PM */}
        <span className="text-[5vw] ml-4">{ampm}</span>
      </h1>

      {/* TIMEZONE */}
      <p className="mt-2 text-sm md:text-lg font-medium sticky top-16 text-gray-500 dark:text-gray-400 text-right w-full max-w-4xl">
        {timezone}
      </p>

      {/* RESET BUTTON */}
      <button
        onClick={() =>
          setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone)
        }
        className="mt-6 px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold shadow-lg hover:scale-105 transition"
      >
        🌍 Use My Timezone
      </button>

      {/* TOGGLE SECONDS */}
      <div className="mt-6 flex items-center gap-3">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Seconds
        </span>
        <button
          onClick={() => setCountSeconds(!countSeconds)}
          className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors duration-300 
      ${countSeconds ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"}`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-300
        ${countSeconds ? "translate-x-7" : "translate-x-1"}`}
          />
        </button>
      </div>

      {/* TIMEZONE CITY CLOUD */}
      <div className="mt-12 flex flex-wrap justify-center gap-4 max-w-5xl">
        {cities.map(({ city, tz, weight }) => (
          <button
            key={tz}
            onClick={() => setTimezone(tz)}
            className="
              transition hover:text-blue-500 dark:hover:text-blue-400
              text-gray-700 dark:text-gray-300 font-bold
            "
            style={{ fontSize: `${Math.max(0.8, weight * 0.5)}rem` }}
          >
            {city}
          </button>
        ))}
      </div>
    </div>
  );
}
