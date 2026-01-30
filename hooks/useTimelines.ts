// hooks/useTimelines.ts
import { useEffect, useState, useCallback, useRef } from "react";

export function useTimelines(filterByUserId?: string | null) {
  const [allTimelines, setAllTimelines] = useState<Timeline[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTimeline, setActiveTimeline] = useState<Timeline | null>(null);
  const hasFetched = useRef(false);
  const prevFilterRef = useRef<string | null | undefined>(undefined);

  // Filtered timelines based on userId
  const timelines = filterByUserId
    ? allTimelines.filter((t) => t.userId === filterByUserId)
    : allTimelines;

  const fetchTimelines = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/fb/fetch-timelines");
      const json = await res.json();
      if (json?.ok && Array.isArray(json.data)) {
        console.log("useTimelines", json.data);
        setAllTimelines(json.data as Timeline[]);
      } else {
        console.error("fetch-timelines error", json);
      }
    } catch (err) {
      console.error("fetchTimelines error", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchTimelines();
    }
  }, [fetchTimelines]);

  // Auto-select first timeline when filter changes or timelines load
  useEffect(() => {
    if (filterByUserId !== prevFilterRef.current) {
      prevFilterRef.current = filterByUserId;
      // Reset active timeline when switching users
      if (timelines.length > 0) {
        setActiveTimeline(timelines[0]);
      } else {
        setActiveTimeline(null);
      }
    } else if (!activeTimeline && timelines.length > 0) {
      setActiveTimeline(timelines[0]);
    }
  }, [filterByUserId, timelines, activeTimeline]);

  const saveTimeline = useCallback(async (payload: Timeline) => {
    try {
      const dataToSend = {
        timelineId: payload.timelineId,
        userId: payload.userId ?? null,
        name: payload.name,
        description: payload.description ?? null,
        color: payload.color ?? null,
      };

      const res = await fetch("/api/fb/save-timeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataToSend),
      });
      const json = await res.json();
      if (json?.ok && json.data) {
        const saved = json.data as Timeline;
        setAllTimelines((prev) => {
          const idx = prev.findIndex(
            (t) => t.timelineId === saved.timelineId
          );
          if (idx >= 0) {
            const updated = [...prev];
            updated[idx] = saved;
            return updated;
          }
          return [saved, ...prev];
        });
        return saved;
      } else {
        console.error("save-timeline error", json);
        return null;
      }
    } catch (err) {
      console.error("saveTimeline error", err);
      return null;
    }
  }, []);

  const deleteTimeline = useCallback(async (timelineId: string) => {
    try {
      const res = await fetch(
        `/api/fb/delete-timeline?timelineId=${encodeURIComponent(timelineId)}`,
        { method: "DELETE" }
      );
      const json = await res.json();
      if (json?.ok) {
        setAllTimelines((prev) =>
          prev.filter((t) => t.timelineId !== timelineId)
        );
        // If deleted timeline was active, clear selection
        setActiveTimeline((current) =>
          current?.timelineId === timelineId ? null : current
        );
        return true;
      } else {
        console.error("delete-timeline error", json);
        return false;
      }
    } catch (err) {
      console.error("deleteTimeline error", err);
      return false;
    }
  }, []);

  const selectTimeline = useCallback((timeline: Timeline | null) => {
    setActiveTimeline(timeline);
  }, []);

  return {
    timelines,
    loading,
    activeTimeline,
    fetchTimelines,
    saveTimeline,
    deleteTimeline,
    selectTimeline,
  };
}
