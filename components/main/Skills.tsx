"use client";
import React, { useState, useRef, useCallback, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useSkills } from "@/hooks/useSkills";

/* ------------------------------------------------------------------ */
/*  Sparkle burst                                                     */
/* ------------------------------------------------------------------ */
type Sparkle = {
  id: number;
  x: number;
  y: number;
  angle: number;
  dist: number;
  size: number;
  color: string;
};

const SPARKLE_COLORS = [
  "#a855f7",
  "#c084fc",
  "#06b6d4",
  "#f0abfc",
  "#facc15",
  "#ffffff",
];

const SparkleParticle = ({ s }: { s: Sparkle }) => (
  <motion.span
    initial={{ opacity: 1, scale: 1, x: 0, y: 0 }}
    animate={{
      opacity: 0,
      scale: 0,
      x: Math.cos(s.angle) * s.dist,
      y: Math.sin(s.angle) * s.dist,
    }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.5, ease: "easeOut" }}
    className="pointer-events-none absolute"
    style={{
      left: s.x - s.size / 2,
      top: s.y - s.size / 2,
      width: s.size,
      height: s.size,
      borderRadius: "50%",
      backgroundColor: s.color,
      boxShadow: `0 0 4px 1px ${s.color}`,
      zIndex: 50,
    }}
  />
);

/* ------------------------------------------------------------------ */
/*  Skill Card (stagger-animated + click spin + sparkle)              */
/* ------------------------------------------------------------------ */
const SPIN_IMPULSE = 600; // degrees/s added per click
const MAX_VELOCITY = 3600; // cap at ~10 rev/s
const FRICTION = 0.97; // multiplied each frame — smooth decel
const STOP_THRESHOLD = 8; // deg/s to snap to rest

const SkillCard = ({ skill, index }: { skill: Skill; index: number }) => {
  const [sparkles, setSparkles] = useState<Sparkle[]>([]);
  const [rotation, setRotation] = useState(0);
  const cardRef = useRef<HTMLLIElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);
  let sparkleId = useRef(0);

  // physics refs (no re-renders)
  const velocity = useRef(0);
  const angle = useRef(0);
  const rafId = useRef<number | null>(null);
  const lastTime = useRef<number | null>(null);

  const tick = useCallback(() => {
    const now = performance.now();
    const dt = lastTime.current ? (now - lastTime.current) / 1000 : 0.016;
    lastTime.current = now;

    // apply friction
    velocity.current *= FRICTION;

    // update angle
    angle.current = (angle.current + velocity.current * dt) % 360;

    // write directly to DOM for 0-lag smoothness
    if (iconRef.current) {
      iconRef.current.style.transform = `rotateY(${angle.current}deg)`;
    }

    if (Math.abs(velocity.current) < STOP_THRESHOLD) {
      velocity.current = 0;
      angle.current = 0;
      if (iconRef.current) {
        iconRef.current.style.transform = `rotateY(0deg)`;
      }
      rafId.current = null;
      lastTime.current = null;
      return; // stop loop
    }

    rafId.current = requestAnimationFrame(tick);
  }, []);

  // clean up on unmount
  useEffect(() => {
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, []);

  const handleClick = (e: React.MouseEvent) => {
    // Sparkle burst at click position relative to card
    const rect = cardRef.current?.getBoundingClientRect();
    if (rect) {
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const count = 8 + Math.floor(Math.random() * 5);
      const newSparkles: Sparkle[] = Array.from({ length: count }, () => {
        sparkleId.current += 1;
        return {
          id: sparkleId.current,
          x: cx,
          y: cy,
          angle: Math.random() * Math.PI * 2,
          dist: 18 + Math.random() * 28,
          size: 3 + Math.random() * 4,
          color:
            SPARKLE_COLORS[Math.floor(Math.random() * SPARKLE_COLORS.length)],
        };
      });
      setSparkles((prev) => [...prev, ...newSparkles]);
      setTimeout(() => {
        setSparkles((prev) => prev.filter((s) => !newSparkles.includes(s)));
      }, 600);
    }

    // add impulse, capped
    velocity.current = Math.min(velocity.current + SPIN_IMPULSE, MAX_VELOCITY);

    // start loop if not running
    if (!rafId.current) {
      lastTime.current = null;
      rafId.current = requestAnimationFrame(tick);
    }
  };

  return (
    <motion.li
      ref={cardRef}
      initial={{ opacity: 0, scale: 0.85, y: 18 }}
      whileInView={{ opacity: 1, scale: 1, y: 0 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{
        duration: 0.35,
        delay: index * 0.04,
        ease: "easeOut",
      }}
      onClick={handleClick}
      className="group relative flex flex-col items-center gap-1.5 rounded-2xl px-5 py-3.5
        bg-white/60 dark:bg-white/[0.06]
        border border-neutral-200/60 dark:border-white/[0.08]
        backdrop-blur-md shadow-sm
        transition-[box-shadow,border-color,background-color] duration-300 ease-out
        hover:shadow-lg hover:shadow-purple-500/10 dark:hover:shadow-purple-400/15
        hover:border-purple-300/50 dark:hover:border-purple-500/30
        hover:bg-white/80 dark:hover:bg-white/[0.1]
        select-none cursor-default overflow-visible"
      whileHover={{ scale: 1.05 }}
    >
      {/* sparkle burst */}
      <AnimatePresence>
        {sparkles.map((s) => (
          <SparkleParticle key={s.id} s={s} />
        ))}
      </AnimatePresence>
      {/* hover glow */}
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300
        bg-gradient-to-br from-purple-400/10 via-transparent to-cyan-400/10 dark:from-purple-400/15 dark:to-cyan-400/15"
      />
      <div ref={iconRef} style={{ perspective: 600, willChange: "transform" }}>
        <Image
          src={skill.url}
          alt={skill.text}
          width={34}
          height={34}
          className="relative z-10 drop-shadow-sm transition-transform duration-300 group-hover:scale-110"
        />
      </div>
      <span
        className="relative z-10 text-[13px] font-medium text-neutral-600 dark:text-neutral-300
        transition-colors duration-300 group-hover:text-neutral-900 dark:group-hover:text-white whitespace-nowrap"
      >
        {skill.text}
      </span>
    </motion.li>
  );
};

/* ------------------------------------------------------------------ */
/*  Skills (main export)                                              */
/* ------------------------------------------------------------------ */
const Skills = () => {
  const skills = useSkills();

  if (!skills || skills.length === 0) return null;

  return (
    <article className="relative flex flex-col items-center w-full mt-20 mb-4">
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="text-center text-4xl md:text-5xl font-extrabold mb-4 tracking-tight bg-gradient-to-r from-white via-white/95 to-white/80 bg-clip-text text-transparent"
      >
        My Skills
      </motion.h2>
      <motion.div
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
        className="h-1 w-24 bg-gradient-to-r from-indigo-500 via-blue-500 to-transparent rounded-full mb-8 origin-center"
      />

      {/* Skills Grid */}
      <ul className="flex flex-wrap justify-center gap-3 w-full max-w-3xl px-4">
        {skills.map((skill, i) => (
          <SkillCard key={skill.$id ?? skill.text} skill={skill} index={i} />
        ))}
      </ul>
    </article>
  );
};

export default Skills;
