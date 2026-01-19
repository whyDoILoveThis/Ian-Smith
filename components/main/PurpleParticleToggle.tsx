"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";

// Authentic Minecraft Portal/Enderman Hex Palette
const PARTICLE_COLORS = ["#FF55FF", "#AA00AA", "#9208FF", "#5E1C9E"];

class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  color: string;
  rotation: number;
  rotSpeed: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    // Initial burst + slight upward "floaty" gravity
    this.vx = (Math.random() - 0.5) * 4;
    this.vy = (Math.random() - 0.5) * 4 - 1;
    this.size = Math.random() * 3 + 2; // Pixelated size
    this.life = 1.0;
    this.color =
      PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)];
    this.rotation = Math.random() * Math.PI * 2;
    this.rotSpeed = (Math.random() - 0.5) * 0.15;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy -= 0.03; // Rising gravity
    this.rotation += this.rotSpeed;
    this.life -= 0.012;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.globalAlpha = this.life;

    // Minecraft "Glow" Effect
    ctx.shadowBlur = 10;
    ctx.shadowColor = this.color;
    ctx.fillStyle = this.color;

    // Diamond Cluster: 4 squares arranged in a 2x2 grid
    const s = this.size;
    ctx.fillRect(-s, -s, s, s);
    ctx.fillRect(1, -s, s, s);
    ctx.fillRect(-s, 1, s, s);
    ctx.fillRect(1, 1, s, s);

    ctx.restore();
  }
}

export default function PurpleParticleToggle() {
  const [isOn, setIsOn] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.current.forEach((p, i) => {
        p.update();
        p.draw(ctx);
        if (p.life <= 0) particles.current.splice(i, 1);
      });
      requestAnimationFrame(render);
    };

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const handleGlobalClick = (e: MouseEvent) => {
      if (!isOn) return;
      for (let i = 0; i < 10; i++) {
        particles.current.push(new Particle(e.clientX, e.clientY));
      }
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("mousedown", handleGlobalClick);
    handleResize();
    const animId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousedown", handleGlobalClick);
      cancelAnimationFrame(animId);
    };
  }, [isOn]);

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium tracking-tight text-slate-600 dark:text-slate-300">
        Purple Particle Poof
      </span>

      <button
        onClick={() => setIsOn(!isOn)}
        className={`relative h-6 w-11 rounded-full p-1 transition-all duration-500 ease-in-out ${
          isOn ? "bg-purple-600 shadow-[0_0_12px_#a855f7]" : "bg-slate-300"
        }`}
      >
        <motion.div
          animate={{ x: isOn ? 20 : 0, scale: isOn ? 1.1 : 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 25 }}
          className="h-4 w-4 rounded-full bg-white shadow-sm"
        />
      </button>

      {/* Persistent Canvas Overlay */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none fixed inset-0 z-[9999]"
      />
    </div>
  );
}
