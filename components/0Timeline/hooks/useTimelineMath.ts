// components/timeline/hooks/useTimelineMath.ts
"use client"
import { MS_PER_DAY } from "../lib/constants"

export function dateToMs(d: string | Date) {
  return typeof d === "string" ? new Date(d).getTime() : d.getTime()
}

export function msToDateString(ms: number) {
  return new Date(ms).toISOString()
}

/**
 * Map date (ms) -> x (px) within containerWidth based on centerMs & scale.
 * visibleRangeMs = baseRangeMs / scale
 */
export function dateToX(
  dateMs: number,
  centerMs: number,
  scale: number,
  containerWidth: number,
  baseRangeDays: number
) {
  const visibleMs = baseRangeDays * MS_PER_DAY / scale
  const start = centerMs - visibleMs / 2
  const t = (dateMs - start) / visibleMs
  return t * containerWidth
}

export function xToDateMs(
  x: number,
  centerMs: number,
  scale: number,
  containerWidth: number,
  baseRangeDays: number
) {
  const visibleMs = baseRangeDays * MS_PER_DAY / scale
  const start = centerMs - visibleMs / 2
  return start + (x / containerWidth) * visibleMs
}
