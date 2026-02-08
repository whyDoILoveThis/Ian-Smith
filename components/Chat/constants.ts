import type { ChatTheme, ThemeColors } from "./types";

export const ROOM_PATH = "twoWayChat";
export const STORAGE_KEY = "twoWayChatSession";
export const COMBO_STORAGE_KEY = "twoWayChatCombo";
export const DERIVATION_SALT = "twoWayChatComboSalt:v1";
export const SECRET_PHRASE = "takemetothemagicalplacenow";
export const MESSAGES_PER_PAGE = 50;

export const RING_COLORS = ["#f97316", "#3b82f6", "#22c55e", "#ec4899"] as const;

export const THEME_COLORS: Record<ChatTheme, ThemeColors> = {
  red: {
    bg: "bg-red-500/90",
    text: "text-white",
    accent: "text-red-200/70",
    ring: "ring-red-400",
    btn: "bg-red-500",
  },
  orange: {
    bg: "bg-orange-500/90",
    text: "text-white",
    accent: "text-orange-200/70",
    ring: "ring-orange-400",
    btn: "bg-orange-500",
  },
  yellow: {
    bg: "bg-yellow-400/90",
    text: "text-black",
    accent: "text-yellow-900/70",
    ring: "ring-yellow-400",
    btn: "bg-yellow-400",
  },
  green: {
    bg: "bg-green-500/90",
    text: "text-white",
    accent: "text-green-200/70",
    ring: "ring-green-400",
    btn: "bg-green-500",
  },
  emerald: {
    bg: "bg-emerald-400/90",
    text: "text-black",
    accent: "text-emerald-900/70",
    ring: "ring-emerald-400",
    btn: "bg-emerald-400",
  },
  cyan: {
    bg: "bg-cyan-400/90",
    text: "text-black",
    accent: "text-cyan-900/70",
    ring: "ring-cyan-400",
    btn: "bg-cyan-400",
  },
  blue: {
    bg: "bg-blue-500/90",
    text: "text-white",
    accent: "text-blue-200/70",
    ring: "ring-blue-400",
    btn: "bg-blue-500",
  },
  purple: {
    bg: "bg-purple-500/90",
    text: "text-white",
    accent: "text-purple-200/70",
    ring: "ring-purple-400",
    btn: "bg-purple-500",
  },
  pink: {
    bg: "bg-pink-500/90",
    text: "text-white",
    accent: "text-pink-200/70",
    ring: "ring-pink-400",
    btn: "bg-pink-500",
  },
  rose: {
    bg: "bg-rose-500/90",
    text: "text-white",
    accent: "text-rose-200/70",
    ring: "ring-rose-400",
    btn: "bg-rose-500",
  },
};
