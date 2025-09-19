"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Drop this file into app/love/page.tsx
 * - Put a romantic mp3 at /public/music/romantic.mp3 (see notes below)
 * - Requires: framer-motion installed (npm i framer-motion)
 */

export default function LovePage() {
  // Colors (milk chocolate + pink palette)
  const MILK_CHOC = "#84563C"; // milk chocolate hex (design suggestion)
  const SOFT_PINK = "#ffd6e8";
  const PINK = "#ff84bf";
  const DEEP_PINK = "#ff4da6";
  const ACCENT = "#fbe9f1";

  const [clickHearts, setClickHearts] = useState<
    { id: number; x: number; y: number; size: number }[]
  >([]);
  const [chocos, setChocos] = useState(
    [
      "Every morning with you is my favorite sunrise.",
      "Your laugh cures my worst days.",
      "You make ordinary feel like magic.",
      "Our little inside jokes = my treasure.",
      "Forever is simply not long enough with you.",
    ].map((text, i) => ({ id: i, text, opened: false }))
  );
  const [showLetter, setShowLetter] = useState(false);
  const [unwrapped, setUnwrapped] = useState(false);
  const [musicOn, setMusicOn] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // confetti canvas ref
  const confettiRef = useRef<HTMLCanvasElement | null>(null);
  const confettiParticles = useRef<any[]>([]);

  // Typewriter for love letter
  const fullLetter =
    "My love,\n\nYou are my sweetness, my steady in the storm, my laugh on a heavy day. I adore you — more than words can hold, more than chocolate can sweeten. Always yours.";
  const [typed, setTyped] = useState("");
  useEffect(() => {
    if (!showLetter) return;
    let i = 0;
    setTyped("");
    const iv = setInterval(() => {
      setTyped((s) => s + fullLetter[i]);
      i++;
      if (i >= fullLetter.length) clearInterval(iv);
    }, 25);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showLetter]);

  // spawn small heart where user clicks
  const handleGlobalClick = (e: React.MouseEvent) => {
    // ignore clicks on controls (so clicking buttons doesn't create lots of hearts)
    const tgt = e.target as HTMLElement;
    if (tgt.closest(".no-heart")) return;
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const newHeart = { id: Date.now(), x, y, size: Math.random() * 18 + 18 };
    setClickHearts((s) => [...s, newHeart]);
    // remove it after animation
    setTimeout(() => {
      setClickHearts((s) => s.filter((h) => h.id !== newHeart.id));
    }, 1700);
  };

  // chocolate unwrap action -> reveal all hearts + confetti + messages
  const unwrapAction = () => {
    setUnwrapped(true);
    // reveal one chocolate message at a time
    setChocos((c) =>
      c.map((x, i) => ({ ...x, opened: i === 0 ? true : x.opened }))
    );
    explodeConfetti();
  };

  // open specific chocolate
  const openChocolate = (id: number) => {
    setChocos((c) => c.map((x) => (x.id === id ? { ...x, opened: true } : x)));
    explodeConfetti();
  };

  // simple confetti implementation (canvas particles)
  useEffect(() => {
    const canvas = confettiRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const DPR = Math.max(1, window.devicePixelRatio || 1);
    const resize = () => {
      canvas.width = canvas.clientWidth * DPR;
      canvas.height = canvas.clientHeight * DPR;
    };
    resize();
    window.addEventListener("resize", resize);
    let raf = 0;

    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // gravity
      confettiParticles.current.forEach((p) => {
        p.vy += 0.15;
        p.x += p.vx;
        p.y += p.vy;
        p.r += 0.02;
        p.angle += p.spin;
        ctx.save();
        ctx.translate(p.x * DPR, p.y * DPR);
        ctx.rotate(p.angle);
        ctx.fillStyle = p.color;
        ctx.fillRect(
          (-p.size / 2) * DPR,
          (-p.size / 2) * DPR,
          p.size * DPR,
          p.size * DPR
        );
        ctx.restore();
      });
      // remove offscreen
      confettiParticles.current = confettiParticles.current.filter(
        (p) => p.y < canvas.height / DPR + 50
      );
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  const explodeConfetti = (amount = 45) => {
    const canvas = confettiRef.current;
    if (!canvas) return;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    for (let i = 0; i < amount; i++) {
      const colorPool = [PINK, DEEP_PINK, MILK_CHOC, SOFT_PINK, "#fff3f8"];
      confettiParticles.current.push({
        x: Math.random() * w,
        y: Math.random() * h * 0.35,
        vx: (Math.random() - 0.5) * 6,
        vy: Math.random() * -7 - 2,
        angle: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 0.2,
        size: Math.random() * 8 + 6,
        color: colorPool[Math.floor(Math.random() * colorPool.length)],
      });
    }
  };

  // audio controls
  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.loop = true;
    if (musicOn) audioRef.current.play().catch(() => {});
    else audioRef.current.pause();
  }, [musicOn]);

  return (
    <div
      onClick={handleGlobalClick}
      className="relative mb-40 h-[2000px] w-screen overflow-hidden select-none"
      style={{
        background: `radial-gradient(circle at 15% 10%, ${ACCENT}, ${SOFT_PINK} 20%, ${PINK} 45%, ${MILK_CHOC} 95%)`,
      }}
    >
      {/* canvas for confetti */}
      <canvas
        ref={confettiRef}
        className="pointer-events-none absolute inset-0 w-full h-full"
        style={{ zIndex: 5 }}
      />

      {/* Main layout */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center text-center px-6"
        style={{ zIndex: 10 }}
      >
        {/* Title */}
        <h1
          className="no-heart !text-6xl md:!text-7xl font-extrabold leading-tight drop-shadow-2xl"
          style={{ color: MILK_CHOC }}
        >
          💖 FOR YOU, MY LOVE 💖
        </h1>

        <p
          className="mt-3 text-lg md:text-xl italic font-medium"
          style={{ color: "#442d20" }}
        >
          A tiny world made just for you — click, explore, and let the love
          surprise you 🍫🌸✨
        </p>

        {/* Center interactive area */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {/* Chocolate box cluster */}
          <div
            className="no-heart p-4 rounded-2xl shadow-xl"
            style={{ background: "rgba(255,255,255,0.6)" }}
          >
            <h2
              className="text-2xl font-semibold mb-3"
              style={{ color: MILK_CHOC }}
            >
              🍫 Chocolate Squares
            </h2>
            <div className="grid grid-cols-3 gap-3">
              {chocos.map((c) => (
                <motion.button
                  key={c.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!c.opened) openChocolate(c.id);
                  }}
                  whileTap={{ scale: 0.95 }}
                  className="relative p-3 rounded-lg shadow-md border-2 border-transparent"
                  style={{
                    background: c.opened
                      ? `linear-gradient(180deg,#fff, ${SOFT_PINK})`
                      : MILK_CHOC,
                    color: c.opened ? "#3b2a20" : "#fff",
                    minWidth: 88,
                    minHeight: 88,
                  }}
                >
                  {!c.opened ? (
                    <div className="flex flex-col items-center justify-center h-full">
                      <div style={{ fontSize: 28 }}>🍫</div>
                      <div className="text-xs mt-1 font-bold">Unwrap</div>
                    </div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs font-medium"
                    >
                      {c.text}
                    </motion.div>
                  )}
                </motion.button>
              ))}
            </div>

            <div className="mt-4 flex gap-3 justify-center">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  unwrapAction();
                }}
                className="no-heart px-4 py-2 rounded-full font-semibold shadow hover:brightness-105"
                style={{ background: MILK_CHOC, color: "#fff" }}
              >
                {unwrapped ? "Unwrapped 🍬" : "Unwrap All"}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  explodeConfetti(30);
                }}
                className="no-heart px-4 py-2 rounded-full border-2 border-pink-300 font-semibold"
                style={{ background: "transparent", color: MILK_CHOC }}
              >
                🎉 Surprise!
              </button>
            </div>
          </div>

          {/* Center visual heart + ring */}
          <div
            className="no-heart flex flex-col items-center justify-center p-6 rounded-2xl shadow-xl"
            style={{ background: "rgba(255,255,255,0.5)" }}
          >
            <motion.div
              animate={{ scale: [1, 1.07, 1] }}
              transition={{ duration: 1.8, repeat: Infinity }}
              className="text-9xl"
            >
              <span
                style={{
                  display: "inline-block",
                  filter: "drop-shadow(0 8px 18px rgba(0,0,0,0.18))",
                }}
              >
                ❤️
              </span>
            </motion.div>

            <p
              className="mt-3 text-sm md:text-base"
              style={{ color: "#4a2f25" }}
            >
              Tap around — hearts will bloom where you click 🌸
            </p>

            <motion.div
              whileTap={{ rotate: 360, scale: 1.12 }}
              className="mt-4 px-4 py-2 rounded-full cursor-pointer"
              style={{
                background: PINK,
                color: "#2b1a15",
                boxShadow: "0 8px 18px rgba(0,0,0,0.15)",
              }}
              onClick={(e) => {
                e.stopPropagation();
                explodeConfetti(60);
              }}
            >
              💍 Spin the ring
            </motion.div>
          </div>

          {/* letter + music */}
          <div
            className="no-heart p-4 rounded-2xl shadow-xl"
            style={{ background: "rgba(255,255,255,0.6)" }}
          >
            <h2
              className="text-2xl font-semibold mb-3"
              style={{ color: MILK_CHOC }}
            >
              💌 Love Letter & Music
            </h2>

            <div className="flex flex-col gap-3 items-center">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowLetter(true);
                  explodeConfetti(35);
                }}
                className="px-5 py-2 rounded-full font-bold shadow"
                style={{ background: PINK, color: "#2b1a15" }}
              >
                Open Love Letter
              </button>

              <div className="flex gap-2 items-center mt-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMusicOn((s) => !s);
                  }}
                  className="px-4 py-2 rounded-full border-2"
                  style={{
                    background: musicOn ? MILK_CHOC : "transparent",
                    color: musicOn ? "#fff" : MILK_CHOC,
                  }}
                >
                  {musicOn ? "🔊 Music On" : "🔈 Play Music"}
                </button>
                <small style={{ color: "#4a2f25" }}>gentle piano (loop)</small>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* hearts spawned on clicks */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 20,
        }}
      >
        {clickHearts.map((h) => (
          <motion.div
            key={h.id}
            initial={{ opacity: 1, y: 0, scale: 1 }}
            animate={{ opacity: 0, y: -120, scale: 1.8 }}
            transition={{ duration: 1.6 }}
            style={{
              position: "absolute",
              left: h.x - h.size / 2,
              top: h.y - h.size / 2,
              fontSize: h.size,
            }}
          >
            ❤️
          </motion.div>
        ))}
      </div>

      {/* Love letter modal */}
      <AnimatePresence>
        {showLetter && (
          <motion.div
            className="fixed inset-0 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ zIndex: 50, background: "rgba(0,0,0,0.5)" }}
            onClick={() => setShowLetter(false)}
          >
            <motion.div
              className="p-8 rounded-3xl max-w-xl mx-4 bg-white shadow-2xl"
              initial={{ scale: 0.8, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 30, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2
                className="text-3xl font-bold mb-4"
                style={{ color: MILK_CHOC }}
              >
                💖 My Dearest 💖
              </h2>
              <pre
                className="whitespace-pre-wrap text-left text-sm"
                style={{ color: "#422f27", lineHeight: 1.5 }}
              >
                {typed}
              </pre>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowLetter(false);
                  }}
                  className="px-4 py-2 rounded-full"
                  style={{ background: "#ffd6e8", color: "#3b2a20" }}
                >
                  Close 💕
                </button>
                <button
                  onClick={() => {
                    explodeConfetti(80);
                  }}
                  className="px-4 py-2 rounded-full"
                  style={{ background: MILK_CHOC, color: "#fff" }}
                >
                  Celebrate 🎉
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* audio element (place your mp3 at /public/music/romantic.mp3) */}
      <audio ref={audioRef}>
        <source src="/music/romantic.mp3" />
      </audio>

      {/* small decorative stars that sparkle on hover */}
      <div style={{ position: "absolute", left: 30, top: 60, zIndex: 12 }}>
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            whileHover={{ scale: 1.6, rotate: 45 }}
            className="text-2xl"
            style={{ display: "inline-block", margin: 6, color: "#fffae6" }}
          >
            ✨
          </motion.div>
        ))}
      </div>
    </div>
  );
}
