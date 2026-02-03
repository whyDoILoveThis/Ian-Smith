import type { ChatTheme, ThemeColors } from "./types";

export const ROOM_PATH = "twoWayChat";
export const STORAGE_KEY = "twoWayChatSession";
export const COMBO_STORAGE_KEY = "twoWayChatCombo";
export const DERIVATION_SALT = "twoWayChatComboSalt:v1";
export const SECRET_PHRASE = "takemetothemagicalplacenow";
export const MESSAGES_PER_PAGE = 50;

export const RING_COLORS = ["#f97316", "#3b82f6", "#22c55e", "#ec4899"] as const;

export const THEME_COLORS: Record<ChatTheme, ThemeColors> = {
  emerald: {
    bg: "bg-emerald-400/90",
    text: "text-black",
    accent: "text-emerald-900/70",
    ring: "ring-emerald-400",
    btn: "bg-emerald-400",
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
  rose: {
    bg: "bg-rose-500/90",
    text: "text-white",
    accent: "text-rose-200/70",
    ring: "ring-rose-400",
    btn: "bg-rose-500",
  },
};
