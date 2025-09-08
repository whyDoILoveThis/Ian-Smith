"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";

/**
 * ItsConfettiCannon.tsx
 * - Clean, readable, performant confetti cannon
 * - Canvas is appended to document.body so it's never affected by parent transforms/filters
 * - Triangles, rects, and circles included
 * - DevicePixelRatio-aware, caps particles, safe for spam clicks
 */

/* ---------- Config ---------- */
const COLORS = [
  "#f87171",
  "#facc15",
  "#4ade80",
  "#60a5fa",
  "#c084fc",
  "#f472b6",
  "#fb923c",
  "#34d399",
] as const;

type Shape = "rect" | "circle" | "triangle";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  age: number;
  rotation: number;
  spin: number;
  shape: Shape;
};

const MAX_PARTICLES = 1200;
const GRAVITY = 400; // px/s^2
const BURST_BASE = 32;
const BURST_VARIANCE = 16;
const MAX_DPR = 2;

/* ---------- Utilities ---------- */
const rand = (min: number, max: number) => min + Math.random() * (max - min);
const pick = <T,>(arr: readonly T[]) =>
  arr[Math.floor(Math.random() * arr.length)];
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/* ---------- Component ---------- */
export default function ItsConfettiCannon(): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const [animKey, setAnimKey] = useState(0); // remount key for local button animation

  /* ---------- Canvas lifecycle (attach to body) ---------- */
  useEffect(() => {
    const canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.position = "fixed";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.width = "100vw";
    canvas.style.height = "100vh";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "9999";
    document.body.appendChild(canvas);
    canvasRef.current = canvas;

    const resize = () => {
      const dpr = clamp(window.devicePixelRatio || 1, 1, MAX_DPR);
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener("resize", resize);
    // handle mobile visualViewport changes (address bar)
    const visualViewport: any = (window as any).visualViewport;
    if (visualViewport) visualViewport.addEventListener("resize", resize);

    return () => {
      if (visualViewport) visualViewport.removeEventListener("resize", resize);
      window.removeEventListener("resize", resize);
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      canvasRef.current = null;
    };
  }, []);

  /* ---------- Animation loop ---------- */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const step = (t: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = t;
      const dt = Math.min(0.05, (t - lastTimeRef.current) / 1000); // cap dt
      lastTimeRef.current = t;

      const parts = particlesRef.current;

      // physics update
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.vy += GRAVITY * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rotation += p.spin * dt;
        p.age += dt;
        if (p.age >= p.life) parts.splice(i, 1);
      }

      // clear and draw (use canvas backing pixel size)
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        const tNorm = p.age / p.life;
        const alpha = tNorm >= 0.8 ? Math.max(0, 1 - (tNorm - 0.8) / 0.2) : 1;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;

        // draw by shape
        if (p.shape === "rect") {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.65);
        } else if (p.shape === "circle") {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // triangle (point up)
          ctx.beginPath();
          ctx.moveTo(0, -p.size / 2);
          ctx.lineTo(p.size / 2, p.size / 2);
          ctx.lineTo(-p.size / 2, p.size / 2);
          ctx.closePath();
          ctx.fill();
        }

        ctx.restore();
      }

      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastTimeRef.current = null;
    };
  }, []);

  /* ---------- Particle spawn ---------- */
  const spawnBurst = useCallback((x: number, y: number) => {
    const parts = particlesRef.current;
    const count = BURST_BASE + Math.floor(Math.random() * BURST_VARIANCE);

    for (let i = 0; i < count; i++) {
      if (parts.length >= MAX_PARTICLES) break;

      // biased upward-right (-85deg to -15deg)
      const angle = (Math.PI / 180) * (-85 + Math.random() * 70);
      const speed = rand(260, 680);
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const size = rand(4, 14);
      const life = rand(0.9, 1.8);
      const rotation = Math.random() * Math.PI * 2;
      // give triangles slightly more spin and size variance for visual interest
      const shape: Shape =
        Math.random() < 0.25 ? "triangle" : pick(["rect", "circle"] as const);
      const spin = shape === "triangle" ? rand(-12, 12) : rand(-6, 6); // triangles spin a bit faster
      const color = pick(COLORS);

      parts.push({
        x,
        y,
        vx,
        vy,
        size,
        color,
        life,
        age: 0,
        rotation,
        spin,
        shape,
      });
    }
  }, []);

  /* ---------- Helpers: map client coords -> canvas-space (CSS pixels) ---------- */
  const clientToCanvas = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    // Because we called ctx.setTransform(dpr,...), we draw in CSS pixels.
    const cssX = clientX - rect.left;
    const cssY = clientY - rect.top;
    return { x: cssX, y: cssY };
  }, []);

  /* ---------- Click handler exposed to the button ---------- */
  const handleClick = (ev: React.MouseEvent<HTMLButtonElement>) => {
    const btn = ev.currentTarget;
    const rect = btn.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const { x, y } = clientToCanvas(cx, cy);
    spawnBurst(x, y);

    // quick state bump to restart button animation if desired
    setAnimKey((k) => k + 1);
  };

  return (
    <div>
      <button
        onClick={handleClick}
        aria-label="Pop confetti"
        title="Click / spam-click me!"
        className="relative z-20 select-none text-4xl"
        key={animKey}
      >
        🎉
      </button>

      {/* global small keyframes for pop animation */}
      <style jsx global>{`
        @keyframes confetti-pop {
          0% {
            transform: scale(1) rotate(0deg);
          }
          25% {
            transform: scale(1.28) rotate(-10deg);
          }
          50% {
            transform: scale(0.94) rotate(10deg);
          }
          75% {
            transform: scale(1.08) rotate(-5deg);
          }
          100% {
            transform: scale(1) rotate(0deg);
          }
        }
        button[aria-label="Pop confetti"] {
          animation: confetti-pop 0.28s ease-in-out;
        }
      `}</style>
    </div>
  );
}
