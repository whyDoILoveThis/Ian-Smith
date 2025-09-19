"use client";

import React, { useEffect, useRef, useState } from "react";

export default function MusicToggle() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [musicOn, setMusicOn] = useState(false);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.loop = true;
    if (musicOn) audioRef.current.play().catch(() => {});
    else audioRef.current.pause();
  }, [musicOn]);

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setMusicOn((s) => !s);
        }}
        className="px-4 py-2 rounded-full border-2"
        style={{
          background: musicOn ? "#84563C" : "transparent",
          color: musicOn ? "#fff" : "#84563C",
        }}
      >
        {musicOn ? "🔊 Music On" : "🔈 Play Music"}
      </button>
      <audio ref={audioRef}>
        <source src="/music/romantic.mp3" />
      </audio>
    </div>
  );
}
