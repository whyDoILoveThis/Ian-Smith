// components/timeline/TimelineCluster.tsx
"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";

/* ------------------------------------------------------------------ */
/*  Cluster node card – shown inside the expanded panel               */
/* ------------------------------------------------------------------ */

function ClusterNodeItem({ node }: { node: TimelineNode }) {
  const images = node.images ?? [];
  const urls: string[] =
    images.length > 0 && typeof images[0] === "string"
      ? (images as unknown as string[])
      : (images as Screenshot[]).map((s) => s.url);
  const [imgIdx, setImgIdx] = useState(0);
  const [imgLoading, setImgLoading] = useState(true);

  return (
    <div className="flex gap-3 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/10 transition-colors">
      {/* Colour stripe */}
      <div
        className="w-1 self-stretch rounded-full shrink-0"
        style={{ backgroundColor: node.color || "#06b6d4" }}
      />

      <div className="flex-1 min-w-0">
        {/* Image carousel (if any) */}
        {urls.length > 0 && (
          <div
            className="relative w-full rounded-lg overflow-hidden mb-2 bg-neutral-950"
            style={{ aspectRatio: "16/9" }}
          >
            {imgLoading && (
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <span className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            <Image
              src={urls[imgIdx]}
              alt={node.title}
              fill
              className="object-cover"
              onLoad={() => setImgLoading(false)}
              sizes="280px"
            />
            {urls.length > 1 && (
              <div className="absolute inset-0 flex items-center justify-between px-1 opacity-0 hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setImgIdx((i) => (i - 1 + urls.length) % urls.length);
                    setImgLoading(true);
                  }}
                  className="bg-black/60 hover:bg-black/80 text-white text-xs px-1.5 py-0.5 rounded"
                >
                  ←
                </button>
                <span className="text-[10px] text-white bg-black/50 px-1.5 py-0.5 rounded">
                  {imgIdx + 1}/{urls.length}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setImgIdx((i) => (i + 1) % urls.length);
                    setImgLoading(true);
                  }}
                  className="bg-black/60 hover:bg-black/80 text-white text-xs px-1.5 py-0.5 rounded"
                >
                  →
                </button>
              </div>
            )}
          </div>
        )}

        {/* Title + date */}
        <div className="flex items-start justify-between gap-2">
          <span className="font-semibold text-sm text-white leading-tight truncate">
            {node.title}
          </span>
          <span className="shrink-0 text-[10px] text-neutral-500 mt-0.5 whitespace-nowrap">
            {new Date(node.dateMs).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>

        {/* Description */}
        {node.description && (
          <p className="text-xs text-neutral-400 mt-1 leading-relaxed line-clamp-3">
            {node.description}
          </p>
        )}

        {/* Link */}
        {node.link && (
          <a
            href={node.link}
            target="_blank"
            rel="noreferrer"
            className="inline-block text-[11px] text-cyan-400 hover:text-cyan-300 mt-1.5 transition-colors"
          >
            Open link ↗
          </a>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main cluster component                                            */
/* ------------------------------------------------------------------ */

export default function TimelineCluster({
  x,
  items,
  isPreview = false,
}: {
  x: number;
  items: TimelineNode[];
  isPreview?: boolean;
}) {
  const [hover, setHover] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close panel on click-outside
  useEffect(() => {
    if (!expanded) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [expanded]);

  // Close on Escape
  useEffect(() => {
    if (!expanded) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [expanded]);

  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded((v) => !v);
  }, []);

  // Sort items oldest → newest for display
  const sorted = [...items].sort((a, b) => a.dateMs - b.dateMs);

  return (
    <div
      style={{ left: `${x}px`, zIndex: expanded ? 30000 : hover ? 500 : 100 }}
      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
    >
      <div
        ref={panelRef}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className="relative flex items-center justify-center"
      >
        {/* Badge */}
        <button
          onClick={handleToggle}
          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shadow-lg cursor-pointer
            transform transition-all duration-200
            ${expanded ? "scale-110 ring-2 ring-cyan-500/50" : hover ? "scale-105" : ""}
            ${
              isPreview
                ? "bg-neutral-700/40 border border-neutral-600 text-neutral-200 opacity-60"
                : "bg-neutral-700/60 border border-neutral-600 text-neutral-200 hover:bg-neutral-600/60"
            }`}
        >
          +{items.length}
        </button>

        {/* -------- Hover quick-peek (hidden when expanded) -------- */}
        {!expanded && (
          <div className="absolute -top-48 w-72 pointer-events-none">
            <div
              className={`transition-all transform origin-bottom ${
                hover
                  ? "opacity-100 scale-100 translate-y-0"
                  : "opacity-0 scale-95 translate-y-2"
              }`}
            >
              <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-3 text-sm shadow-xl">
                <div className="font-semibold mb-2 text-neutral-200">
                  Cluster ({items.length})
                  <span className="text-[10px] text-neutral-500 ml-2 font-normal">
                    click to expand
                  </span>
                </div>
                <ul className="space-y-1.5">
                  {sorted.slice(0, 5).map((it) => (
                    <li
                      key={it.nodeId ?? it.title}
                      className="flex items-center gap-2 text-neutral-300"
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: it.color || "#06b6d4" }}
                      />
                      <span className="truncate text-xs">{it.title}</span>
                    </li>
                  ))}
                  {sorted.length > 5 && (
                    <li className="text-[10px] text-neutral-500 pl-4">
                      +{sorted.length - 5} more...
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* -------- Expanded panel -------- */}
        {expanded && (
          <div
            className="absolute bottom-[calc(50%+24px)] left-1/2 -translate-x-1/2 w-80 max-h-[420px] flex flex-col
              bg-neutral-900/95 border border-white/10 rounded-2xl shadow-2xl shadow-black/50 backdrop-blur-xl
              animate-in fade-in slide-in-from-bottom-2 duration-200 overflow-hidden"
            onWheel={(e) => e.stopPropagation()}
          >
            {/* Panel header */}
            <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-1">
                  {sorted.slice(0, 4).map((it, i) => (
                    <span
                      key={it.nodeId ?? it.title}
                      className="w-3 h-3 rounded-full border border-neutral-900"
                      style={{
                        backgroundColor: it.color || "#06b6d4",
                        zIndex: 4 - i,
                      }}
                    />
                  ))}
                </div>
                <span className="text-sm font-semibold text-white">
                  {items.length} Events
                </span>
              </div>
              <button
                onClick={handleToggle}
                className="text-neutral-500 hover:text-white transition-colors text-xs px-1.5 py-0.5 rounded hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            {/* Date range subheader */}
            <div className="px-4 py-1.5 text-[10px] text-neutral-500">
              {new Date(sorted[0].dateMs).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
              {" — "}
              {new Date(sorted[sorted.length - 1].dateMs).toLocaleDateString(
                undefined,
                {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                },
              )}
            </div>

            {/* Scrollable list */}
            <div
              className="flex-1 overflow-y-auto px-3 pb-3 space-y-2 customScroll"
              onWheel={(e) => e.stopPropagation()}
            >
              {sorted.map((node) => (
                <ClusterNodeItem key={node.nodeId ?? node.title} node={node} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
