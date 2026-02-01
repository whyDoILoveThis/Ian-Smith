// components/timeline/TimelineRoot.tsx
"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMounted } from "./hooks/useMounted";
import { useTimelineNodes } from "@/hooks/useTimelineNodes";
import { useTimelines } from "@/hooks/useTimelines";
import { useUsers } from "@/hooks/useUsers";
import { useTimelineZoom } from "./hooks/useTimelineZoom";
import { dateToMs, dateToX, xToDateMs } from "./hooks/useTimelineMath";
import { BASE_RANGE_DAYS, MS_PER_DAY } from "./lib/constants";
import { useAuth, useUser } from "@clerk/nextjs";
import TimelineCanvas from "./TimelineCanvas";
import TimelineNodes from "./TimelineNodes";
import TimelineCreateUI from "./TimelineCreateUI";
import HorizontalTimelineIcon from "../sub/HorizontalTimelineIcon";
import TimelineHeader from "./TimelineHeader";
import TimelineListOfTimelines from "./TimelineListOfTimelines";
import TimelineListOfUsers from "./TimelineListOfUsers";
import TimelineSettings from "./TimelineSettings";
import { appwrImgUp } from "@/appwrite/appwrStorage";
import {
  AITimelineModal,
  AIUnsavedBanner,
  type GeneratedTimeline,
} from "./TimelineAI";

/**
 * TimelineRoot — now wired to useTimelineNodes (Appwrite persistence)
 * - single source of truth: TimelineNode (dateMs)
 * - retains pointer-lock pan, fake cursor, trail, zoom, clustering, and year-pop UI
 */

export default function TimelineRoot({
  startDate,
  endDate,
}: {
  startDate?: string;
  endDate?: string;
}) {
  const mounted = useMounted();

  // Auth state
  const { userId } = useAuth();
  const { user: clerkUser } = useUser();

  // User viewing state - null means viewing own timelines
  const [viewingUser, setViewingUser] = useState<TimelineUser | null>(null);
  const [showAllTimelines, setShowAllTimelines] = useState(false);

  // Users hook
  const {
    users,
    loading: usersLoading,
    getOrCreateUser,
    addTimelineToUser,
  } = useUsers();

  // Determine which user's timelines to show
  const viewingUserId = showAllTimelines
    ? null
    : (viewingUser?.clerkUserId ?? userId ?? null);

  // timelines hook (for multiple timelines support) - filtered by user
  const {
    timelines,
    loading: timelinesLoading,
    activeTimeline,
    saveTimeline,
    deleteTimeline,
    selectTimeline,
  } = useTimelines(viewingUserId);

  // nodes persistence hook - fetches nodes for the active timeline
  const { nodes, loading, saveNode, fetchNodes, deleteNode } = useTimelineNodes(
    activeTimeline?.timelineId,
  );

  // timelines modal state
  const [showTimelinesModal, setShowTimelinesModal] = useState(false);

  // timeline settings modal state
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // users modal state
  const [showUsersModal, setShowUsersModal] = useState(false);

  // AI timeline modal state
  const [showAIModal, setShowAIModal] = useState(false);

  // Unsaved AI-generated timeline preview - persisted to localStorage
  const [aiPreviewTimeline, setAiPreviewTimeline] =
    useState<GeneratedTimeline | null>(() => {
      if (typeof window === "undefined") return null;
      try {
        const saved = localStorage.getItem("ai-preview-timeline");
        return saved ? JSON.parse(saved) : null;
      } catch {
        return null;
      }
    });

  // Persist preview timeline to localStorage whenever it changes
  useEffect(() => {
    if (aiPreviewTimeline) {
      localStorage.setItem(
        "ai-preview-timeline",
        JSON.stringify(aiPreviewTimeline),
      );
    } else {
      localStorage.removeItem("ai-preview-timeline");
    }
  }, [aiPreviewTimeline]);

  // Track if preview timeline is currently active (selected)
  const [isPreviewActive, setIsPreviewActive] = useState(false);

  // Determine if current user owns the active timeline
  const isOwner = !!(
    userId &&
    activeTimeline?.userId &&
    activeTimeline.userId === userId
  );

  // Can create timelines only if signed in and viewing own dashboard
  const canCreate = !!(userId && !viewingUser);

  // Can edit nodes only if signed in and is owner
  const canEdit = !!(userId && isOwner);

  // view & layout refs
  const containerRef = useRef<HTMLDivElement | null>(null);

  // timeline viewport / zoom
  const nowMs = Date.now();
  const initialCenterMs = startDate
    ? (dateToMs(startDate) + (endDate ? dateToMs(endDate) : nowMs)) / 2
    : nowMs;
  const { scale, centerMs, setCenterMs, setScale, panBy } = useTimelineZoom(
    initialCenterMs,
    1,
  );

  // Get current nodes (either preview or regular)
  const currentNodes = useMemo(() => {
    return isPreviewActive && aiPreviewTimeline 
      ? aiPreviewTimeline.nodes.map((n, i) => ({
          nodeId: `ai-preview-${i}`,
          timelineId: "ai-preview",
          title: n.title,
          description: n.description ?? null,
          link: null,
          dateMs: n.dateMs,
          images: [],
          color: n.color ?? aiPreviewTimeline.color ?? "#06b6d4",
        }))
      : nodes || [];
  }, [isPreviewActive, aiPreviewTimeline, nodes]);

  // Center on first node
  const centerOnFirstNode = useCallback(() => {
    if (currentNodes.length > 0) {
      const firstNode = currentNodes.reduce((earliest, node) => 
        node.dateMs < earliest.dateMs ? node : earliest
      );
      setCenterMs(firstNode.dateMs);
    }
  }, [currentNodes, setCenterMs]);

  // Center on last node
  const centerOnLastNode = useCallback(() => {
    if (currentNodes.length > 0) {
      const lastNode = currentNodes.reduce((latest, node) => 
        node.dateMs > latest.dateMs ? node : latest
      );
      setCenterMs(lastNode.dateMs);
    }
  }, [currentNodes, setCenterMs]);

  // panning state (refs for perf)
  const isPanningRef = useRef(false);
  const lastXRef = useRef<number>(0);
  const dragDistanceRef = useRef<number>(0);
  const isPinchingRef = useRef(false);
  const pinchInitialDistanceRef = useRef<number>(0);
  const pinchInitialScaleRef = useRef<number>(1);
  const pinchMidLocalXRef = useRef<number>(0);
  const inertiaRafRef = useRef<number>(0);
  const inertiaActiveRef = useRef(false);

  // visual fake cursor + trail
  const fakeCursorRef = useRef<HTMLDivElement | null>(null);
  const cursorOrbRef = useRef<HTMLDivElement | null>(null);
  const trailRefs = useRef<HTMLDivElement[]>([]);
  const mouseX = useRef<number>(0);
  const mouseY = useRef<number>(0);
  const velocityRef = useRef<number>(0);
  const trailPositions = useRef(
    Array.from({ length: 8 }, () => ({ x: 0, y: 0 })),
  );

  // mouse down panning clash with click events fix
  const pendingPanRef = useRef(false);

  // "show all hover cards" mode
  const [showAllCards, setShowAllCards] = useState(false);

  // container width
  const [containerWidth, setContainerWidth] = useState<number>(
    containerRef.current?.clientWidth || 1200,
  );

  // Auto-select or open modal based on timelines state
  useEffect(() => {
    if (timelinesLoading) return;
    // Don't auto-select if the AI preview is currently active
    if (isPreviewActive) return;
    if (!activeTimeline) {
      if (timelines.length > 0) {
        // Auto-select the first available timeline when none is active
        selectTimeline(timelines[0]);
      } else {
        // No timelines exist — ensure the modal opens so user can create one
        setShowTimelinesModal(true);
      }
    }
  }, [
    activeTimeline,
    timelines,
    timelinesLoading,
    selectTimeline,
    isPreviewActive,
  ]);

  // Auto-center on first node when active timeline or preview changes
  useEffect(() => {
    if (currentNodes.length > 0) {
      centerOnFirstNode();
    }
  }, [activeTimeline?.timelineId, isPreviewActive, aiPreviewTimeline, centerOnFirstNode, currentNodes.length]);

  useEffect(() => {
    if (!mounted) return;

    const update = () => {
      const el = containerRef.current;
      if (!el) return;
      const width = Math.round(el.getBoundingClientRect().width);
      if (width > 0) setContainerWidth(width);
    };

    // measure after mount + next frame to avoid the "zoom fixes it" issue
    update();
    requestAnimationFrame(update);

    window.addEventListener("resize", update);

    const el = containerRef.current;
    const ro = el ? new ResizeObserver(() => update()) : null;
    if (el && ro) ro.observe(el);

    return () => {
      window.removeEventListener("resize", update);
      ro?.disconnect();
    };
  }, [mounted]);

  // helpers: ms <-> x
  const getXForMs = useCallback(
    (ms: number) =>
      dateToX(ms, centerMs, scale, containerWidth, BASE_RANGE_DAYS),
    [centerMs, scale, containerWidth],
  );
  const getDateMsForX = useCallback(
    (x: number) =>
      xToDateMs(x, centerMs, scale, containerWidth, BASE_RANGE_DAYS),
    [centerMs, scale, containerWidth],
  );

  // imperative helpers
  const setTrailOpacity = useCallback((value: number) => {
    trailRefs.current.forEach((el) => {
      if (el) el.style.opacity = String(value);
    });
    if (cursorOrbRef.current)
      cursorOrbRef.current.style.opacity = String(value);
    if (fakeCursorRef.current)
      fakeCursorRef.current.style.opacity = String(value);
  }, []);

  // -------------------------
  // Zoom (Alt+wheel) and shift-pan
  // -------------------------
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (e.altKey) {
        e.preventDefault();
        const rect = el.getBoundingClientRect();
        const mouseLocalX = e.clientX - rect.left;
        const beforeMs = getDateMsForX(mouseLocalX);
        const factor = Math.exp(-e.deltaY * 0.002);
        const newScale = Math.max(0.005, Math.min(500, scale * factor));
        setScale(newScale);
        const visibleMsAfter = (BASE_RANGE_DAYS * MS_PER_DAY) / newScale;
        const startAfter =
          beforeMs - (mouseLocalX / containerWidth) * visibleMsAfter;
        setCenterMs(startAfter + visibleMsAfter / 2);
        return;
      }
      if (e.shiftKey) {
        e.preventDefault();
        panBy(e.deltaY, containerWidth, BASE_RANGE_DAYS);
        return;
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel as any);
  }, [scale, getDateMsForX, setScale, setCenterMs, panBy, containerWidth]);

  // -------------------------
  // Create event flow (uses saveNode)
  // -------------------------
  const [createAtMs, setCreateAtMs] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const onTimelineClick = (e: React.MouseEvent) => {
    if (isPanningRef.current || dragDistanceRef.current > 6) {
      dragDistanceRef.current = 0;
      return;
    }
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ms = getDateMsForX(x);
    setCreateAtMs(ms);
  };

  // call saveNode (persist). saveNode updates the hook state internally.
  const createEvent = async (payload: TimelineNode) => {
    try {
      setIsCreating(true);

      // Handle image uploads if images were provided
      let finalImages: Screenshot[] = [];
      if (
        payload.images &&
        payload.images.length > 0 &&
        "lastModified" in payload.images[0]
      ) {
        // Images are File objects, upload them
        finalImages = await Promise.all(
          (payload.images as any as File[]).map(async (file) => {
            const imgData = await appwrImgUp(file);
            return {
              url: imgData.url,
              fileId: imgData.fileId,
            } as Screenshot;
          }),
        );
      } else if (payload.images && payload.images.length > 0) {
        // Images are already Screenshot objects
        finalImages = payload.images;
      }

      const node: TimelineNode = {
        nodeId: undefined,
        timelineId: activeTimeline?.timelineId,
        title: payload.title,
        description: payload.description ?? null,
        link: payload.link ?? null,
        dateMs: payload.dateMs ?? Date.now(),
        images: finalImages,
        color: payload.color ?? null,
      };

      await saveNode(node);
    } catch (err) {
      console.error("Failed to save node", err);
      // you could show a toast here
    } finally {
      setIsCreating(false);
      setCreateAtMs(null);
    }
  };

  // -------------------------
  // AI Timeline Generation
  // -------------------------
  const handleAIGenerate = async (generatedTimeline: GeneratedTimeline) => {
    if (!userId || !clerkUser) {
      throw new Error("You must be signed in to save AI-generated timelines");
    }

    try {
      // First ensure user exists in our DB
      await getOrCreateUser({
        clerkUserId: userId,
        displayName:
          clerkUser.fullName ||
          clerkUser.username ||
          clerkUser.primaryEmailAddress?.emailAddress ||
          "Unknown User",
        email: clerkUser.primaryEmailAddress?.emailAddress,
        imageUrl: clerkUser.imageUrl,
      });

      // Create the timeline
      const savedTimeline = await saveTimeline({
        name: generatedTimeline.name,
        description: generatedTimeline.description,
        color: generatedTimeline.color,
        userId,
      });

      if (!savedTimeline?.timelineId) {
        throw new Error("Failed to create timeline");
      }

      // Link timeline to user
      await addTimelineToUser(userId, savedTimeline.timelineId);

      // Create all nodes for this timeline
      for (const node of generatedTimeline.nodes) {
        await saveNode({
          nodeId: undefined,
          timelineId: savedTimeline.timelineId,
          title: node.title,
          description: node.description ?? null,
          link: null,
          dateMs: node.dateMs,
          images: [],
          color: node.color ?? null,
        });
      }

      // Select the newly created timeline
      selectTimeline(savedTimeline);

      // Center the view on the first event
      if (generatedTimeline.nodes.length > 0) {
        const firstNodeMs = Math.min(
          ...generatedTimeline.nodes.map((n) => n.dateMs),
        );
        setCenterMs(firstNodeMs);
      }

      setShowAIModal(false);
    } catch (err) {
      console.error("Failed to create AI timeline", err);
      throw err;
    }
  };

  // -------------------------
  // Pointer lock helpers
  // -------------------------
  const requestPointerLock = useCallback(() => {
    const el = containerRef.current as HTMLElement | null;
    if (!el) return;
    try {
      (el as any).requestPointerLock?.();
    } catch {
      /* ignore */
    }
  }, []);
  const exitPointerLock = useCallback(() => {
    try {
      (document as any).exitPointerLock?.();
    } catch {
      /* ignore */
    }
  }, []);
  const isPointerLocked = useCallback(
    () => document.pointerLockElement === containerRef.current,
    [],
  );

  // -------------------------
  // start/stop panning
  // -------------------------
  const startPanning = useCallback(
    (clientX: number, clientY: number) => {
      inertiaActiveRef.current = false;
      if (inertiaRafRef.current) cancelAnimationFrame(inertiaRafRef.current);
      isPanningRef.current = true;
      lastXRef.current = clientX;
      dragDistanceRef.current = 0;
      mouseX.current = clientX;
      mouseY.current = clientY;
      if (cursorOrbRef.current) cursorOrbRef.current.style.opacity = "1";
      setTrailOpacity(1);
      requestPointerLock();
    },
    [requestPointerLock, setTrailOpacity],
  );

  const stopPanning = useCallback(() => {
    const wasPanning = isPanningRef.current;
    isPanningRef.current = false;
    pendingPanRef.current = false;
    dragDistanceRef.current = 0;
    if (cursorOrbRef.current) cursorOrbRef.current.style.opacity = "0";
    setTrailOpacity(0);
    if (isPointerLocked()) exitPointerLock();
    if (wasPanning) {
      const initialV = velocityRef.current;
      if (Math.abs(initialV) > 0.5) {
        inertiaActiveRef.current = true;
        const friction = 0.92;
        const minV = 0.15;
        const step = () => {
          if (!inertiaActiveRef.current) return;
          velocityRef.current *= friction;
          const visibleMs = (BASE_RANGE_DAYS * MS_PER_DAY) / scale;
          const msPerPx = visibleMs / containerWidth;
          const deltaMs = velocityRef.current * msPerPx;
          setCenterMs((c) => c - deltaMs);
          if (Math.abs(velocityRef.current) <= minV) {
            inertiaActiveRef.current = false;
            return;
          }
          inertiaRafRef.current = requestAnimationFrame(step);
        };
        inertiaRafRef.current = requestAnimationFrame(step);
      }
    }
  }, [
    exitPointerLock,
    isPointerLocked,
    setTrailOpacity,
    scale,
    containerWidth,
    setCenterMs,
  ]);

  // ===============================
  // 🔒 ON MOUSE DOWN
  // ===============================
  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;

    pendingPanRef.current = true;
    lastXRef.current = e.clientX;
    dragDistanceRef.current = 0;

    mouseX.current = e.clientX;
    mouseY.current = e.clientY;
  };

  // ===============================
  // 🔒 ON MOUSE UP
  // ===============================
  const onMouseUp = (e: React.MouseEvent) => {
    stopPanning();
  };

  // ===============================
  // 📱 TOUCH START/END (mobile support)
  // ===============================
  const onTouchStart = (e: React.TouchEvent) => {
    inertiaActiveRef.current = false;
    if (inertiaRafRef.current) cancelAnimationFrame(inertiaRafRef.current);
    if (e.touches.length >= 2) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dx = t2.clientX - t1.clientX;
      const dy = t2.clientY - t1.clientY;
      pinchInitialDistanceRef.current = Math.hypot(dx, dy);
      pinchInitialScaleRef.current = scale;
      const midXClient = (t1.clientX + t2.clientX) / 2;
      pinchMidLocalXRef.current = midXClient - rect.left;
      isPinchingRef.current = true;
      pendingPanRef.current = false;
      isPanningRef.current = false;
    } else {
      const t = e.touches[0];
      if (!t) return;
      pendingPanRef.current = true;
      lastXRef.current = t.clientX;
      dragDistanceRef.current = 0;
      mouseX.current = t.clientX;
      mouseY.current = t.clientY;
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    stopPanning();
  };

  // -------------------------
  // document-level movement (pointer lock + fallback) + fake cursor teleport
  // -------------------------
  useEffect(() => {
    const onPointerLockChange = () => {
      if (!isPointerLocked()) {
        isPanningRef.current = false;
        if (cursorOrbRef.current) cursorOrbRef.current.style.opacity = "0";
        setTrailOpacity(0);
      }
    };
    const onPointerLockError = (ev: Event) =>
      console.warn("PointerLock error", ev);

    document.addEventListener("pointerlockchange", onPointerLockChange);
    document.addEventListener("pointerlockerror", onPointerLockError);

    // ===============================
    // 🔒 ON DOC MOUSE MOVE
    // ===============================
    const onDocMouseMove = (e: MouseEvent) => {
      // 🚫 nothing happening yet
      if (!isPanningRef.current && !pendingPanRef.current) return;

      const visibleMs = (BASE_RANGE_DAYS * MS_PER_DAY) / scale;
      const msPerPx = visibleMs / containerWidth;

      // 🔒 POINTER LOCK PATH
      if (isPointerLocked()) {
        const dx = (e as any).movementX ?? 0;
        const dy = (e as any).movementY ?? 0;

        mouseX.current += dx;
        mouseY.current += dy;

        // 🧠 PROMOTE TO REAL PAN ONLY AFTER INTENT
        if (pendingPanRef.current && Math.abs(dx) > 3) {
          pendingPanRef.current = false;
          startPanning(mouseX.current, mouseY.current);
        }

        if (!isPanningRef.current) return;

        const deltaMs = dx * msPerPx;
        setCenterMs((c) => c - deltaMs);

        dragDistanceRef.current += Math.abs(dx);
        velocityRef.current = dx;

        if (cursorOrbRef.current) cursorOrbRef.current.style.opacity = "1";
        setTrailOpacity(1);

        // 🔁 WRAP AROUND SCREEN
        if (mouseX.current <= 2) {
          mouseX.current = window.innerWidth - 4;
          trailPositions.current.forEach((p) => (p.x = mouseX.current));
        } else if (mouseX.current >= window.innerWidth - 2) {
          mouseX.current = 4;
          trailPositions.current.forEach((p) => (p.x = mouseX.current));
        }

        return;
      }

      // 🖱️ FALLBACK (NO POINTER LOCK)
      const dx = e.clientX - lastXRef.current;
      lastXRef.current = e.clientX;

      mouseX.current = e.clientX;
      mouseY.current = e.clientY;

      // 🧠 PROMOTE TO REAL PAN ONLY AFTER INTENT
      if (pendingPanRef.current && Math.abs(dx) > 3) {
        pendingPanRef.current = false;
        startPanning(mouseX.current, mouseY.current);
      }

      if (!isPanningRef.current) return;

      const deltaMs = dx * msPerPx;
      setCenterMs((c) => c - deltaMs);

      dragDistanceRef.current += Math.abs(dx);
      velocityRef.current = dx;

      if (cursorOrbRef.current) cursorOrbRef.current.style.opacity = "1";
      setTrailOpacity(1);

      // 🔁 WRAP AROUND SCREEN
      const threshold = 2;
      if (e.clientX <= threshold && dx < 0) {
        mouseX.current = window.innerWidth - threshold;
        lastXRef.current = mouseX.current;
        trailPositions.current.forEach((p) => (p.x = mouseX.current));
      } else if (e.clientX >= window.innerWidth - threshold && dx > 0) {
        mouseX.current = threshold;
        lastXRef.current = mouseX.current;
        trailPositions.current.forEach((p) => (p.x = mouseX.current));
      }
    };

    const onDocMouseUp = () => stopPanning();

    document.addEventListener("mousemove", onDocMouseMove);
    document.addEventListener("mouseup", onDocMouseUp);

    // ===============================
    // 📱 DOC TOUCH MOVE/END (mobile panning)
    // ===============================
    const onDocTouchMove = (e: TouchEvent) => {
      if (
        pendingPanRef.current ||
        isPanningRef.current ||
        isPinchingRef.current
      ) {
        e.preventDefault();
      }

      const touches = e.touches;
      if (touches.length >= 2) {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const t1 = touches[0];
        const t2 = touches[1];
        const dx = t2.clientX - t1.clientX;
        const dy = t2.clientY - t1.clientY;
        const dist = Math.hypot(dx, dy);
        if (!isPinchingRef.current) {
          pinchInitialDistanceRef.current = dist;
          pinchInitialScaleRef.current = scale;
          const midXClient = (t1.clientX + t2.clientX) / 2;
          pinchMidLocalXRef.current = midXClient - rect.left;
          isPinchingRef.current = true;
        }
        const factor = dist / (pinchInitialDistanceRef.current || dist);
        const newScale = Math.max(
          0.005,
          Math.min(500, pinchInitialScaleRef.current * factor),
        );
        const beforeMs = getDateMsForX(pinchMidLocalXRef.current);
        const visibleMsAfter = (BASE_RANGE_DAYS * MS_PER_DAY) / newScale;
        const startAfter =
          beforeMs -
          (pinchMidLocalXRef.current / containerWidth) * visibleMsAfter;
        setScale(newScale);
        setCenterMs(startAfter + visibleMsAfter / 2);
        pendingPanRef.current = false;
        isPanningRef.current = false;
        return;
      }

      if (!isPanningRef.current && !pendingPanRef.current) return;

      const t = touches[0];
      if (!t) return;

      const visibleMs = (BASE_RANGE_DAYS * MS_PER_DAY) / scale;
      const msPerPx = visibleMs / containerWidth;

      const dx = t.clientX - lastXRef.current;
      lastXRef.current = t.clientX;

      mouseX.current = t.clientX;
      mouseY.current = t.clientY;

      if (pendingPanRef.current && Math.abs(dx) > 3) {
        pendingPanRef.current = false;
        startPanning(mouseX.current, mouseY.current);
      }

      if (!isPanningRef.current) return;

      const deltaMs = dx * msPerPx;
      setCenterMs((c) => c - deltaMs);

      dragDistanceRef.current += Math.abs(dx);
      velocityRef.current = dx;

      if (cursorOrbRef.current) cursorOrbRef.current.style.opacity = "1";
      setTrailOpacity(1);
    };

    const onDocTouchEnd = () => stopPanning();

    document.addEventListener("touchmove", onDocTouchMove, { passive: false });
    document.addEventListener("touchend", onDocTouchEnd);

    return () => {
      document.removeEventListener("pointerlockchange", onPointerLockChange);
      document.removeEventListener("pointerlockerror", onPointerLockError);
      document.removeEventListener("mousemove", onDocMouseMove);
      document.removeEventListener("mouseup", onDocMouseUp);
      document.removeEventListener("touchmove", onDocTouchMove as any);
      document.removeEventListener("touchend", onDocTouchEnd as any);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    scale,
    containerWidth,
    setCenterMs,
    stopPanning,
    setTrailOpacity,
    isPointerLocked,
  ]);

  // -------------------------
  // rAF loop for visuals: fake arrow, orb, trailing dots
  // -------------------------
  useEffect(() => {
    let raf = 0;
    const animate = () => {
      if (fakeCursorRef.current)
        fakeCursorRef.current.style.transform = `translate(${mouseX.current}px, ${mouseY.current}px) translate(-50%, -50%)`;
      if (cursorOrbRef.current)
        cursorOrbRef.current.style.transform = `translate(${mouseX.current}px, ${mouseY.current}px) translate(-50%, -50%)`;

      trailPositions.current.forEach((pos, i) => {
        const target =
          i === 0
            ? { x: mouseX.current, y: mouseY.current }
            : trailPositions.current[i - 1];
        pos.x += (target.x - pos.x) * 0.25;
        pos.y += (target.y - pos.y) * 0.25;
        const el = trailRefs.current[i];
        if (el)
          el.style.transform = `translate(${pos.x}px, ${pos.y}px) translate(-50%, -50%) scale(${1 - i * 0.08})`;
      });

      raf = requestAnimationFrame(animate);
    };

    for (let i = 0; i < trailPositions.current.length; i++) {
      trailPositions.current[i].x = mouseX.current;
      trailPositions.current[i].y = mouseY.current;
    }

    animate();
    return () => cancelAnimationFrame(raf);
  }, []);

  // -------------------------
  // Mounted guard
  // -------------------------
  if (!mounted) {
    return (
      <div className="w-full h-screen bg-skin-900 flex items-center justify-center text-neutral-500">
        Loading timeline…
      </div>
    );
  }

  // -------------------------
  // UI
  // -------------------------
  return (
    <div className=" w-full h-full flex flex-col items-center bg-skin-900 text-neutral-200">
      <div className="w-full absolute">
        <TimelineHeader
          scale={scale}
          centerMs={centerMs}
          showAllCards={showAllCards}
          onToggleShowAll={() => setShowAllCards((v) => !v)}
          activeTimelineName={
            isPreviewActive ? aiPreviewTimeline?.name : activeTimeline?.name
          }
          onOpenTimelines={() => setShowTimelinesModal(true)}
          onOpenSettings={() => setShowSettingsModal(true)}
          onOpenUsers={() => setShowUsersModal(true)}
          onOpenAIModal={() => setShowAIModal(true)}
          hasActiveTimeline={!!activeTimeline || isPreviewActive}
          onCenterToday={() => setCenterMs(Date.now())}
          onCenterFirstNode={currentNodes.length > 0 ? centerOnFirstNode : undefined}
          onCenterLastNode={currentNodes.length > 0 ? centerOnLastNode : undefined}
          isOwner={isOwner}
          viewingUser={viewingUser}
          onGoHome={() => setViewingUser(null)}
        />

        {/* FAKE CURSOR ARROW (visible while dragging) */}
        <div
          ref={fakeCursorRef}
          className="fixed top-0 left-0 z-[200] pointer-events-none select-none"
          style={{
            width: 18,
            height: 24,
            opacity: 0,
            transform: "translate(-50%,-50%)",
            transition: "opacity 160ms linear",
          }}
          aria-hidden
        >
          {/* optional arrow SVG could go here */}
        </div>

        {/* ORB */}
        <div
          ref={cursorOrbRef}
          className="fixed top-0 left-0 pointer-events-none z-[199] w-6 h-6 rounded-full bg-cyan-400/60 blur-md transition-opacity duration-150 opacity-0"
          style={{ transform: "translate(-50%, -50%)" }}
        />

        {/* TRAIL DOTS */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            ref={(el) => {
              if (el) trailRefs.current[i] = el;
            }}
            className="fixed top-0 left-0 pointer-events-none z-[198] w-4 h-4 rounded-full bg-cyan-400/20 blur-lg transition-opacity duration-150 opacity-0"
            style={{ transform: "translate(-50%, -50%) scale(1)" }}
          />
        ))}

        <div
          ref={containerRef}
          onMouseDown={onMouseDown}
          onMouseUp={onMouseUp}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          className="relative w-full h-[600px] bg-gradient-to-b from-[#05060a] via-[#071019] to-[#071018] rounded-none border border-neutral-800 overflow-visible touch-none select-none"
        >
          <TimelineCanvas
            containerWidth={containerWidth}
            centerMs={centerMs}
            scale={scale}
            baseRangeDays={BASE_RANGE_DAYS}
            onTimelineClick={onTimelineClick}
          />

          {/* Show either AI Preview Timeline OR Regular Timeline based on isPreviewActive */}
          {isPreviewActive && aiPreviewTimeline ? (
            <TimelineNodes
              events={aiPreviewTimeline.nodes.map((n, i) => ({
                nodeId: `ai-preview-${i}`,
                timelineId: "ai-preview",
                title: n.title,
                description: n.description ?? null,
                link: null,
                dateMs: n.dateMs,
                images: [],
                color: n.color ?? aiPreviewTimeline.color ?? "#06b6d4",
              }))}
              getXForMs={getXForMs}
              containerWidth={containerWidth}
              centerMs={centerMs}
              scale={scale}
              baseRangeDays={BASE_RANGE_DAYS}
              onTimelineClick={undefined}
              saveNode={async (payload) => payload}
              deleteNode={async () => {}}
              isLoading={false}
              showAllCards={showAllCards}
              canEdit={false}
            />
          ) : activeTimeline ? (
            <TimelineNodes
              events={nodes || []}
              getXForMs={getXForMs}
              containerWidth={containerWidth}
              centerMs={centerMs}
              scale={scale}
              baseRangeDays={BASE_RANGE_DAYS}
              onTimelineClick={canEdit ? onTimelineClick : undefined}
              saveNode={saveNode}
              deleteNode={deleteNode}
              isLoading={loading}
              showAllCards={showAllCards}
              canEdit={canEdit}
            />
          ) : null}

          {/* Only show create UI if user can edit */}
          {canEdit && createAtMs !== null && (
            <TimelineCreateUI
              defaultDateMs={createAtMs}
              onClose={() => setCreateAtMs(null)}
              onCreate={createEvent}
              containerWidth={containerWidth}
              getXForMs={getXForMs}
              isLoading={isCreating}
            />
          )}
        </div>
      </div>

      {/* Timelines Modal */}
      {showTimelinesModal && (
        <TimelineListOfTimelines
          timelines={timelines}
          activeTimeline={activeTimeline}
          loading={timelinesLoading}
          onSelect={selectTimeline}
          onCreate={async (name, description, color) => {
            if (!userId || !clerkUser) return;

            // First ensure user exists in our DB
            await getOrCreateUser({
              clerkUserId: userId,
              displayName:
                clerkUser.fullName ||
                clerkUser.username ||
                clerkUser.primaryEmailAddress?.emailAddress ||
                "Unknown User",
              email: clerkUser.primaryEmailAddress?.emailAddress,
              imageUrl: clerkUser.imageUrl,
            });

            // Create timeline with userId
            const saved = await saveTimeline({
              name,
              description,
              color,
              userId,
            });

            // Link timeline to user
            if (saved?.timelineId) {
              await addTimelineToUser(userId, saved.timelineId);
            }
          }}
          onClose={() => setShowTimelinesModal(false)}
          canCreate={canCreate}
          isViewingOther={!!viewingUser}
          currentUserId={userId ?? undefined}
          users={users}
          viewingUser={viewingUser}
          showAllTimelines={showAllTimelines}
          onToggleShowAll={() => {
            setViewingUser(null);
            setShowAllTimelines((v) => !v);
          }}
          previewTimeline={aiPreviewTimeline}
          isPreviewActive={isPreviewActive}
          onSelectPreview={() => {
            setIsPreviewActive(true);
            setShowTimelinesModal(false);
          }}
          onSelectRegularTimeline={(timeline) => {
            setIsPreviewActive(false);
            selectTimeline(timeline);
            setShowTimelinesModal(false);
          }}
          onDiscardPreview={() => {
            setAiPreviewTimeline(null);
            setIsPreviewActive(false);
          }}
        />
      )}

      {/* Users Modal */}
      {showUsersModal && (
        <TimelineListOfUsers
          users={users}
          loading={usersLoading}
          currentUserId={userId}
          onSelectUser={(user) => {
            // If selecting self, go to own dashboard
            if (user.clerkUserId === userId) {
              setViewingUser(null);
              setShowAllTimelines(false);
            } else {
              setViewingUser(user);
              setShowAllTimelines(false);
            }
          }}
          onGoHome={() => {
            setViewingUser(null);
            setShowAllTimelines(false);
          }}
          onClose={() => setShowUsersModal(false)}
        />
      )}

      {/* Timeline Settings Modal */}
      {showSettingsModal && activeTimeline && (
        <TimelineSettings
          timeline={activeTimeline}
          onSave={async (updated) => {
            await saveTimeline(updated);
          }}
          onDelete={async (timelineId) => {
            await deleteTimeline(timelineId);
          }}
          onClose={() => setShowSettingsModal(false)}
        />
      )}

      {/* AI Timeline Modal */}
      <AITimelineModal
        isOpen={showAIModal}
        onClose={() => setShowAIModal(false)}
        onGenerate={handleAIGenerate}
        onPreviewClose={(timeline) => {
          setAiPreviewTimeline(timeline);
          if (timeline) {
            // Make preview active
            setIsPreviewActive(true);
          }
        }}
        isSignedIn={!!userId}
        existingPreview={aiPreviewTimeline}
      />

      {/* Unsaved AI Timeline Banner - only show when preview is active */}
      {aiPreviewTimeline && isPreviewActive && !showAIModal && (
        <AIUnsavedBanner
          timeline={aiPreviewTimeline}
          isSignedIn={!!userId}
          onOpenModal={() => setShowAIModal(true)}
          onDiscard={() => {
            setAiPreviewTimeline(null);
            setIsPreviewActive(false);
          }}
        />
      )}

      {/* year pop styles */}
      <style>{`
        @keyframes yearBoom {
          0% { transform: scale(1) rotate(0deg); text-shadow: none; }
          10% { transform: scale(1.4) rotate(-4deg); text-shadow: 0 0 20px rgba(255,255,255,0.9); filter: brightness(1.3) contrast(1.1); }
          30% { transform: scale(1.15) rotate(2deg); }
          60% { transform: scale(1.05) rotate(-1deg); }
          100% { transform: scale(1) rotate(0deg); text-shadow: none; filter: none; }
        }
        .year-pop { display:inline-block; animation: yearBoom 0.6s cubic-bezier(0.17,0.89,0.32,1.28) both; will-change: transform, filter; color: #fff; }
        @media (prefers-reduced-motion: reduce) { .year-pop { animation: none !important; } }
      `}</style>
    </div>
  );
}
