"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ═══════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════ */

type ColorKey =
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "blue"
  | "purple"
  | "pink"
  | "teal"
  | "brown"
  | "lime";

interface GameColor {
  main: string;
  light: string;
  dark: string;
}

interface EmojiDef {
  emoji: string;
  name: string;
  colorKey: ColorKey;
}

interface LevelResult {
  stars: number;
  moves: number;
}

type GameView = "levels" | "play";

/* ═══════════════════════════════════════════════════════════
   COLOR PALETTE
   ═══════════════════════════════════════════════════════════ */

const COLORS: Record<ColorKey, GameColor> = {
  red: { main: "#EF4444", light: "#FCA5A5", dark: "#DC2626" },
  orange: { main: "#F97316", light: "#FDBA74", dark: "#EA580C" },
  yellow: { main: "#EAB308", light: "#FDE047", dark: "#CA8A04" },
  green: { main: "#22C55E", light: "#86EFAC", dark: "#16A34A" },
  blue: { main: "#3B82F6", light: "#93C5FD", dark: "#2563EB" },
  purple: { main: "#8B5CF6", light: "#C4B5FD", dark: "#7C3AED" },
  pink: { main: "#EC4899", light: "#F9A8D4", dark: "#DB2777" },
  teal: { main: "#14B8A6", light: "#5EEAD4", dark: "#0D9488" },
  brown: { main: "#A16207", light: "#D4A847", dark: "#854D0E" },
  lime: { main: "#84CC16", light: "#BEF264", dark: "#65A30D" },
};

const ALL_COLOR_KEYS: ColorKey[] = [
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "pink",
  "teal",
  "brown",
  "lime",
];

const colorLookup: Record<string, GameColor & { key: ColorKey }> = {};
for (const k of ALL_COLOR_KEYS) {
  colorLookup[COLORS[k].main] = { ...COLORS[k], key: k };
}

/* ═══════════════════════════════════════════════════════════
   EMOJI CATALOG  (30 levels)
   ═══════════════════════════════════════════════════════════ */

const EMOJIS: EmojiDef[] = [
  // ── Fruits ──
  { emoji: "🍎", name: "Apple", colorKey: "red" },
  { emoji: "🍊", name: "Orange", colorKey: "orange" },
  { emoji: "🍋", name: "Lemon", colorKey: "yellow" },
  { emoji: "🥝", name: "Kiwi", colorKey: "green" },
  { emoji: "🫐", name: "Blueberry", colorKey: "blue" },
  { emoji: "🍇", name: "Grape", colorKey: "purple" },
  { emoji: "🍑", name: "Peach", colorKey: "pink" },
  { emoji: "🍓", name: "Strawberry", colorKey: "red" },
  { emoji: "🍌", name: "Banana", colorKey: "yellow" },
  { emoji: "🍉", name: "Watermelon", colorKey: "green" },
  { emoji: "🍒", name: "Cherry", colorKey: "red" },
  { emoji: "🥭", name: "Mango", colorKey: "orange" },
  { emoji: "🍐", name: "Pear", colorKey: "lime" },
  { emoji: "🍈", name: "Melon", colorKey: "green" },
  { emoji: "🍍", name: "Pineapple", colorKey: "yellow" },
  { emoji: "🥥", name: "Coconut", colorKey: "brown" },
  { emoji: "🫒", name: "Olive", colorKey: "green" },
  { emoji: "🍏", name: "Green Apple", colorKey: "lime" },
  // ── Vegetables ──
  { emoji: "🥕", name: "Carrot", colorKey: "orange" },
  { emoji: "🍆", name: "Eggplant", colorKey: "purple" },
  { emoji: "🥑", name: "Avocado", colorKey: "green" },
  { emoji: "🌽", name: "Corn", colorKey: "yellow" },
  { emoji: "🍅", name: "Tomato", colorKey: "red" },
  { emoji: "🫑", name: "Pepper", colorKey: "green" },
  { emoji: "🥦", name: "Broccoli", colorKey: "green" },
  { emoji: "🥬", name: "Lettuce", colorKey: "lime" },
  { emoji: "🌶️", name: "Hot Pepper", colorKey: "red" },
  { emoji: "🧅", name: "Onion", colorKey: "brown" },
  { emoji: "🥔", name: "Potato", colorKey: "brown" },
  { emoji: "🍠", name: "Sweet Potato", colorKey: "orange" },
  { emoji: "🧄", name: "Garlic", colorKey: "teal" },
  { emoji: "🥒", name: "Cucumber", colorKey: "green" },
  // ── Sports ──
  { emoji: "🏀", name: "Basketball", colorKey: "orange" },
  { emoji: "🏈", name: "Football", colorKey: "brown" },
  { emoji: "🎾", name: "Tennis Ball", colorKey: "lime" },
  { emoji: "⚽", name: "Soccer Ball", colorKey: "teal" },
  { emoji: "🏐", name: "Volleyball", colorKey: "yellow" },
  { emoji: "🥎", name: "Softball", colorKey: "yellow" },
  { emoji: "🏓", name: "Ping Pong", colorKey: "red" },
  { emoji: "🥊", name: "Boxing Glove", colorKey: "red" },
  { emoji: "🎳", name: "Bowling", colorKey: "red" },
  { emoji: "🏒", name: "Hockey", colorKey: "blue" },
  // ── Hearts ──
  { emoji: "❤️", name: "Red Heart", colorKey: "red" },
  { emoji: "🧡", name: "Orange Heart", colorKey: "orange" },
  { emoji: "💛", name: "Yellow Heart", colorKey: "yellow" },
  { emoji: "💚", name: "Green Heart", colorKey: "green" },
  { emoji: "💙", name: "Blue Heart", colorKey: "blue" },
  { emoji: "💜", name: "Purple Heart", colorKey: "purple" },
  { emoji: "🩷", name: "Pink Heart", colorKey: "pink" },
  { emoji: "🤎", name: "Brown Heart", colorKey: "brown" },
  { emoji: "💗", name: "Growing Heart", colorKey: "pink" },
  { emoji: "💖", name: "Sparkling Heart", colorKey: "pink" },
  // ── Animals ──
  { emoji: "🐸", name: "Frog", colorKey: "green" },
  { emoji: "🦊", name: "Fox", colorKey: "orange" },
  { emoji: "🐙", name: "Octopus", colorKey: "red" },
  { emoji: "🦋", name: "Butterfly", colorKey: "blue" },
  { emoji: "🐳", name: "Whale", colorKey: "blue" },
  { emoji: "🦜", name: "Parrot", colorKey: "green" },
  { emoji: "🐥", name: "Chick", colorKey: "yellow" },
  { emoji: "🦩", name: "Flamingo", colorKey: "pink" },
  { emoji: "🐷", name: "Pig", colorKey: "pink" },
  { emoji: "🐻", name: "Bear", colorKey: "brown" },
  { emoji: "🐢", name: "Turtle", colorKey: "green" },
  { emoji: "🦎", name: "Lizard", colorKey: "lime" },
  { emoji: "🐍", name: "Snake", colorKey: "green" },
  { emoji: "🦀", name: "Crab", colorKey: "red" },
  { emoji: "🐠", name: "Tropical Fish", colorKey: "blue" },
  { emoji: "🐊", name: "Crocodile", colorKey: "green" },
  { emoji: "🦚", name: "Peacock", colorKey: "teal" },
  { emoji: "🐝", name: "Bee", colorKey: "yellow" },
  { emoji: "🐞", name: "Ladybug", colorKey: "red" },
  { emoji: "🦐", name: "Shrimp", colorKey: "orange" },
  // ── Nature ──
  { emoji: "🌹", name: "Rose", colorKey: "red" },
  { emoji: "🌻", name: "Sunflower", colorKey: "yellow" },
  { emoji: "🌸", name: "Cherry Blossom", colorKey: "pink" },
  { emoji: "🌺", name: "Hibiscus", colorKey: "pink" },
  { emoji: "🍀", name: "Clover", colorKey: "green" },
  { emoji: "🌲", name: "Pine", colorKey: "green" },
  { emoji: "🌵", name: "Cactus", colorKey: "green" },
  { emoji: "🍁", name: "Maple Leaf", colorKey: "red" },
  { emoji: "🍂", name: "Fallen Leaf", colorKey: "brown" },
  { emoji: "🌿", name: "Herb", colorKey: "green" },
  { emoji: "💐", name: "Bouquet", colorKey: "pink" },
  { emoji: "🌷", name: "Tulip", colorKey: "red" },
  { emoji: "🪻", name: "Lavender", colorKey: "purple" },
  // ── Food & Drink ──
  { emoji: "🧁", name: "Cupcake", colorKey: "pink" },
  { emoji: "🍩", name: "Donut", colorKey: "brown" },
  { emoji: "🍪", name: "Cookie", colorKey: "brown" },
  { emoji: "🍫", name: "Chocolate", colorKey: "brown" },
  { emoji: "🍬", name: "Candy", colorKey: "red" },
  { emoji: "🍭", name: "Lollipop", colorKey: "pink" },
  { emoji: "🧃", name: "Juice Box", colorKey: "orange" },
  { emoji: "☕", name: "Coffee", colorKey: "brown" },
  { emoji: "🍵", name: "Tea", colorKey: "green" },
  { emoji: "🍷", name: "Wine", colorKey: "red" },
  { emoji: "🍺", name: "Beer", colorKey: "yellow" },
  { emoji: "🥤", name: "Soda", colorKey: "red" },
  { emoji: "🧊", name: "Ice Cube", colorKey: "blue" },
  // ── Objects ──
  { emoji: "🎱", name: "8-Ball", colorKey: "purple" },
  { emoji: "🔮", name: "Crystal Ball", colorKey: "purple" },
  { emoji: "💎", name: "Gem", colorKey: "blue" },
  { emoji: "🎨", name: "Palette", colorKey: "red" },
  { emoji: "🧲", name: "Magnet", colorKey: "red" },
  { emoji: "🪁", name: "Kite", colorKey: "orange" },
  { emoji: "🎯", name: "Bullseye", colorKey: "red" },
  { emoji: "🎪", name: "Circus", colorKey: "red" },
  { emoji: "🎸", name: "Guitar", colorKey: "brown" },
  { emoji: "🥁", name: "Drum", colorKey: "red" },
  { emoji: "📕", name: "Red Book", colorKey: "red" },
  { emoji: "📗", name: "Green Book", colorKey: "green" },
  { emoji: "📘", name: "Blue Book", colorKey: "blue" },
  { emoji: "📙", name: "Orange Book", colorKey: "orange" },
  { emoji: "🧸", name: "Teddy Bear", colorKey: "brown" },
  { emoji: "🎀", name: "Ribbon", colorKey: "pink" },
  { emoji: "🪄", name: "Magic Wand", colorKey: "purple" },
  { emoji: "🔑", name: "Key", colorKey: "yellow" },
  { emoji: "👑", name: "Crown", colorKey: "yellow" },
  { emoji: "💰", name: "Money Bag", colorKey: "yellow" },
  // ── Space & Weather ──
  { emoji: "🌙", name: "Moon", colorKey: "yellow" },
  { emoji: "⭐", name: "Star", colorKey: "yellow" },
  { emoji: "☀️", name: "Sun", colorKey: "orange" },
  { emoji: "🌈", name: "Rainbow", colorKey: "red" },
  { emoji: "❄️", name: "Snowflake", colorKey: "blue" },
  { emoji: "🔥", name: "Fire", colorKey: "orange" },
  { emoji: "💧", name: "Water Drop", colorKey: "blue" },
  { emoji: "🌊", name: "Wave", colorKey: "blue" },
  // ── Circles & Shapes ──
  { emoji: "🔴", name: "Red Circle", colorKey: "red" },
  { emoji: "🟠", name: "Orange Circle", colorKey: "orange" },
  { emoji: "🟡", name: "Yellow Circle", colorKey: "yellow" },
  { emoji: "🟢", name: "Green Circle", colorKey: "green" },
  { emoji: "🔵", name: "Blue Circle", colorKey: "blue" },
  { emoji: "🟣", name: "Purple Circle", colorKey: "purple" },
  { emoji: "🟤", name: "Brown Circle", colorKey: "brown" },
  // ── Gems & Sparkles ──
  { emoji: "✨", name: "Sparkles", colorKey: "yellow" },
  { emoji: "💫", name: "Dizzy Star", colorKey: "yellow" },
  { emoji: "🌟", name: "Glowing Star", colorKey: "yellow" },
  { emoji: "💥", name: "Boom", colorKey: "orange" },
  // ── Clothing ──
  { emoji: "👟", name: "Sneaker", colorKey: "blue" },
  { emoji: "👗", name: "Dress", colorKey: "purple" },
  { emoji: "🧢", name: "Cap", colorKey: "blue" },
  { emoji: "👜", name: "Handbag", colorKey: "pink" },
  { emoji: "🎩", name: "Top Hat", colorKey: "purple" },
  // ── Vehicles ──
  { emoji: "🚗", name: "Red Car", colorKey: "red" },
  { emoji: "🚕", name: "Taxi", colorKey: "yellow" },
  { emoji: "🚙", name: "SUV", colorKey: "blue" },
  { emoji: "🏎️", name: "Race Car", colorKey: "red" },
  { emoji: "🚜", name: "Tractor", colorKey: "green" },
  { emoji: "🚂", name: "Train", colorKey: "red" },
  { emoji: "✈️", name: "Airplane", colorKey: "blue" },
  { emoji: "🚀", name: "Rocket", colorKey: "orange" },
  // ── Misc ──
  { emoji: "🎃", name: "Pumpkin", colorKey: "orange" },
  { emoji: "🍄", name: "Mushroom", colorKey: "red" },
  { emoji: "🪸", name: "Coral", colorKey: "pink" },
  { emoji: "🫧", name: "Bubbles", colorKey: "blue" },
  { emoji: "🧿", name: "Evil Eye", colorKey: "blue" },
  { emoji: "🪩", name: "Disco Ball", colorKey: "purple" },
  { emoji: "🎄", name: "Christmas Tree", colorKey: "green" },
  { emoji: "🎁", name: "Gift", colorKey: "red" },
  { emoji: "🎈", name: "Balloon", colorKey: "red" },
  { emoji: "🎏", name: "Carp Streamer", colorKey: "blue" },
  { emoji: "🏆", name: "Trophy", colorKey: "yellow" },
  { emoji: "🥇", name: "Gold Medal", colorKey: "yellow" },
  { emoji: "🧪", name: "Test Tube", colorKey: "green" },
  { emoji: "🩸", name: "Blood Drop", colorKey: "red" },
  { emoji: "🫀", name: "Heart Organ", colorKey: "red" },
  { emoji: "🧠", name: "Brain", colorKey: "pink" },
  { emoji: "👁️", name: "Eye", colorKey: "blue" },
  { emoji: "👅", name: "Tongue", colorKey: "pink" },
  { emoji: "🦷", name: "Tooth", colorKey: "teal" },
  { emoji: "🍄‍🟫", name: "Brown Mushroom", colorKey: "brown" },
  { emoji: "🪨", name: "Rock", colorKey: "brown" },
  { emoji: "🧊", name: "Ice", colorKey: "teal" },
  { emoji: "🛟", name: "Life Ring", colorKey: "orange" },
  { emoji: "⛱️", name: "Beach Umbrella", colorKey: "yellow" },
  { emoji: "🎣", name: "Fishing Rod", colorKey: "blue" },
  { emoji: "🪂", name: "Parachute", colorKey: "orange" },
  { emoji: "⚡", name: "Lightning", colorKey: "yellow" },
  { emoji: "🌀", name: "Cyclone", colorKey: "teal" },
  { emoji: "🫶", name: "Heart Hands", colorKey: "yellow" },
  { emoji: "🤙", name: "Call Me", colorKey: "yellow" },
  { emoji: "🦑", name: "Squid", colorKey: "orange" },
  { emoji: "🐡", name: "Pufferfish", colorKey: "yellow" },
  { emoji: "🐬", name: "Dolphin", colorKey: "blue" },
  { emoji: "🦈", name: "Shark", colorKey: "blue" },
  { emoji: "🐋", name: "Humpback Whale", colorKey: "blue" },
  { emoji: "🪼", name: "Jellyfish", colorKey: "purple" },
  { emoji: "🐛", name: "Bug", colorKey: "green" },
  { emoji: "🦗", name: "Cricket", colorKey: "green" },
  { emoji: "🪲", name: "Beetle", colorKey: "green" },
  { emoji: "🌾", name: "Rice Plant", colorKey: "yellow" },
  { emoji: "☘️", name: "Shamrock", colorKey: "green" },
  { emoji: "🪷", name: "Lotus", colorKey: "pink" },
  { emoji: "🫐", name: "Blueberries", colorKey: "blue" },
  { emoji: "🥚", name: "Egg", colorKey: "teal" },
  { emoji: "🧈", name: "Butter", colorKey: "yellow" },
  { emoji: "🥐", name: "Croissant", colorKey: "brown" },
  { emoji: "🥨", name: "Pretzel", colorKey: "brown" },
];

const TOTAL_LEVELS = 200;

/* ═══════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════ */

const TUBE_CAPACITY = 4;
const LAYER_H = 40;
const TUBE_W = 56;
const TUBE_PAD = 16;
const TUBE_H = TUBE_CAPACITY * LAYER_H + TUBE_PAD;
const CENTER_SIZE = 160;
const LS_KEY = "water-sort-progress";

/* ═══════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════ */

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function deepClone(tubes: string[][]): string[][] {
  return tubes.map((t) => [...t]);
}

function topColor(tube: string[]): string | null {
  return tube.length > 0 ? tube[tube.length - 1] : null;
}

/** Star rating based on moves vs estimated optimal */
function calcStars(moves: number, numColors: number): number {
  const optimal = numColors * 3;
  if (moves <= optimal) return 3;
  if (moves <= optimal * 1.8) return 2;
  return 1;
}

function loadProgress(): Record<number, LevelResult> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveProgress(progress: Record<number, LevelResult>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(progress));
  } catch {
    /* noop */
  }
}

/* ═══════════════════════════════════════════════════════════
   LEVEL GENERATION — true Fisher-Yates shuffle for mixed tubes
   ═══════════════════════════════════════════════════════════ */

function generateLevel(idx: number) {
  const ed = EMOJIS[idx % EMOJIS.length];
  const target = COLORS[ed.colorKey].main;

  // Number of distinct colours scales with level
  const numColors = Math.min(4 + Math.floor(idx / 5), ALL_COLOR_KEYS.length);
  const distractors = shuffle(ALL_COLOR_KEYS.filter((k) => k !== ed.colorKey))
    .slice(0, numColors - 1)
    .map((k) => COLORS[k].main);

  const allColors = [target, ...distractors];

  // Flat pool: TUBE_CAPACITY of each colour
  const pool: string[] = [];
  for (const c of allColors) {
    for (let i = 0; i < TUBE_CAPACITY; i++) pool.push(c);
  }

  // Fisher-Yates shuffle for genuinely mixed tubes
  const shuffled = shuffle(pool);

  // Distribute into tubes
  const numTubes = allColors.length;
  let tubes: string[][] = [];
  for (let t = 0; t < numTubes; t++) {
    tubes.push(shuffled.slice(t * TUBE_CAPACITY, (t + 1) * TUBE_CAPACITY));
  }

  // Add 2 empty tubes for manoeuvring
  tubes.push([], []);

  // Guard against trivially-solved (all target on top)
  let topTargetCount = 0;
  for (const t of tubes) {
    if (topColor(t) === target) topTargetCount++;
  }
  if (topTargetCount >= TUBE_CAPACITY) {
    const nonEmpty = tubes.filter((t) => t.length > 0);
    const flatAgain: string[] = [];
    for (const t of nonEmpty) flatAgain.push(...t);
    const reshuffled = shuffle(flatAgain);
    for (let t = 0; t < nonEmpty.length; t++) {
      tubes[t] = reshuffled.slice(t * TUBE_CAPACITY, (t + 1) * TUBE_CAPACITY);
    }
  }

  tubes = shuffle(tubes);

  return { tubes, target, emoji: ed.emoji, name: ed.name, numColors };
}

/* ═══════════════════════════════════════════════════════════
   SUB-COMPONENT — Glass Tube
   ═══════════════════════════════════════════════════════════ */

interface TubeProps {
  colors: string[];
  isSelected: boolean;
  isValidTarget: boolean;
  dimmed: boolean;
  onClick: () => void;
  idx: number;
}

function GlassTube({
  colors,
  isSelected,
  isValidTarget,
  dimmed,
  onClick,
  idx,
}: TubeProps) {
  const borderColor = isSelected
    ? "rgba(255,255,255,0.45)"
    : isValidTarget
      ? "rgba(134,239,172,0.45)"
      : "rgba(255,255,255,0.15)";

  return (
    <motion.button
      aria-label={`Tube ${idx + 1}`}
      className="relative select-none focus:outline-none"
      style={{
        width: TUBE_W,
        height: TUBE_H,
        opacity: dimmed ? 0.4 : 1,
        transition: "opacity 0.2s",
      }}
      onClick={onClick}
      whileHover={{ scale: 1.06, y: -5 }}
      whileTap={{ scale: 0.96 }}
      animate={{
        y: isSelected ? -18 : 0,
        scale: isSelected ? 1.1 : 1,
      }}
      transition={{ type: "spring", stiffness: 420, damping: 26 }}
    >
      {isSelected && (
        <motion.div
          className="absolute -inset-4 rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(255,255,255,0.18) 0%, transparent 70%)",
            filter: "blur(10px)",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        />
      )}

      {isValidTarget && !isSelected && (
        <motion.div
          className="absolute -inset-1 rounded-full pointer-events-none"
          style={{
            border: "2px solid rgba(134,239,172,0.35)",
            borderBottomLeftRadius: TUBE_W / 2,
            borderBottomRightRadius: TUBE_W / 2,
          }}
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 1.4, repeat: Infinity }}
        />
      )}

      {/* glass body */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{
          borderLeft: `2px solid ${borderColor}`,
          borderRight: `2px solid ${borderColor}`,
          borderBottom: `2px solid ${borderColor}`,
          borderBottomLeftRadius: TUBE_W / 2,
          borderBottomRightRadius: TUBE_W / 2,
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)",
          boxShadow: isSelected
            ? "0 0 24px rgba(255,255,255,0.15), inset 0 0 20px rgba(255,255,255,0.04)"
            : "inset 0 0 16px rgba(255,255,255,0.02), 0 8px 32px rgba(0,0,0,0.25)",
          transition: "border-color 0.25s, box-shadow 0.25s",
        }}
      >
        <div
          className="absolute pointer-events-none"
          style={{
            left: 5,
            top: "12%",
            width: 4,
            height: "55%",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.35) 0%, transparent 100%)",
            borderRadius: 999,
          }}
        />

        <div
          className="absolute bottom-0 left-0 right-0 flex flex-col-reverse overflow-hidden"
          style={{
            borderBottomLeftRadius: TUBE_W / 2 - 2,
            borderBottomRightRadius: TUBE_W / 2 - 2,
          }}
        >
          <AnimatePresence mode="popLayout">
            {colors.map((color, i) => {
              const info = colorLookup[color];
              const isTop = i === colors.length - 1;
              const isBottom = i === 0;
              return (
                <motion.div
                  key={`${idx}-${i}-${color}`}
                  initial={{ scaleY: 0, opacity: 0 }}
                  animate={{ scaleY: 1, opacity: 1 }}
                  exit={{ scaleY: 0, opacity: 0 }}
                  transition={{
                    type: "spring",
                    stiffness: 380,
                    damping: 28,
                  }}
                  style={{
                    height: LAYER_H,
                    transformOrigin: "bottom",
                    background: `linear-gradient(90deg, ${
                      info?.light ?? color
                    }30 0%, ${color} 22%, ${color} 78%, ${
                      info?.dark ?? color
                    } 100%)`,
                    borderTop: isTop
                      ? "2px solid rgba(255,255,255,0.18)"
                      : "1px solid rgba(255,255,255,0.06)",
                    ...(isTop
                      ? {
                          borderTopLeftRadius: 5,
                          borderTopRightRadius: 5,
                          boxShadow: "inset 0 2px 6px rgba(255,255,255,0.12)",
                        }
                      : {}),
                    ...(isBottom
                      ? {
                          borderBottomLeftRadius: TUBE_W / 2 - 4,
                          borderBottomRightRadius: TUBE_W / 2 - 4,
                        }
                      : {}),
                  }}
                />
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      <div
        className="absolute -left-[3px] -right-[3px] -top-[3px] h-[10px] pointer-events-none"
        style={{
          borderLeft: `3px solid ${borderColor}`,
          borderRight: `3px solid ${borderColor}`,
          borderTop: `2px solid ${borderColor}`,
          borderTopLeftRadius: 5,
          borderTopRightRadius: 5,
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.07) 0%, transparent 100%)",
          transition: "border-color 0.25s",
        }}
      />
    </motion.button>
  );
}

/* ═══════════════════════════════════════════════════════════
   SUB-COMPONENT — Center Emoji Container
   ═══════════════════════════════════════════════════════════ */

interface CenterProps {
  emoji: string;
  fillPct: number;
  targetColor: string;
  onClick: () => void;
  canReceive: boolean;
  isComplete: boolean;
}

function CenterEmoji({
  emoji,
  fillPct,
  targetColor,
  onClick,
  canReceive,
  isComplete,
}: CenterProps) {
  const info = colorLookup[targetColor];
  const glow = canReceive ? targetColor + "66" : targetColor + "22";

  // Jar dimensions
  const jarW = CENTER_SIZE;
  const jarH = CENTER_SIZE + 36;
  const bodyTop = 36; // where jar body starts (below neck)
  const neckW = jarW * 0.42;
  const neckH = 30;
  const lidW = neckW + 16;
  const lidH = 12;
  const bodyH = jarH - bodyTop;

  return (
    <motion.button
      aria-label="Center container"
      className="relative select-none focus:outline-none"
      style={{ width: jarW, height: jarH }}
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.96 }}
      animate={isComplete ? { scale: [1, 1.12, 1], rotate: [0, -4, 4, 0] } : {}}
      transition={
        isComplete
          ? { duration: 0.7, repeat: 2, ease: "easeInOut" }
          : { type: "spring", stiffness: 300, damping: 24 }
      }
    >
      {/* ambient glow */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          left: -24,
          right: -24,
          top: bodyTop - 24,
          bottom: -24,
          borderRadius: 40,
          background: `radial-gradient(circle, ${glow} 0%, transparent 70%)`,
          filter: "blur(18px)",
        }}
        animate={{ opacity: canReceive ? [0.5, 1, 0.5] : 0.35 }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* ── LID ── */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: (jarW - lidW) / 2,
          top: 0,
          width: lidW,
          height: lidH,
          borderRadius: "6px 6px 2px 2px",
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.10) 50%, rgba(255,255,255,0.06) 100%)",
          border: "1.5px solid rgba(255,255,255,0.20)",
          boxShadow:
            "0 2px 8px rgba(0,0,0,0.25), inset 0 1px 2px rgba(255,255,255,0.15)",
        }}
      />

      {/* ── NECK ── */}
      <div
        className="absolute pointer-events-none overflow-hidden"
        style={{
          left: (jarW - neckW) / 2,
          top: lidH - 1,
          width: neckW,
          height: neckH,
          borderLeft: "2px solid rgba(255,255,255,0.18)",
          borderRight: "2px solid rgba(255,255,255,0.18)",
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)",
        }}
      >
        {/* neck glass highlight */}
        <div
          className="absolute"
          style={{
            left: 3,
            top: 2,
            width: 3,
            height: "80%",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.30) 0%, transparent 100%)",
            borderRadius: 999,
          }}
        />
        {/* liquid in neck (only visible when nearly full) */}
        {fillPct > 0.85 && (
          <motion.div
            className="absolute bottom-0 left-0 right-0"
            animate={{
              height: `${Math.min(100, ((fillPct - 0.85) / 0.15) * 100)}%`,
            }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
            style={{
              background: `linear-gradient(0deg, ${info?.dark ?? targetColor} 0%, ${targetColor} 100%)`,
              opacity: 0.85,
            }}
          />
        )}
      </div>

      {/* ── SHOULDER (connects neck to body) ── */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: (jarW - neckW) / 2 - (jarW - 8 - neckW) / 2,
          top: bodyTop - 8,
          width: jarW - 8,
          height: 16,
          borderTopLeftRadius: 6,
          borderTopRightRadius: 6,
          borderLeft: "2px solid rgba(255,255,255,0.16)",
          borderRight: "2px solid rgba(255,255,255,0.16)",
          borderTop: "2px solid rgba(255,255,255,0.14)",
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)",
          clipPath: `polygon(${((jarW - 8 - neckW) / 2 / (jarW - 8)) * 100}% 0%, ${(1 - (jarW - 8 - neckW) / 2 / (jarW - 8)) * 100}% 0%, 100% 100%, 0% 100%)`,
        }}
      />

      {/* ── JAR BODY (glass) ── */}
      <div
        className="absolute overflow-hidden"
        style={{
          left: 4,
          top: bodyTop,
          width: jarW - 8,
          height: bodyH,
          borderLeft: `2.5px solid ${canReceive ? targetColor + "55" : "rgba(255,255,255,0.16)"}`,
          borderRight: `2.5px solid ${canReceive ? targetColor + "55" : "rgba(255,255,255,0.16)"}`,
          borderBottom: `2.5px solid ${canReceive ? targetColor + "55" : "rgba(255,255,255,0.16)"}`,
          borderBottomLeftRadius: 20,
          borderBottomRightRadius: 20,
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.015) 60%, rgba(255,255,255,0.02) 100%)",
          backdropFilter: "blur(6px)",
          boxShadow: `inset 0 0 30px rgba(255,255,255,0.02), 0 12px 40px rgba(0,0,0,0.3), 0 0 30px ${targetColor}10`,
          transition: "border-color 0.3s",
        }}
      >
        {/* left glass reflection stripe */}
        <div
          className="absolute pointer-events-none"
          style={{
            left: 6,
            top: "8%",
            width: 5,
            height: "65%",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.08) 50%, transparent 100%)",
            borderRadius: 999,
          }}
        />

        {/* right faint reflection */}
        <div
          className="absolute pointer-events-none"
          style={{
            right: 8,
            top: "15%",
            width: 3,
            height: "40%",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.12) 0%, transparent 100%)",
            borderRadius: 999,
          }}
        />

        {/* curved bottom highlight */}
        <div
          className="absolute pointer-events-none"
          style={{
            left: "15%",
            right: "15%",
            bottom: 4,
            height: 10,
            background:
              "radial-gradient(ellipse, rgba(255,255,255,0.08) 0%, transparent 70%)",
            borderRadius: 999,
          }}
        />

        {/* ── LIQUID FILL ── */}
        <motion.div
          className="absolute bottom-0 left-0 right-0"
          animate={{ height: `${(Math.min(fillPct, 0.88) / 0.88) * 100}%` }}
          transition={{ type: "spring", stiffness: 110, damping: 22 }}
          style={{
            background: `linear-gradient(0deg, ${info?.dark ?? targetColor} 0%, ${targetColor} 45%, ${info?.light ?? targetColor}99 100%)`,
            borderBottomLeftRadius: 18,
            borderBottomRightRadius: 18,
          }}
        >
          {/* liquid surface wave */}
          {fillPct > 0 && fillPct < 1 && (
            <motion.div
              className="absolute -top-[6px] left-0 right-0 h-3 pointer-events-none"
              style={{
                background: `radial-gradient(ellipse at 50% 100%, ${info?.light ?? targetColor}66 0%, transparent 70%)`,
              }}
              animate={{ y: [0, -3, 0] }}
              transition={{
                duration: 1.8,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          )}

          {/* liquid inner glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(ellipse at 30% 40%, ${info?.light ?? targetColor}20 0%, transparent 60%)`,
            }}
          />
        </motion.div>

        {/* ── EMOJI (inside jar) ── */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ top: -4 }}
        >
          <span
            className="absolute text-7xl"
            style={{
              filter: "grayscale(1) brightness(0.40)",
              opacity: 1 - fillPct,
              fontFamily:
                "var(--font-emoji, 'Noto Color Emoji', 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif)",
              transition: "opacity 0.4s",
            }}
          >
            {emoji}
          </span>
          <span
            className="absolute text-7xl"
            style={{
              clipPath: `inset(${(1 - fillPct) * 100}% 0 0 0)`,
              fontFamily:
                "var(--font-emoji, 'Noto Color Emoji', 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif)",
              transition: "clip-path 0.5s ease-out",
            }}
          >
            {emoji}
          </span>
        </div>

        {/* glass overlay sheen (on top of everything) */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.07) 0%, transparent 40%, transparent 60%, rgba(255,255,255,0.03) 100%)",
          }}
        />
      </div>

      {/* ── PERCENTAGE ── */}
      <div className="absolute -bottom-7 left-0 right-0 text-center pointer-events-none">
        <span className="text-[11px] font-mono text-white/40 tracking-wider">
          {Math.round(fillPct * 100)}%
        </span>
      </div>
    </motion.button>
  );
}

/* ═══════════════════════════════════════════════════════════
   SUB-COMPONENT — Star Display (animated for win screen)
   ═══════════════════════════════════════════════════════════ */

function Stars({ count, size = 16 }: { count: number; size?: number }) {
  return (
    <div className="flex gap-1 justify-center">
      {[1, 2, 3].map((s) => (
        <motion.span
          key={s}
          style={{ fontSize: size, lineHeight: 1 }}
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{
            delay: s * 0.12,
            type: "spring",
            stiffness: 400,
            damping: 18,
          }}
        >
          {s <= count ? "⭐" : "✩"}
        </motion.span>
      ))}
    </div>
  );
}

function StarsStatic({ count, size = 14 }: { count: number; size?: number }) {
  return (
    <div className="flex gap-[1px] justify-center">
      {[1, 2, 3].map((s) => (
        <span
          key={s}
          style={{ fontSize: size, lineHeight: 1 }}
          className={s <= count ? "" : "opacity-20"}
        >
          {s <= count ? "⭐" : "☆"}
        </span>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SUB-COMPONENT — Celebration Particles
   ═══════════════════════════════════════════════════════════ */

function CelebrationParticles({
  color,
  active,
}: {
  color: string;
  active: boolean;
}) {
  const particles = useMemo(
    () =>
      Array.from({ length: 48 }, (_, i) => ({
        id: i,
        x: (Math.random() - 0.5) * 700,
        y: (Math.random() - 0.5) * 700,
        size: Math.random() * 10 + 4,
        delay: Math.random() * 0.5,
        rot: Math.random() * 720 - 360,
        c:
          i % 4 === 0
            ? color
            : i % 4 === 1
              ? "#FFD700"
              : i % 4 === 2
                ? "#FFFFFF"
                : "#EC4899",
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [active],
  );

  if (!active) return null;
  return (
    <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-sm"
          style={{
            width: p.size,
            height: p.size,
            background: p.c,
            boxShadow: `0 0 8px ${p.c}88`,
          }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 0, rotate: 0 }}
          animate={{
            x: p.x,
            y: p.y,
            opacity: [1, 1, 0],
            scale: [0, 1.6, 0.4],
            rotate: p.rot,
          }}
          transition={{ duration: 1.6, delay: p.delay, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SUB-COMPONENT — Floating Background Orbs
   ═══════════════════════════════════════════════════════════ */

function BackgroundOrbs() {
  const orbs = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 180 + 80,
        dur: Math.random() * 25 + 18,
        color: ["#8B5CF6", "#EC4899", "#3B82F6", "#22C55E", "#F97316"][i % 5],
      })),
    [],
  );

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {orbs.map((o) => (
        <motion.div
          key={o.id}
          className="absolute rounded-full"
          style={{
            left: `${o.x}%`,
            top: `${o.y}%`,
            width: o.size,
            height: o.size,
            background: `radial-gradient(circle, ${o.color}0D 0%, transparent 70%)`,
          }}
          animate={{ x: [0, 35, -25, 0], y: [0, -40, 25, 0] }}
          transition={{ duration: o.dur, repeat: Infinity, ease: "linear" }}
        />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SUB-COMPONENT — Level Select Grid
   ═══════════════════════════════════════════════════════════ */

const LEVELS_PER_PAGE = 30;
const TOTAL_PAGES = Math.ceil(TOTAL_LEVELS / LEVELS_PER_PAGE);

function LevelGrid({
  progress,
  onSelect,
}: {
  progress: Record<number, LevelResult>;
  onSelect: (level: number) => void;
}) {
  const [page, setPage] = useState(0);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = backward

  const isUnlocked = (idx: number) => {
    if (idx === 0) return true;
    return !!progress[idx - 1];
  };

  const totalStars = Object.values(progress).reduce((s, r) => s + r.stars, 0);

  const startIdx = page * LEVELS_PER_PAGE;
  const endIdx = Math.min(startIdx + LEVELS_PER_PAGE, TOTAL_LEVELS);
  const pageLevels = Array.from(
    { length: endIdx - startIdx },
    (_, i) => startIdx + i,
  );

  const goNext = () => {
    if (page < TOTAL_PAGES - 1) {
      setDirection(1);
      setPage((p) => p + 1);
    }
  };
  const goPrev = () => {
    if (page > 0) {
      setDirection(-1);
      setPage((p) => p - 1);
    }
  };

  return (
    <motion.div
      className="relative z-10 w-full max-w-2xl mx-auto flex flex-col h-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-purple-400 via-pink-400 to-amber-400 bg-clip-text text-transparent text-center mb-1">
        Color Pour
      </h1>
      <p className="text-white/35 text-xs text-center mb-3">
        Select a level to play
      </p>

      <div className="flex items-center justify-center gap-4 mb-3">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/10">
          <span className="text-white/30 text-xs font-medium">Total Stars</span>
          <span className="text-yellow-400 font-bold text-sm">
            ⭐ {totalStars} / {TOTAL_LEVELS * 3}
          </span>
        </div>
      </div>

      {/* Pagination — two big buttons above the grid */}
      <div className="flex items-center justify-between px-4 mb-3">
        <motion.button
          onClick={goPrev}
          disabled={page === 0}
          className={`flex items-center justify-center p-2.5 rounded-lg text-lg transition-all
            ${
              page === 0
                ? "bg-white/[0.03] text-white/10 cursor-not-allowed"
                : "bg-white/[0.08] hover:bg-white/[0.15] text-white/70 hover:text-white border border-white/10 hover:border-white/25 cursor-pointer"
            }`}
          whileHover={page > 0 ? { scale: 1.05 } : {}}
          whileTap={page > 0 ? { scale: 0.93 } : {}}
        >
          ◀
        </motion.button>

        <span className="text-white/30 text-xs font-medium">
          {page + 1} / {TOTAL_PAGES}
        </span>

        <motion.button
          onClick={goNext}
          disabled={page === TOTAL_PAGES - 1}
          className={`flex items-center justify-center p-2.5 rounded-lg text-lg transition-all
            ${
              page === TOTAL_PAGES - 1
                ? "bg-white/[0.03] text-white/10 cursor-not-allowed"
                : "bg-white/[0.08] hover:bg-white/[0.15] text-white/70 hover:text-white border border-white/10 hover:border-white/25 cursor-pointer"
            }`}
          whileHover={page < TOTAL_PAGES - 1 ? { scale: 1.05 } : {}}
          whileTap={page < TOTAL_PAGES - 1 ? { scale: 0.93 } : {}}
        >
          ▶
        </motion.button>
      </div>

      {/* Level tiles */}
      <div className="flex-1 flex items-center justify-center overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={page}
            custom={direction}
            className="grid grid-cols-5 sm:grid-cols-6 gap-2.5 sm:gap-3 px-4 w-full"
            variants={{
              enter: (dir: number) => ({ opacity: 0, x: dir * 120 }),
              center: { opacity: 1, x: 0 },
              exit: (dir: number) => ({ opacity: 0, x: dir * -120 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            {pageLevels.map((i) => {
              const unlocked = isUnlocked(i);
              const result = progress[i];
              const ed = EMOJIS[i % EMOJIS.length];

              return (
                <motion.button
                  key={i}
                  onClick={() => unlocked && onSelect(i)}
                  disabled={!unlocked}
                  className={`relative rounded-2xl p-1.5 pt-2.5 pb-1.5 flex flex-col items-center gap-0.5 transition-all
                    ${
                      unlocked
                        ? "bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 hover:border-white/25 cursor-pointer"
                        : "bg-white/[0.02] border border-white/[0.05] cursor-not-allowed"
                    }
                  `}
                  whileHover={unlocked ? { scale: 1.08, y: -3 } : {}}
                  whileTap={unlocked ? { scale: 0.95 } : {}}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    delay: (i - startIdx) * 0.015,
                    type: "spring",
                    stiffness: 300,
                    damping: 22,
                  }}
                >
                  <span
                    className={`text-[10px] font-mono ${unlocked ? "text-white/40" : "text-white/15"}`}
                  >
                    {i + 1}
                  </span>

                  <span
                    className="text-xl sm:text-2xl"
                    style={{
                      filter: unlocked
                        ? "none"
                        : "grayscale(1) brightness(0.3)",
                      fontFamily:
                        "var(--font-emoji, 'Noto Color Emoji', 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif)",
                    }}
                  >
                    {ed.emoji}
                  </span>

                  <div className="h-3.5 flex items-center">
                    {result ? (
                      <StarsStatic count={result.stars} size={9} />
                    ) : unlocked ? (
                      <span className="text-[10px] text-white/20">—</span>
                    ) : (
                      <span className="text-[10px] text-white/15">🔒</span>
                    )}
                  </div>

                  {result && result.stars === 3 && (
                    <div
                      className="absolute -inset-[1px] rounded-2xl pointer-events-none"
                      style={{
                        border: "1px solid rgba(250,204,21,0.25)",
                        boxShadow: "0 0 12px rgba(250,204,21,0.08)",
                      }}
                    />
                  )}
                </motion.button>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT — Water Sort Game
   ═══════════════════════════════════════════════════════════ */

export default function WaterSortGame() {
  const [view, setView] = useState<GameView>("levels");
  const [level, setLevel] = useState(0);
  const [tubes, setTubes] = useState<string[][]>([]);
  const [centerFill, setCenterFill] = useState(0);
  const [targetColor, setTargetColor] = useState("");
  const [emoji, setEmoji] = useState("");
  const [emojiName, setEmojiName] = useState("");
  const [numColors, setNumColors] = useState(4);
  const [selectedTube, setSelectedTube] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [history, setHistory] = useState<
    { tubes: string[][]; centerFill: number }[]
  >([]);
  const [showCelebration, setShowCelebration] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [progress, setProgress] = useState<Record<number, LevelResult>>({});
  const [earnedStars, setEarnedStars] = useState(0);

  /* ── load saved progress ──────────────── */
  useEffect(() => {
    setProgress(loadProgress());
  }, []);

  /* ── initialise level ─────────────────── */
  const initLevel = useCallback((idx: number) => {
    const lvl = generateLevel(idx);
    setTubes(lvl.tubes);
    setCenterFill(0);
    setTargetColor(lvl.target);
    setEmoji(lvl.emoji);
    setEmojiName(lvl.name);
    setNumColors(lvl.numColors);
    setSelectedTube(null);
    setMoves(0);
    setIsComplete(false);
    setHistory([]);
    setShowCelebration(false);
    setEarnedStars(0);
  }, []);

  const startLevel = useCallback(
    (idx: number) => {
      setLevel(idx);
      initLevel(idx);
      setView("play");
    },
    [initLevel],
  );

  /* ── responsive ────────────────────────── */
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  /* ── win detection ─────────────────────── */
  useEffect(() => {
    if (centerFill >= TUBE_CAPACITY && TUBE_CAPACITY > 0 && !isComplete) {
      const stars = calcStars(moves, numColors);
      setEarnedStars(stars);
      setIsComplete(true);
      setShowCelebration(true);

      setProgress((prev) => {
        const existing = prev[level];
        const best =
          !existing || stars > existing.stars ? { stars, moves } : existing;
        const next = { ...prev, [level]: best };
        saveProgress(next);
        return next;
      });

      const t = setTimeout(() => setShowCelebration(false), 3200);
      return () => clearTimeout(t);
    }
  }, [centerFill, isComplete, moves, numColors, level]);

  /* ── derived: valid targets ──────────── */
  const selectedTop = useMemo(() => {
    if (selectedTube === null) return null;
    return tubes[selectedTube]?.length > 0
      ? tubes[selectedTube][tubes[selectedTube].length - 1]
      : null;
  }, [selectedTube, tubes]);

  const canPourCenter =
    selectedTop === targetColor && centerFill < TUBE_CAPACITY;

  // Only allow pouring onto a tube whose top color matches (or is empty)
  const validTargets = useMemo(() => {
    const set = new Set<number>();
    if (selectedTube === null || selectedTop === null) return set;
    for (let i = 0; i < tubes.length; i++) {
      if (i === selectedTube) continue;
      if (tubes[i].length >= TUBE_CAPACITY) continue;
      // Empty tube is valid (unless pointless single-layer → empty)
      if (tubes[i].length === 0) {
        if (tubes[selectedTube].length === 1) continue; // pointless move
        set.add(i);
        continue;
      }
      // Top color must match
      if (tubes[i][tubes[i].length - 1] === selectedTop) {
        set.add(i);
      }
    }
    return set;
  }, [selectedTube, selectedTop, tubes]);

  /* ── handlers ──────────────────────────── */
  const handleTubeClick = useCallback(
    (idx: number) => {
      if (isComplete) return;

      if (selectedTube === null) {
        if (tubes[idx].length > 0) setSelectedTube(idx);
        return;
      }

      if (selectedTube === idx) {
        setSelectedTube(null);
        return;
      }

      if (!validTargets.has(idx)) {
        setSelectedTube(tubes[idx].length > 0 ? idx : null);
        return;
      }

      // Pour 1 layer at a time for strategic play
      setHistory((h) => [...h, { tubes: deepClone(tubes), centerFill }]);
      const next = deepClone(tubes);
      next[idx].push(next[selectedTube].pop()!);
      setTubes(next);
      setMoves((m) => m + 1);
      setSelectedTube(null);
    },
    [selectedTube, tubes, isComplete, validTargets, centerFill],
  );

  const handleCenterClick = useCallback(() => {
    if (isComplete || selectedTube === null || !canPourCenter) {
      setSelectedTube(null);
      return;
    }

    setHistory((h) => [...h, { tubes: deepClone(tubes), centerFill }]);
    const next = deepClone(tubes);
    next[selectedTube].pop();
    setTubes(next);
    setCenterFill((f) => f + 1);
    setMoves((m) => m + 1);
    setSelectedTube(null);
  }, [selectedTube, tubes, isComplete, canPourCenter, centerFill]);

  const undo = useCallback(() => {
    if (!history.length) return;
    const prev = history[history.length - 1];
    setTubes(prev.tubes);
    setCenterFill(prev.centerFill);
    setHistory((h) => h.slice(0, -1));
    setMoves((m) => m + 1);
    setSelectedTube(null);
    setIsComplete(false);
    setShowCelebration(false);
  }, [history]);

  const resetLevel = useCallback(() => initLevel(level), [level, initLevel]);

  const nextLevel = useCallback(() => {
    const next = level + 1;
    if (next >= TOTAL_LEVELS) {
      setView("levels");
      return;
    }
    startLevel(next);
  }, [level, startLevel]);

  const goToLevels = useCallback(() => {
    setView("levels");
    setIsComplete(false);
    setShowCelebration(false);
  }, []);

  const fillPct = TUBE_CAPACITY > 0 ? centerFill / TUBE_CAPACITY : 0;
  const circleR = 220;
  const areaSize = circleR * 2 + 200;

  /* ═══════════════════════════════════════
     LEVEL GRID VIEW
     ═══════════════════════════════════════ */
  if (view === "levels") {
    return (
      <div
        className="fixed inset-0 w-full h-screen flex flex-col items-center pt-10 px-4 overflow-hidden"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, #1a103d 0%, #0d0a1a 50%, #050208 100%)",
        }}
      >
        <BackgroundOrbs />
        <div className="relative z-10 flex-1 w-full flex flex-col">
          <LevelGrid progress={progress} onSelect={startLevel} />
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════
     PLAY VIEW
     ═══════════════════════════════════════ */
  return (
    <div
      className="fixed inset-0 w-full h-screen flex flex-col items-center pt-6 px-4 overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 50% 0%, #1a103d 0%, #0d0a1a 50%, #050208 100%)",
      }}
    >
      <BackgroundOrbs />

      {/* header */}
      <motion.div
        className="relative z-10 text-center mb-4 w-full max-w-md"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <button
          onClick={goToLevels}
          className="absolute left-0 top-1 text-white/30 hover:text-white/70 transition-colors text-sm"
        >
          ← Levels
        </button>
        <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-purple-400 via-pink-400 to-amber-400 bg-clip-text text-transparent">
          Color Pour
        </h1>
        <p className="text-white/35 text-sm mt-1">
          Fill the{" "}
          <span className="text-white/60 font-medium">{emojiName}</span> with
          its color!
        </p>
      </motion.div>

      {/* info bar */}
      <motion.div
        className="relative z-10 flex items-center gap-5 mb-6 text-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
      >
        {[
          { label: "Level", value: String(level + 1) },
          { label: "Moves", value: String(moves) },
        ].map((d) => (
          <div key={d.label} className="flex items-center gap-1.5">
            <span className="text-white/25">{d.label}</span>
            <span className="font-bold text-white/75">{d.value}</span>
          </div>
        ))}
        <div className="flex items-center gap-1">
          <span className="text-white/25">Target</span>
          <span className="text-xl leading-none">{emoji}</span>
        </div>
      </motion.div>

      {/* game board */}
      {isMobile ? (
        <div className="relative z-10 flex flex-col items-center gap-8 w-full max-w-lg">
          <CenterEmoji
            emoji={emoji}
            fillPct={fillPct}
            targetColor={targetColor}
            onClick={handleCenterClick}
            canReceive={canPourCenter}
            isComplete={isComplete}
          />
          <div className="flex flex-wrap justify-center gap-3">
            {tubes.map((tube, i) => (
              <GlassTube
                key={i}
                idx={i}
                colors={tube}
                isSelected={selectedTube === i}
                isValidTarget={validTargets.has(i)}
                dimmed={
                  selectedTube !== null &&
                  selectedTube !== i &&
                  !validTargets.has(i)
                }
                onClick={() => handleTubeClick(i)}
              />
            ))}
          </div>
        </div>
      ) : (
        <div
          className="relative z-10"
          style={{ width: areaSize, height: areaSize }}
        >
          <div
            className="absolute"
            style={{
              left: areaSize / 2 - CENTER_SIZE / 2,
              top: areaSize / 2 - (CENTER_SIZE + 36) / 2,
            }}
          >
            <CenterEmoji
              emoji={emoji}
              fillPct={fillPct}
              targetColor={targetColor}
              onClick={handleCenterClick}
              canReceive={canPourCenter}
              isComplete={isComplete}
            />
          </div>

          {tubes.map((tube, i) => {
            const angle = (2 * Math.PI * i) / tubes.length - Math.PI / 2;
            const x = Math.cos(angle) * circleR + areaSize / 2 - TUBE_W / 2;
            const y = Math.sin(angle) * circleR + areaSize / 2 - TUBE_H / 2;

            return (
              <motion.div
                key={i}
                className="absolute"
                style={{ left: x, top: y }}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  delay: i * 0.04 + 0.25,
                  type: "spring",
                  stiffness: 320,
                  damping: 24,
                }}
              >
                <GlassTube
                  idx={i}
                  colors={tube}
                  isSelected={selectedTube === i}
                  isValidTarget={validTargets.has(i)}
                  dimmed={
                    selectedTube !== null &&
                    selectedTube !== i &&
                    !validTargets.has(i)
                  }
                  onClick={() => handleTubeClick(i)}
                />
              </motion.div>
            );
          })}
        </div>
      )}

      {/* controls */}
      <motion.div
        className="relative z-10 flex items-center gap-3 mt-8"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <button
          onClick={goToLevels}
          className="px-4 py-2 rounded-xl text-sm font-medium transition-all
            bg-white/[0.04] hover:bg-white/[0.09] text-white/55 hover:text-white/90
            border border-white/10 hover:border-white/20"
        >
          📋 Levels
        </button>
        <button
          onClick={undo}
          disabled={!history.length}
          className="px-4 py-2 rounded-xl text-sm font-medium transition-all
            bg-white/[0.04] hover:bg-white/[0.09] text-white/55 hover:text-white/90
            border border-white/10 hover:border-white/20
            disabled:opacity-25 disabled:cursor-not-allowed"
        >
          ↩ Undo
        </button>
        <button
          onClick={resetLevel}
          className="px-4 py-2 rounded-xl text-sm font-medium transition-all
            bg-white/[0.04] hover:bg-white/[0.09] text-white/55 hover:text-white/90
            border border-white/10 hover:border-white/20"
        >
          🔄 Reset
        </button>
        <AnimatePresence>
          {isComplete && (
            <motion.button
              onClick={nextLevel}
              className="px-6 py-2 rounded-xl text-sm font-bold transition-all
                bg-gradient-to-r from-purple-500 to-pink-500
                hover:from-purple-400 hover:to-pink-400
                text-white shadow-lg shadow-purple-500/25"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.94 }}
            >
              Next Level →
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>

      {/* instructions */}
      <motion.p
        className="relative z-10 mt-6 text-center text-white/25 text-xs max-w-xs leading-relaxed"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
      >
        Tap a tube to select · tap the center to pour matching colour · stack
        any colour on any tube to dig out what you need.
      </motion.p>

      {/* win overlay */}
      <AnimatePresence>
        {isComplete && (
          <motion.div
            className="fixed inset-0 z-40 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={nextLevel}
            />

            <motion.div
              className="relative bg-gradient-to-b from-white/[0.08] to-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-10 text-center shadow-2xl"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
            >
              <motion.div
                className="text-8xl mb-4"
                animate={{ rotate: [0, -12, 12, -12, 0], scale: [1, 1.25, 1] }}
                transition={{ duration: 0.9 }}
                style={{ fontFamily: "var(--font-emoji)" }}
              >
                {emoji}
              </motion.div>

              <div className="mb-3">
                <Stars count={earnedStars} size={28} />
              </div>

              <h2 className="text-2xl font-bold text-white mb-1">
                {emojiName} Complete!
              </h2>
              <p className="text-white/45 mb-6">
                Solved in{" "}
                <span className="text-white/70 font-semibold">{moves}</span>{" "}
                moves
              </p>

              <div className="flex gap-3 justify-center">
                <motion.button
                  onClick={goToLevels}
                  className="px-6 py-3 rounded-2xl text-sm font-medium
                    bg-white/[0.06] hover:bg-white/[0.12] border border-white/10
                    text-white/70 hover:text-white transition-all"
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                >
                  📋 Levels
                </motion.button>
                <motion.button
                  onClick={nextLevel}
                  className="px-10 py-3 rounded-2xl text-base font-bold
                    bg-gradient-to-r from-purple-500 to-pink-500
                    text-white shadow-xl shadow-purple-500/30"
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.94 }}
                >
                  Next Level →
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <CelebrationParticles color={targetColor} active={showCelebration} />
    </div>
  );
}
