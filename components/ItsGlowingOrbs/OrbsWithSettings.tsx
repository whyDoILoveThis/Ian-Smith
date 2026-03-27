"use client";

import { useOrbSettings } from "./OrbSettingsContext";
import GlowingOrbsBackground from "./GLowingOrbsBackground";
import OrbSettingsDashboard from "./OrbSettingsDashboard";

export default function OrbsWithSettings() {
  const { settings } = useOrbSettings();

  return (
    <>
      {settings.enabled && settings.orbs.length > 0 && (
        <GlowingOrbsBackground
          numOfOrbs={settings.orbs.length}
          orbSizes={settings.orbs.map((o) => o.size)}
          orbColors={settings.orbs.map((o) => o.color)}
          orbSpeed={settings.orbs.map((o) => o.speed)}
          orbBlur={settings.orbs.map((o) => o.blur)}
          orbOpacity={settings.orbs.map((o) => o.opacity)}
          blendMode={settings.blendMode}
          opacity={settings.opacity}
          gradientHardStop={settings.gradientHardStop}
          bounceElasticity={settings.bounceElasticity}
          flingMultiplier={settings.flingMultiplier}
        />
      )}
      <OrbSettingsDashboard />
    </>
  );
}
