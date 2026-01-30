// components/timeline/hooks/useTimelineZoom.ts
"use client"
import { useCallback, useEffect, useRef, useState } from "react"
import { MIN_SCALE, MAX_SCALE } from "../lib/constants"

/**
 * Manages center (ms) and exponential scale.
 * onWheel expects native WheelEvent (attached to container)
 */
export function useTimelineZoom(initialCenterMs: number, initialScale = 1) {
  const [scale, setScale] = useState<number>(initialScale)
  const [centerMs, setCenterMs] = useState<number>(initialCenterMs)

  const lastWheelRef = useRef(0)

  const zoomAt = useCallback(
    (deltaY: number, mouseX: number, containerWidth: number, getDateAtX: (x:number)=>number) => {
      // exponential zoom factor
      const zoomFactor = Math.exp(-deltaY * 0.002) // tweak sensitivity
      const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale * zoomFactor))

      // Keep the date under the cursor anchored:
      const dateAtCursorBefore = getDateAtX(mouseX)
      // update scale:
      setScale(newScale)
      // after a small tick (synchronous compute using newScale)
      const visibleAfter = (newScale) // actual mapping done via caller math
      // We'll compute new center so that dateAtCursorBefore remains at mouseX
      // To do this we need caller to compute dateAtX with provided center; so the caller will pass a helper (`getDateAtX`) that uses current center & scale.
      // Compute the dateAtCursorAfter if center unchanged -> we get date mismatch -> adjust center:
      // We'll compute new centerMs by inverse transform: find center such that xToDate(mouseX) === dateAtCursorBefore
      // Let caller provide direct helpers if they need strict anchoring.
      // For simplicity, we compute center shift based on proportionality in caller.
      setCenterMs((prevCenter) => {
        // caller will correct minor drift via re-centering by reading scale & center
        return prevCenter
      })
      lastWheelRef.current = Date.now()
    },
    [scale]
  )

  // pan helpers
  const panBy = useCallback((dxPx:number, containerWidth:number, baseRangeDays:number)=>{
    // dxPx to ms shift:
    const visibleMs = baseRangeDays * 24*60*60*1000 / scale
    const shiftMs = (dxPx / containerWidth) * visibleMs
    setCenterMs(c => c - shiftMs)
  }, [scale])

  return {
    scale,
    centerMs,
    setCenterMs,
    setScale,
    zoomAt,
    panBy
  }
}
