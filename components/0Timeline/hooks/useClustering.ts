// hooks/useClustering.ts

/**
 * clusterByPixelThreshold:
 * - events: TimelineNode[] sorted ascending by dateMs
 * - getX: ms -> px
 */
export function clusterByPixelThreshold(events: TimelineNode[], getX: (ms:number)=>number, thresholdPx = 28) {
  const clusters: { ids: string[]; centerMs: number; items: TimelineNode[] }[] = [];
  let current: { ids: string[]; centerMs: number; items: TimelineNode[] } | null = null;

  for (const ev of events) {
    const ms = ev.dateMs;
    const x = getX(ms);

    if (!current) {
      current = { ids: [ev.nodeId ?? ev.title], centerMs: ms, items: [ev] };
      continue;
    }

    const centerX = getX(current.centerMs);
    if (Math.abs(x - centerX) <= thresholdPx) {
      current.ids.push(ev.nodeId ?? ev.title);
      current.items.push(ev);
      current.centerMs = Math.round((current.centerMs * (current.items.length - 1) + ms) / current.items.length);
    } else {
      clusters.push(current);
      current = { ids: [ev.nodeId ?? ev.title], centerMs: ms, items: [ev] };
    }
  }

  if (current) clusters.push(current);
  return clusters;
}
