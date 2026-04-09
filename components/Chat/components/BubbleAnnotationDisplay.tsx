"use client";

import React, { useEffect, useRef, useState } from "react";
import type {
  BubbleAnnotations,
  AnnotationStroke,
  AnnotationTextBox,
} from "../types";

function hexToRgba(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}

/** Adjust the lightness of a hex color. lightness 0-100, 50 = original. */
function adjustHexLightness(hex: string, lightness: number): string {
  let r = parseInt(hex.slice(1, 3), 16) / 255;
  let g = parseInt(hex.slice(3, 5), 16) / 255;
  let b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h = 0,
    s = 0,
    l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  l = lightness / 100;
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  const toHex = (v: number) =>
    Math.round(v * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

type Props = {
  annotations: BubbleAnnotations;
};

/**
 * Renders saved annotations (freehand strokes + text boxes) on top of
 * a message bubble. Uses a canvas for strokes and absolutely positioned
 * divs for text boxes. All coordinates are 0-1 fractions of the parent.
 */
export const BubbleAnnotationDisplay = React.memo(
  function BubbleAnnotationDisplay({ annotations }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [dims, setDims] = useState<{ w: number; h: number } | null>(null);

    useEffect(() => {
      const el = containerRef.current;
      if (!el) return;
      const measure = () => {
        const w = el.offsetWidth;
        const h = el.offsetHeight;
        if (w > 0 && h > 0) setDims({ w, h });
      };
      measure();
      const ro = new ResizeObserver(measure);
      ro.observe(el);
      return () => ro.disconnect();
    }, []);

    // Build sorted layers for interleaved rendering
    type LayerItem =
      | { kind: "stroke"; stroke: AnnotationStroke; idx: number; z: number }
      | { kind: "textbox"; box: AnnotationTextBox; idx: number; z: number };

    const sortedLayers: LayerItem[] = [
      ...(annotations.strokes ?? []).map((stroke, idx) => ({
        kind: "stroke" as const,
        stroke,
        idx,
        z: stroke.zOrder ?? 0,
      })),
      ...(annotations.textBoxes ?? []).map((box, idx) => ({
        kind: "textbox" as const,
        box,
        idx,
        z: box.zOrder ?? 0,
      })),
    ].sort((a, b) => a.z - b.z);

    return (
      <div
        ref={containerRef}
        className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl"
        style={{ zIndex: 2 }}
      >
        {dims &&
          sortedLayers.map((layer) => {
            if (layer.kind === "stroke") {
              const stroke = layer.stroke;
              if (stroke.points.length < 2) return null;
              const d = stroke.points
                .map((p, pi) =>
                  pi === 0
                    ? `M${p.x * dims.w} ${p.y * dims.h}`
                    : `L${p.x * dims.w} ${p.y * dims.h}`,
                )
                .join(" ");
              return (
                <svg
                  key={`s-${layer.idx}`}
                  className="absolute inset-0"
                  viewBox={`0 0 ${dims.w} ${dims.h}`}
                  style={{ zIndex: layer.z }}
                >
                  <path
                    d={d}
                    fill="none"
                    stroke={stroke.color}
                    strokeWidth={stroke.width}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              );
            }
            // Text box
            const box = layer.box;
            return (
              <div
                key={`t-${layer.idx}`}
                className="absolute"
                style={{
                  left: `${box.x * 100}%`,
                  top: `${box.y * 100}%`,
                  width: `${box.boxWidth * 100}%`,
                  transform: box.rotation
                    ? `rotate(${box.rotation}deg)`
                    : undefined,
                  zIndex: layer.z,
                }}
              >
                <div
                  style={{
                    color: adjustHexLightness(
                      box.color,
                      box.colorLightness ?? 50,
                    ),
                    fontSize: `${box.fontSize}px`,
                    lineHeight: 1.3,
                    borderColor:
                      box.borderStyle === "none"
                        ? "transparent"
                        : box.borderColor,
                    borderStyle:
                      box.borderStyle === "none" ? "none" : box.borderStyle,
                    borderWidth:
                      box.borderStyle === "none" ? 0 : `${box.borderWidth}px`,
                    borderRadius: `${box.borderRadius}px`,
                    backgroundColor: hexToRgba(box.bgColor, box.bgOpacity),
                    padding: "2px 4px",
                    wordBreak: "break-word",
                  }}
                >
                  {box.text}
                </div>
              </div>
            );
          })}
      </div>
    );
  },
);
