"use client";

import CenterHeart from "@/components/JessicasLove/CenterHeart";
import ChocolateGrid from "@/components/JessicasLove/ChocolateGrid";
import ConfettiCanvas, {
  ConfettiHandle,
} from "@/components/JessicasLove/ConfettiCanvas";
import HeartsLayer from "@/components/JessicasLove/HeartsLayer";
import LoveLetterModal from "@/components/JessicasLove/LoveLetterModal";
import MusicToggle from "@/components/JessicasLove/MusicToggle";
import StarsCluster from "@/components/JessicasLove/StarsCluster";
import React, { useRef, useState } from "react";

type Heart = { id: number; x: number; y: number; size: number };
type Choco = { id: number; text: string; opened: boolean };

export default function LovePage() {
  // palette
  const MILK_CHOC = "#84563C";
  const SOFT_PINK = "#ffd6e8";
  const PINK = "#ff84bf";
  const DEEP_PINK = "#ff4da6";
  const ACCENT = "#fbe9f1";

  // state
  const [clickHearts, setClickHearts] = useState<Heart[]>([]);

  const [showLetter, setShowLetter] = useState(false);
  const [marry, showMarry] = useState(false);

  // confetti ref (component exposes explode)
  const confettiRef = useRef<ConfettiHandle | null>(null);

  // spawn heart at click
  const handleGlobalClick = (e: React.MouseEvent) => {
    // const tgt = e.target as HTMLElement;
    // if (tgt.closest(".no-heart")) return;
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const newHeart: Heart = {
      id: Date.now(),
      x,
      y,
      size: Math.random() * 18 + 18,
    };
    setClickHearts((s) => [...s, newHeart]);
    setTimeout(
      () => setClickHearts((s) => s.filter((h) => h.id !== newHeart.id)),
      1700
    );
  };

  // typed typewriter trigger from modal open
  const handleOpenLetter = () => {
    setShowLetter(true);
  };

  return (
    <div
      onClick={handleGlobalClick}
      className="relative min-h-screen pb-40 overflow-hidden select-none"
      style={{
        background: `radial-gradient(circle at 15% 10%, ${ACCENT}, ${SOFT_PINK} 20%, ${PINK} 45%, #CC6CE7 95%)`,
      }}
    >
      {/* confetti canvas */}
      <ConfettiCanvas
        ref={confettiRef}
        colors={[PINK, DEEP_PINK, MILK_CHOC, SOFT_PINK, "#fff3f8"]}
      />

      {/* main content */}
      <div
        className="flex flex-col items-center justify-center text-center px-6"
        style={{ zIndex: 10 }}
      >
        <span
          onMouseEnter={() => {
            showMarry(true);
          }}
          onMouseLeave={() => {
            showMarry(false);
          }}
          className={`fixed left-4 bottom-4 text-5xl flex flex-col z-[999999]`}
        >
          <span
            className={`${!marry ? "hidden" : "visible"} text-4xl font-bold`}
          >
            MARRY ME!!
          </span>
          <span className="animate-spin-slow">💍</span>
        </span>
        <h1
          className="no-heart text-6xl md:text-7xl font-extrabold drop-shadow-2xl"
          style={{ color: MILK_CHOC }}
        >
          💖 FOR YOU, MY LOVE 💖
        </h1>
        <p
          className="mt-3 text-lg md:text-xl italic font-medium"
          style={{ color: "#442d20" }}
        >
          A tiny world made with love just for you 🍫🌸✨
        </p>

        <div className="mt-8 flex flex-col gap-6 items-center w-full max-w-6xl">
          <ChocolateGrid
            confettiRef={confettiRef}
            onCelebrate={() => confettiRef.current?.explode(50)}
          />

          <CenterHeart onCelebrate={() => confettiRef.current?.explode(145)} />
          <div
            className="no-heart p-4 rounded-2xl shadow-xl"
            style={{ background: "rgba(255,255,255,0.6)" }}
          >
            <h2
              className="text-2xl font-semibold mb-3"
              style={{ color: MILK_CHOC }}
            >
              💌 Love Letter
            </h2>
            <div className="flex flex-col gap-3 items-center">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenLetter();
                  confettiRef.current?.explode(35);
                }}
                className="px-5 py-2 rounded-full font-bold shadow"
                style={{ background: PINK, color: "#2b1a15" }}
              >
                Open Love Letter
              </button>
            </div>
          </div>
        </div>
      </div>
      <LoveLetterModal
        show={showLetter}
        setShow={setShowLetter}
        confettiRef={confettiRef}
      />
      <HeartsLayer hearts={clickHearts} />
    </div>
  );
}
