"use client";

import React, { useState } from "react";
import {
  useOrbSettings,
  type OrbConfig,
  type OrbSettings,
} from "./OrbSettingsContext";
import { ItsPortal0 } from "../sub/ItsPortal0";
import ItsPopover from "../sub/ItsPopover";
import {
  Plus,
  Trash2,
  RotateCcw,
  Sparkles,
  Circle,
  Zap,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// ─── Tiny reusable slider ───────────────────────────────────────────────
function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  unit = "",
  accent = "#8b5cf6",
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  unit?: string;
  accent?: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-400">
          {label}
        </span>
        <span
          className="text-[11px] font-mono tabular-nums px-1.5 py-0.5 rounded-md"
          style={{ backgroundColor: `${accent}20`, color: accent }}
        >
          {step < 1 ? value.toFixed(2) : Math.round(value)}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:shadow-md
          [&::-webkit-slider-thumb]:border-2
          [&::-webkit-slider-thumb]:border-white
          [&::-webkit-slider-thumb]:dark:border-neutral-900
          [&::-webkit-slider-thumb]:transition-transform
          [&::-webkit-slider-thumb]:hover:scale-110"
        style={{
          background: `linear-gradient(to right, ${accent} ${pct}%, rgba(255,255,255,0.08) ${pct}%)`,
          // thumb color via inline css is limited, but accent-color helps
          accentColor: accent,
        }}
      />
    </div>
  );
}

// ─── Color Swatch Button ────────────────────────────────────────────────
function ColorSwatch({
  color,
  onChange,
}: {
  color: string;
  onChange: (c: string) => void;
}) {
  return (
    <label className="relative cursor-pointer group">
      <div
        className="w-8 h-8 rounded-lg border border-white/10 shadow-lg transition-transform group-hover:scale-110"
        style={{
          backgroundColor: color,
          boxShadow: `0 0 12px ${color}40`,
        }}
      />
      <input
        type="color"
        value={color}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
      />
    </label>
  );
}

// ─── Blend Mode Selector ────────────────────────────────────────────────
const BLEND_MODES: GlobalCompositeOperation[] = [
  "screen",
  "lighter",
  "source-over",
  "overlay",
  "hard-light",
  "soft-light",
  "color-dodge",
];

function BlendModeSelector({
  value,
  onChange,
}: {
  value: GlobalCompositeOperation;
  onChange: (v: GlobalCompositeOperation) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {BLEND_MODES.map((mode) => (
        <button
          key={mode}
          onClick={() => onChange(mode)}
          className={`px-2.5 py-1 rounded-lg text-[10px] font-mono uppercase tracking-wider transition-all duration-150
            ${
              value === mode
                ? "bg-violet-500/20 text-violet-300 ring-1 ring-violet-500/40 shadow-[0_0_8px_rgba(139,92,246,0.2)]"
                : "bg-white/5 text-neutral-500 hover:bg-white/10 hover:text-neutral-300"
            }`}
        >
          {mode}
        </button>
      ))}
    </div>
  );
}

// ─── Single Orb Card ────────────────────────────────────────────────────
function OrbCard({
  orb,
  index,
  onUpdate,
  onRemove,
  canRemove,
}: {
  orb: OrbConfig;
  index: number;
  onUpdate: (partial: Partial<OrbConfig>) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div
      className="relative rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm overflow-hidden transition-all duration-200"
      style={{
        boxShadow: `0 0 24px ${orb.color}08, inset 0 1px 0 rgba(255,255,255,0.03)`,
      }}
    >
      {/* Subtle top accent bar */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{
          background: `linear-gradient(90deg, transparent, ${orb.color}, transparent)`,
          opacity: 0.6,
        }}
      />

      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors"
      >
        <div
          className="w-5 h-5 rounded-full flex-shrink-0 ring-2 ring-white/10"
          style={{
            backgroundColor: orb.color,
            boxShadow: `0 0 10px ${orb.color}50`,
          }}
        />
        <span className="text-sm font-medium text-neutral-200 flex-1 text-left">
          Orb {index + 1}
        </span>
        <span className="text-[10px] font-mono text-neutral-500">
          {orb.size}px · {orb.speed}x
        </span>
        {expanded ? (
          <ChevronUp className="w-3.5 h-3.5 text-neutral-500" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-neutral-500" />
        )}
      </button>

      {/* Body */}
      {expanded && (
        <div className="px-4 pb-4 pt-1 space-y-4">
          {/* Color row */}
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-400 flex-1">
              Color
            </span>
            <ColorSwatch
              color={orb.color}
              onChange={(c) => onUpdate({ color: c })}
            />
            <input
              type="text"
              value={orb.color}
              onChange={(e) => {
                const v = e.target.value;
                if (/^#[0-9a-fA-F]{0,6}$/.test(v)) onUpdate({ color: v });
              }}
              className="w-20 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[11px] font-mono text-neutral-300 outline-none focus:border-violet-500/40 transition-colors"
            />
          </div>

          <Slider
            label="Diameter"
            value={orb.size}
            min={20}
            max={800}
            step={10}
            onChange={(v) => onUpdate({ size: v })}
            unit="px"
            accent={orb.color}
          />
          <Slider
            label="Speed"
            value={orb.speed}
            min={0}
            max={5}
            step={0.1}
            onChange={(v) => onUpdate({ speed: v })}
            unit="x"
            accent={orb.color}
          />
          <Slider
            label="Blur"
            value={orb.blur}
            min={0}
            max={200}
            step={5}
            onChange={(v) => onUpdate({ blur: v })}
            unit="px"
            accent={orb.color}
          />
          <Slider
            label="Opacity"
            value={orb.opacity}
            min={0}
            max={1}
            step={0.05}
            onChange={(v) => onUpdate({ opacity: v })}
            accent={orb.color}
          />

          {canRemove && (
            <button
              onClick={onRemove}
              className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-red-400/60 hover:text-red-400 transition-colors mt-2"
            >
              <Trash2 className="w-3 h-3" />
              Remove
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Dashboard ─────────────────────────────────────────────────────
export default function OrbSettingsDashboard() {
  const {
    settings,
    setSettings,
    updateOrb,
    addOrb,
    removeOrb,
    resetToDefaults,
    showDashboard,
    setShowDashboard,
  } = useOrbSettings();

  const update = <K extends keyof OrbSettings>(key: K, value: OrbSettings[K]) =>
    setSettings({ ...settings, [key]: value });

  if (!showDashboard) return null;

  return (
    <ItsPortal0>
      <ItsPopover
        className="!bg-opacity-0 bg-black"
        bgBlur="md"
        show={showDashboard}
        setShow={setShowDashboard}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-3xl border border-white/[0.06] bg-neutral-950/90 backdrop-blur-2xl shadow-2xl"
          style={{
            boxShadow:
              "0 0 0 1px rgba(255,255,255,0.03), 0 24px 80px rgba(0,0,0,0.6), 0 0 120px rgba(139,92,246,0.06)",
          }}
        >
          {/* ── Header ── */}
          <div className="sticky top-0 z-10 bg-neutral-950/80 backdrop-blur-xl border-b border-white/[0.04] px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-neutral-100 tracking-tight">
                    Floating Orb Settings
                  </h2>
                  <p className="text-[10px] text-neutral-500 uppercase tracking-widest">
                    Background Particle Engine
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={resetToDefaults}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-neutral-200 transition-all"
                  title="Reset to defaults"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowDashboard(false)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-neutral-200 transition-all text-lg leading-none"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* ── Global toggle ── */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
              <div className="flex items-center gap-3">
                {settings.enabled ? (
                  <Eye className="w-4 h-4 text-emerald-400" />
                ) : (
                  <EyeOff className="w-4 h-4 text-neutral-500" />
                )}
                <div>
                  <span className="text-sm font-medium text-neutral-200">
                    {settings.enabled ? "Active" : "Disabled"}
                  </span>
                  <p className="text-[10px] text-neutral-500">
                    Toggle background orbs
                  </p>
                </div>
              </div>
              <button
                onClick={() => update("enabled", !settings.enabled)}
                className={`relative w-11 h-6 rounded-full transition-all duration-200 ${
                  settings.enabled
                    ? "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                    : "bg-white/10"
                }`}
              >
                <div
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-200 ${
                    settings.enabled ? "left-[22px]" : "left-0.5"
                  }`}
                />
              </button>
            </div>

            {/* ── Global Settings ── */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-violet-400" />
                <h3 className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
                  Global
                </h3>
              </div>

              <div className="space-y-4 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                <Slider
                  label="Opacity"
                  value={settings.opacity}
                  min={0}
                  max={1}
                  step={0.05}
                  onChange={(v) => update("opacity", v)}
                  accent="#8b5cf6"
                />
                <Slider
                  label="Core Hardness"
                  value={settings.gradientHardStop}
                  min={0}
                  max={0.9}
                  step={0.05}
                  onChange={(v) => update("gradientHardStop", v)}
                  accent="#8b5cf6"
                />
                <Slider
                  label="Bounce Elasticity"
                  value={settings.bounceElasticity}
                  min={0}
                  max={2}
                  step={0.05}
                  onChange={(v) => update("bounceElasticity", v)}
                  accent="#8b5cf6"
                />
                <Slider
                  label="Fling Power"
                  value={settings.flingMultiplier}
                  min={1}
                  max={60}
                  step={1}
                  onChange={(v) => update("flingMultiplier", v)}
                  accent="#8b5cf6"
                />

                <div className="space-y-1.5">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-400">
                    Blend Mode
                  </span>
                  <BlendModeSelector
                    value={settings.blendMode}
                    onChange={(v) => update("blendMode", v)}
                  />
                </div>
              </div>
            </div>

            {/* ── Per-Orb Settings ── */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Circle className="w-3.5 h-3.5 text-fuchsia-400" />
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
                    Orbs ({settings.orbs.length})
                  </h3>
                </div>
                <button
                  onClick={addOrb}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] uppercase tracking-wider font-medium
                    bg-violet-500/10 text-violet-300 hover:bg-violet-500/20 ring-1 ring-violet-500/20 hover:ring-violet-500/30
                    transition-all shadow-[0_0_8px_rgba(139,92,246,0.1)]"
                >
                  <Plus className="w-3 h-3" />
                  Add Orb
                </button>
              </div>

              <div className="space-y-3">
                {settings.orbs.map((orb, i) => (
                  <OrbCard
                    key={i}
                    orb={orb}
                    index={i}
                    onUpdate={(partial) => updateOrb(i, partial)}
                    onRemove={() => removeOrb(i)}
                    canRemove={settings.orbs.length > 1}
                  />
                ))}
              </div>
            </div>

            {/* ── Footer ── */}
            <div className="pt-2 border-t border-white/[0.04]">
              <p className="text-[9px] text-neutral-600 text-center uppercase tracking-widest">
                Settings are saved locally • Click & drag orbs to fling them
              </p>
            </div>
          </div>
        </div>
      </ItsPopover>
    </ItsPortal0>
  );
}
