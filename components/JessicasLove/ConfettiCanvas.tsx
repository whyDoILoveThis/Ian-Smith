"use client";

import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";

export type ConfettiHandle = {
  explode: (amount?: number) => void;
};

type Props = {
  colors?: string[];
};

const ConfettiCanvas = forwardRef<ConfettiHandle | null, Props>(
  (
    { colors = ["#ff84bf", "#ff4da6", "#84563C", "#ffd6e8", "#fff3f8"] },
    ref
  ) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const particlesRef = useRef<any[]>([]);

    useImperativeHandle(ref, () => ({
      explode(amount = 345) {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        for (let i = 0; i < amount; i++) {
          particlesRef.current.push({
            x: Math.random() * w,
            y: Math.random() * h * 0.35,
            vx: (Math.random() - 0.5) * 6,
            vy: Math.random() * -7 - 2,
            angle: Math.random() * Math.PI,
            spin: (Math.random() - 0.5) * 0.2,
            size: Math.random() * 8 + 6,
            color: colors[Math.floor(Math.random() * colors.length)],
          });
        }
      },
    }));

    useEffect(() => {
      const canvas = canvasRef.current;
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
        particlesRef.current.forEach((p) => {
          p.vy += 0.15;
          p.x += p.vx;
          p.y += p.vy;
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
        particlesRef.current = particlesRef.current.filter(
          (p) => p.y < canvas.height / DPR + 50
        );
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      return () => {
        cancelAnimationFrame(raf);
        window.removeEventListener("resize", resize);
      };
    }, [colors]);

    return (
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 w-full h-full"
        style={{ zIndex: 5 }}
      />
    );
  }
);

ConfettiCanvas.displayName = "ConfettiCanvas";
export default ConfettiCanvas;
