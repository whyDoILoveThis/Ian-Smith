"use client";

import { useEffect, useRef, useCallback } from "react";

type Props = {
  numOfOrbs: number;
  orbSizes: number[]; // px diameter per orb
  orbColors: string[]; // css color per orb
  orbSpeed: number[]; // px per frame per orb
  orbBlur: number[]; // px blur per orb
  orbOpacity: number[]; // 0–1 per orb
  blendMode?: GlobalCompositeOperation;
  opacity?: number;
  gradientHardStop?: number;
  bounceElasticity?: number;
  flingMultiplier?: number;
};

type Orb = {
  x: number;
  y: number;
  dx: number;
  dy: number;
  radius: number;
  color: string;
  blur: number;
  opacity: number;
  mass: number;
  sprite: HTMLCanvasElement; // pre-rendered blurred glow
};

type Drag = {
  orb: Orb;
  offsetX: number;
  offsetY: number;
  prevX: number;
  prevY: number;
  prevTime: number;
  velX: number;
  velY: number;
};

/** Pre-render a single orb's blurred radial gradient to an offscreen canvas. */
function createOrbSprite(
  radius: number,
  color: string,
  blur: number,
  hardStop: number,
): HTMLCanvasElement {
  const pad = blur * 2;
  const size = (radius + pad) * 2;
  const offscreen = document.createElement("canvas");
  offscreen.width = size;
  offscreen.height = size;
  const ctx = offscreen.getContext("2d")!;

  const cx = size / 2;
  const cy = size / 2;

  if (blur > 0) ctx.filter = `blur(${blur}px)`;

  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  gradient.addColorStop(0, color);
  gradient.addColorStop(hardStop, color);
  gradient.addColorStop(1, "transparent");

  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();

  return offscreen;
}

export default function GlowingOrbsBackground({
  numOfOrbs,
  orbSizes,
  orbColors,
  orbSpeed,
  orbBlur,
  orbOpacity,
  blendMode = "screen",
  opacity = 1,
  gradientHardStop = 0.4,
  bounceElasticity = 1,
  flingMultiplier = 16,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animRef = useRef<number>(0);
  const orbsRef = useRef<Orb[]>([]);
  const dragRef = useRef<Drag | null>(null);

  const getDocSize = useCallback(() => {
    const docEl = document.documentElement;
    const body = document.body;
    return {
      width: Math.max(docEl.scrollWidth, body.scrollWidth, docEl.clientWidth),
      height: Math.max(
        docEl.scrollHeight,
        body.scrollHeight,
        docEl.clientHeight,
      ),
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    const resize = () => {
      const { width, height } = getDocSize();
      canvas.width = width;
      canvas.height = height;
    };

    resize();
    window.addEventListener("resize", resize);
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(document.body);

    // Evenly distribute initial angles
    const angleStep = (Math.PI * 2) / numOfOrbs;
    const baseAngle = Math.random() * Math.PI * 2;

    const orbs: Orb[] = Array.from({ length: numOfOrbs }).map((_, i) => {
      const radius = (orbSizes[i % orbSizes.length] ?? 200) / 2;
      const speed = orbSpeed[i % orbSpeed.length] ?? 1;
      const blur = orbBlur[i % orbBlur.length] ?? 60;
      const color = orbColors[i % orbColors.length] ?? "#ffffff";
      const orbAlpha = orbOpacity[i % orbOpacity.length] ?? 1;
      const angle = baseAngle + angleStep * i + (Math.random() - 0.5) * 0.6;

      return {
        x: radius + Math.random() * (canvas.width - radius * 2),
        y: radius + Math.random() * (canvas.height - radius * 2),
        dx: Math.cos(angle) * speed,
        dy: Math.sin(angle) * speed,
        radius,
        color,
        blur,
        opacity: orbAlpha,
        mass: radius * radius,
        sprite: createOrbSprite(radius, color, blur, gradientHardStop),
      };
    });

    orbsRef.current = orbs;

    // Separate overlapping orbs
    for (let i = 0; i < orbs.length; i++) {
      for (let j = i + 1; j < orbs.length; j++) {
        separateOrbs(orbs[i], orbs[j]);
      }
    }

    // --- Pointer interaction (drag & fling) ---
    // Listeners go on document so they work even though the canvas is behind other elements.
    function toCanvasCoords(e: PointerEvent) {
      return {
        x: e.pageX,
        y: e.pageY,
      };
    }

    function hitTest(px: number, py: number): Orb | null {
      for (let i = orbs.length - 1; i >= 0; i--) {
        const orb = orbs[i];
        const dx = px - orb.x;
        const dy = py - orb.y;
        if (dx * dx + dy * dy <= orb.radius * orb.radius) return orb;
      }
      return null;
    }

    function onPointerDown(e: PointerEvent) {
      // If the user is clicking an interactive element, let it through
      const target = e.target as HTMLElement | null;
      if (
        target?.closest(
          "a, button, input, textarea, select, label, [role='button'], [role='menu'], [role='menuitem'], [tabindex], .no-orb-grab",
        )
      )
        return;

      const { x, y } = toCanvasCoords(e);
      const orb = hitTest(x, y);
      if (!orb) return;

      e.preventDefault();
      e.stopPropagation();

      (e.target as Element)?.releasePointerCapture?.(e.pointerId);
      document.body.setPointerCapture(e.pointerId);

      dragRef.current = {
        orb,
        offsetX: x - orb.x,
        offsetY: y - orb.y,
        prevX: x,
        prevY: y,
        prevTime: performance.now(),
        velX: 0,
        velY: 0,
      };
      orb.dx = 0;
      orb.dy = 0;
    }

    function onPointerMove(e: PointerEvent) {
      const drag = dragRef.current;
      if (!drag) return;

      e.preventDefault();
      const { x, y } = toCanvasCoords(e);
      const now = performance.now();
      const dt = Math.max(now - drag.prevTime, 1);

      const rawVx = (x - drag.prevX) / dt;
      const rawVy = (y - drag.prevY) / dt;
      drag.velX = drag.velX * 0.6 + rawVx * 0.4;
      drag.velY = drag.velY * 0.6 + rawVy * 0.4;

      drag.prevX = x;
      drag.prevY = y;
      drag.prevTime = now;

      drag.orb.x = x - drag.offsetX;
      drag.orb.y = y - drag.offsetY;
    }

    function onPointerUp(e: PointerEvent) {
      const drag = dragRef.current;
      if (!drag) return;

      document.body.releasePointerCapture(e.pointerId);

      const flingScale = flingMultiplier;
      drag.orb.dx = drag.velX * flingScale;
      drag.orb.dy = drag.velY * flingScale;

      dragRef.current = null;
    }

    // Use capture phase so we intercept before any other handler
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("pointermove", onPointerMove, true);
    document.addEventListener("pointerup", onPointerUp, true);
    document.addEventListener("pointercancel", onPointerUp, true);

    // --- Animation loop ---
    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      const dragged = dragRef.current?.orb ?? null;

      for (let i = 0; i < orbs.length; i++) {
        const orb = orbs[i];
        if (orb === dragged) continue;

        orb.x += orb.dx;
        orb.y += orb.dy;

        if (orb.x - orb.radius < 0) {
          orb.x = orb.radius;
          orb.dx = Math.abs(orb.dx);
        } else if (orb.x + orb.radius > w) {
          orb.x = w - orb.radius;
          orb.dx = -Math.abs(orb.dx);
        }
        if (orb.y - orb.radius < 0) {
          orb.y = orb.radius;
          orb.dy = Math.abs(orb.dy);
        } else if (orb.y + orb.radius > h) {
          orb.y = h - orb.radius;
          orb.dy = -Math.abs(orb.dy);
        }
      }

      for (let i = 0; i < orbs.length; i++) {
        for (let j = i + 1; j < orbs.length; j++) {
          resolveCollision(orbs[i], orbs[j], dragged, bounceElasticity);
        }
      }

      // Draw pre-rendered sprites (no per-frame blur)
      ctx.globalCompositeOperation = blendMode;
      for (const orb of orbs) {
        ctx.globalAlpha = opacity * orb.opacity;
        const s = orb.sprite;
        ctx.drawImage(s, orb.x - s.width / 2, orb.y - s.height / 2);
      }
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
      resizeObserver.disconnect();
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("pointermove", onPointerMove, true);
      document.removeEventListener("pointerup", onPointerUp, true);
      document.removeEventListener("pointercancel", onPointerUp, true);
    };
  }, [
    numOfOrbs,
    orbSizes,
    orbColors,
    orbSpeed,
    orbBlur,
    orbOpacity,
    blendMode,
    opacity,
    gradientHardStop,
    bounceElasticity,
    flingMultiplier,
    getDocSize,
  ]);

  return <canvas ref={canvasRef} className="absolute inset-0 -z-10" />;
}

/** Push two overlapping orbs apart so they no longer intersect. */
function separateOrbs(a: Orb, b: Orb) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  const minDist = a.radius + b.radius;

  if (dist < minDist) {
    const overlap = (minDist - dist) / 2;
    const nx = dx / dist;
    const ny = dy / dist;
    a.x -= nx * overlap;
    a.y -= ny * overlap;
    b.x += nx * overlap;
    b.y += ny * overlap;
  }
}

/** Mass-weighted elastic collision with positional separation. */
function resolveCollision(
  a: Orb,
  b: Orb,
  dragged: Orb | null,
  elasticity: number,
) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  const minDist = a.radius + b.radius;

  if (dist >= minDist) return;

  const nx = dx / dist;
  const ny = dy / dist;
  const overlap = (minDist - dist) / 2;

  // If one orb is being dragged, only push the other one away
  if (a === dragged) {
    b.x += nx * overlap * 2;
    b.y += ny * overlap * 2;
    // Give the free orb a shove
    const push = 2;
    b.dx += nx * push;
    b.dy += ny * push;
    return;
  }
  if (b === dragged) {
    a.x -= nx * overlap * 2;
    a.y -= ny * overlap * 2;
    const push = 2;
    a.dx -= nx * push;
    a.dy -= ny * push;
    return;
  }

  // Normal elastic collision
  a.x -= nx * overlap;
  a.y -= ny * overlap;
  b.x += nx * overlap;
  b.y += ny * overlap;

  const dvx = a.dx - b.dx;
  const dvy = a.dy - b.dy;
  const relVelNormal = dvx * nx + dvy * ny;

  if (relVelNormal < 0) return;

  const totalMass = a.mass + b.mass;
  const impulse = ((1 + elasticity) * relVelNormal) / totalMass;

  a.dx -= impulse * b.mass * nx;
  a.dy -= impulse * b.mass * ny;
  b.dx += impulse * a.mass * nx;
  b.dy += impulse * a.mass * ny;
}
