"use client";
import React, { useEffect, useRef } from "react";

/**
 * ConfettiCanvasPopper.tsx
 * - Canvas-based confetti (spam-click safe)
 * - Shoots upper-right, stays solid, then fades
 * - DevicePixelRatio aware, performant, caps total particles
 * - FIX: particles now keep a consistent shape (no flutter)
 */

const COLORS = [
  "#f87171",
  "#facc15",
  "#4ade80",
  "#60a5fa",
  "#c084fc",
  "#f472b6",
  "#fb923c",
  "#34d399",
];

type Shape = "rect" | "circle";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number; // seconds total
  age: number; // seconds lived
  rotation: number;
  spin: number; // radians/sec
  shape: Shape; // consistent shape for the particle
};

export default function ItsConfettiCannon(): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const maxParticles = 1200;

  // Setup canvas size and DPR
  useEffect(() => {
    const canvas = canvasRef.current!;
    if (!canvas) return;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    const step = (t: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = t;
      const dt = Math.min(0.05, (t - lastTimeRef.current) / 1000); // cap dt
      lastTimeRef.current = t;

      // update particles
      const parts = particlesRef.current;
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        // simple physics: velocity + tiny gravity
        const gravity = 400; // px/s^2 (tweakable)
        p.vy += gravity * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rotation += p.spin * dt;
        p.age += dt;

        if (p.age >= p.life) {
          // remove dead particle
          parts.splice(i, 1);
        }
      }

      // clear & draw
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // draw particles
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        // opacity: stay solid until 80% of life, then fade 20%
        const tNorm = p.age / p.life;
        let alpha = 1;
        if (tNorm >= 0.8) alpha = Math.max(0, 1 - (tNorm - 0.8) / 0.2);

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);

        // DRAW BASED ON FIXED SHAPE (no randomness here)
        if (p.shape === "rect") {
          ctx.fillStyle = p.color;
          // rectangle with slight aspect ratio for a paper-like feel
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.65);
        } else {
          ctx.beginPath();
          ctx.fillStyle = p.color;
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
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

  // spawn a burst at screen coordinates (x, y)
  const spawnBurst = (x: number, y: number) => {
    const parts = particlesRef.current;
    const count = 32 + Math.floor(Math.random() * 16); // 32-48 particles per burst

    for (let i = 0; i < count; i++) {
      if (parts.length > maxParticles) break; // cap total
      // angle range biased to upper-right: between -85deg and -15deg
      const angle = (Math.PI / 180) * (-85 + Math.random() * 70); // -85 -> -15 deg
      const speed = 260 + Math.random() * 420; // px/s

      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed; // negative -> upward initially

      const size = 4 + Math.random() * 10; // px
      const life = 0.9 + Math.random() * 0.9; // seconds
      const rotation = Math.random() * Math.PI * 2;
      const spin = (Math.random() - 0.5) * 10; // radians/sec

      const color = COLORS[Math.floor(Math.random() * COLORS.length)];

      // assign a consistent shape at spawn time: prefer rects for bigger pieces
      const shape: Shape = size > 6 && Math.random() > 0.4 ? "rect" : "circle";

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
  };

  // click handler: compute emoji center and spawn burst
  const handleClick = (ev: React.MouseEvent<HTMLButtonElement>) => {
    // get click target center rather than click coords (so emoji center is source)
    const btn = ev.currentTarget;
    const rect = btn.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    // canvas is full window sized; spawn at center coords
    spawnBurst(cx, cy);
  };

  return (
    <div>
      <button
        onClick={handleClick}
        aria-label="Pop confetti"
        title="Click / spam-click me!"
        className="relative z-20 select-none text-4xl"
      >
        🎉
      </button>

      {/* full-screen canvas sits above background but below UI */}
      <canvas
        ref={canvasRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          zIndex: 10,
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
