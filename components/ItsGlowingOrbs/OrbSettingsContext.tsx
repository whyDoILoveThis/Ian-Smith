"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";

export interface OrbConfig {
  size: number;
  color: string;
  speed: number;
  blur: number;
  opacity: number;
}

export interface OrbSettings {
  enabled: boolean;
  orbs: OrbConfig[];
  blendMode: GlobalCompositeOperation;
  opacity: number;
  gradientHardStop: number; // 0–1, where the solid color core ends
  bounceElasticity: number; // 0–2
  flingMultiplier: number; // how much fling oomph
}

const DEFAULT_SETTINGS: OrbSettings = {
  enabled: true,
  orbs: [
    { size: 300, color: "#ff00ff", speed: 0.5, blur: 80, opacity: 0.5 },
    { size: 220, color: "#00ffff", speed: 1, blur: 60, opacity: 0.5 },
    { size: 460, color: "#ffffff", speed: 1.5, blur: 120, opacity: 0.5 },
  ],
  blendMode: "screen",
  opacity: 1,
  gradientHardStop: 0.4,
  bounceElasticity: 1,
  flingMultiplier: 16,
};

const STORAGE_KEY = "orb-settings-v1";

interface OrbSettingsContextValue {
  settings: OrbSettings;
  setSettings: (s: OrbSettings) => void;
  updateOrb: (index: number, partial: Partial<OrbConfig>) => void;
  addOrb: () => void;
  removeOrb: (index: number) => void;
  resetToDefaults: () => void;
  resetSpeeds: () => void;
  showDashboard: boolean;
  setShowDashboard: (v: boolean) => void;
}

const OrbSettingsContext = createContext<OrbSettingsContextValue | null>(null);

export function useOrbSettings() {
  const ctx = useContext(OrbSettingsContext);
  if (!ctx)
    throw new Error("useOrbSettings must be inside OrbSettingsProvider");
  return ctx;
}

function loadSettings(): OrbSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    const merged = { ...DEFAULT_SETTINGS, ...parsed };
    // Backfill any missing per-orb fields added after the user last saved
    const defaultOrb = DEFAULT_SETTINGS.orbs[0];
    merged.orbs = (merged.orbs as OrbConfig[]).map((o) => ({
      ...defaultOrb,
      ...o,
    }));
    return merged;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(s: OrbSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* quota exceeded – silently ignore */
  }
}

export function OrbSettingsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [settings, setSettingsRaw] = useState<OrbSettings>(DEFAULT_SETTINGS);
  const [showDashboard, setShowDashboard] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage after mount
  useEffect(() => {
    setSettingsRaw(loadSettings());
    setHydrated(true);
  }, []);

  // Persist on change (skip initial hydration write)
  useEffect(() => {
    if (hydrated) saveSettings(settings);
  }, [settings, hydrated]);

  const setSettings = useCallback((s: OrbSettings) => setSettingsRaw(s), []);

  const updateOrb = useCallback(
    (index: number, partial: Partial<OrbConfig>) => {
      setSettingsRaw((prev) => {
        const orbs = prev.orbs.map((o, i) =>
          i === index ? { ...o, ...partial } : o,
        );
        return { ...prev, orbs };
      });
    },
    [],
  );

  const addOrb = useCallback(() => {
    setSettingsRaw((prev) => ({
      ...prev,
      orbs: [
        ...prev.orbs,
        { size: 200, color: "#ff8800", speed: 1, blur: 60, opacity: 1 },
      ],
    }));
  }, []);

  const removeOrb = useCallback((index: number) => {
    setSettingsRaw((prev) => ({
      ...prev,
      orbs: prev.orbs.filter((_, i) => i !== index),
    }));
  }, []);

  const resetToDefaults = useCallback(() => {
    setSettingsRaw(DEFAULT_SETTINGS);
  }, []);

  const resetSpeeds = useCallback(() => {
    setSettingsRaw((prev) => ({
      ...prev,
      orbs: prev.orbs.map((o, i) => ({
        ...o,
        speed:
          DEFAULT_SETTINGS.orbs[i]?.speed ?? DEFAULT_SETTINGS.orbs[0].speed,
      })),
    }));
  }, []);

  return (
    <OrbSettingsContext.Provider
      value={{
        settings,
        setSettings,
        updateOrb,
        addOrb,
        removeOrb,
        resetToDefaults,
        resetSpeeds,
        showDashboard,
        setShowDashboard,
      }}
    >
      {children}
    </OrbSettingsContext.Provider>
  );
}
