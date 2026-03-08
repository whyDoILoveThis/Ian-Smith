"use client";

import React from "react";
import { usePaintState } from "../hooks/usePaintState";
import { TOOLS, ToolDef } from "../lib/constants";
import { ToolType } from "../types/types";

const GLOW_MAP: Record<string, string> = {
  select: "rgba(99,102,241,0.5)",
  draw: "rgba(236,72,153,0.5)",
  shape: "rgba(34,211,238,0.5)",
  utility: "rgba(250,204,21,0.5)",
};

const GRADIENT_MAP: Record<string, string> = {
  select: "from-indigo-500 to-violet-600",
  draw: "from-pink-500 to-rose-600",
  shape: "from-cyan-400 to-blue-500",
  utility: "from-amber-400 to-orange-500",
};

function ToolButton({
  tool,
  active,
  onClick,
}: {
  tool: ToolDef;
  active: boolean;
  onClick: () => void;
}) {
  const glow = GLOW_MAP[tool.category] ?? "rgba(99,102,241,0.5)";
  const grad = GRADIENT_MAP[tool.category] ?? "from-indigo-500 to-violet-600";

  return (
    <button
      onClick={onClick}
      title={`${tool.label} (${tool.shortcut})`}
      className={`
        w-9 h-9 md:w-9 md:h-9 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl text-sm
        transition-all duration-200 ease-out
        ${
          active
            ? `bg-gradient-to-br ${grad} text-white scale-110`
            : "bg-white/[0.06] text-zinc-400 hover:bg-white/[0.12] hover:text-white hover:scale-105"
        }
      `}
      style={
        active ? { boxShadow: `0 0 14px ${glow}, 0 0 4px ${glow}` } : undefined
      }
    >
      <span className="drop-shadow-sm">{tool.icon}</span>
    </button>
  );
}

export default function Toolbar() {
  const { state, dispatch } = usePaintState();

  const selectTools = TOOLS.filter((t) => t.category === "select");
  const drawTools = TOOLS.filter((t) => t.category === "draw");
  const shapeTools = TOOLS.filter((t) => t.category === "shape");
  const utilityTools = TOOLS.filter((t) => t.category === "utility");

  const renderGroup = (tools: ToolDef[], label: string, accent: string) => (
    <div key={label} className="flex flex-col gap-1">
      <span
        className={`text-[8px] font-bold uppercase tracking-[0.2em] px-1 ${accent}`}
      >
        {label}
      </span>
      <div className="grid grid-cols-4 md:grid-cols-2 gap-1">
        {tools.map((tool) => (
          <ToolButton
            key={tool.type}
            tool={tool}
            active={state.activeTool === tool.type}
            onClick={() =>
              dispatch({ type: "SET_ACTIVE_TOOL", tool: tool.type })
            }
          />
        ))}
      </div>
    </div>
  );

  return (
    <div className="w-full md:w-[84px] backdrop-blur-xl bg-white/[0.04] md:border-r border-white/[0.06] flex flex-col gap-3 p-2 overflow-y-auto select-none">
      {renderGroup(selectTools, "Select", "text-indigo-400/70")}
      <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      {renderGroup(drawTools, "Draw", "text-pink-400/70")}
      <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      {renderGroup(shapeTools, "Shape", "text-cyan-400/70")}
      <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      {renderGroup(utilityTools, "Utility", "text-amber-400/70")}
    </div>
  );
}
