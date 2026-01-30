// hooks/useTimelineNodes.ts
import { useEffect, useState, useCallback, useRef } from "react";

export function useTimelineNodes(timelineId?: string) {
  const [nodes, setNodes] = useState<TimelineNode[]>([]);
  const [loading, setLoading] = useState(false);
  const prevTimelineIdRef = useRef<string | undefined>(undefined);

  const fetchNodes = useCallback(async (tlId?: string) => {
    setLoading(true);
    try {
      const url = tlId 
        ? `/api/fb/fetch-nodes?timelineId=${encodeURIComponent(tlId)}`
        : "/api/fb/fetch-nodes";
      const res = await fetch(url);
      const json = await res.json();
     if (json?.ok && Array.isArray(json.data)) {
      console.log("useTimelineNodes", json.data);
      
  setNodes(json.data as TimelineNode[]);
}
 else {
        console.error("fetch-nodes error", json);
      }
    } catch (err) {
      console.error("fetchNodes error", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch nodes when timelineId changes
  useEffect(() => {
    if (timelineId !== prevTimelineIdRef.current) {
      prevTimelineIdRef.current = timelineId;
      if (timelineId) {
        fetchNodes(timelineId);
      } else {
        setNodes([]);
      }
    }
  }, [timelineId, fetchNodes]);

  const saveNode = useCallback(
    async (payload: TimelineNode) => {
      try {
        const dataToSend = {
          nodeId: payload.nodeId,
          timelineId: payload.timelineId,
          title: payload.title,
          description: payload.description ?? null,
          link: payload.link ?? null,
          dateMs: payload.dateMs,
          images: payload.images ?? [],
          color: payload.color ?? null,
        };

        const res = await fetch("/api/fb/save-node", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(dataToSend),
        });
        const json = await res.json();
        if (json?.ok && json.data) {
          const raw = json.data;
          const saved: TimelineNode = {
            nodeId: raw.$id ?? raw.nodeId ?? raw.id,
            timelineId: raw.timelineId ?? payload.timelineId,
            title: raw.title ?? raw.data?.title ?? payload.title,
            description: raw.description ?? raw.data?.description ?? payload.description ?? null,
            link: raw.link ?? raw.data?.link ?? payload.link ?? null,
            dateMs: raw.dateMs ?? (raw.date ? new Date(raw.date).getTime() : payload.dateMs),
            images: raw.images ?? payload.images ?? [],
            color: raw.color ?? payload.color ?? null,
          };
          setNodes((s) => {
            const exists = s.find((n) => n.nodeId === saved.nodeId);
            if (exists) {
              return s.map((n) => (n.nodeId === saved.nodeId ? saved : n));
            } else {
              return [...s, saved].sort((a, b) => a.dateMs - b.dateMs);
            }
          });
          return saved;
        } else {
          throw new Error(json?.error ?? "save-node failed");
        }
      } catch (err) {
        console.error("saveNode error", err);
        throw err;
      }
    },
    []
  );

  const deleteNode = useCallback(
    async (nodeId: string) => {
      try {
        const res = await fetch("/api/fb/delete-node", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nodeId }),
        });
        const json = await res.json();
        if (json?.ok) {
          // Remove from local state
          setNodes((s) => s.filter((n) => n.nodeId !== nodeId));
        } else {
          throw new Error(json?.error ?? "delete-node failed");
        }
      } catch (err) {
        console.error("deleteNode error", err);
        throw err;
      }
    },
    []
  );

  return { nodes, loading, fetchNodes, saveNode, deleteNode };
}

