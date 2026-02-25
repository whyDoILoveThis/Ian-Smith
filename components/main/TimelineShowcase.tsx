"use client";

import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

/* -- Real timeline engine imports -- */
import TimelineCanvas from "@/components/0Timeline/TimelineCanvas";
import TimelineNodes from "@/components/0Timeline/TimelineNodes";
import TimelineHeader from "@/components/0Timeline/TimelineHeader";
import TimelineScrollHint from "@/components/0Timeline/TimelineScrollHint";
import { useTimelineInertia } from "@/components/0Timeline/hooks/useTimelineInertia";
import {
  dateToX,
  xToDateMs,
} from "@/components/0Timeline/hooks/useTimelineMath";
import {
  BASE_RANGE_DAYS,
  MS_PER_DAY,
} from "@/components/0Timeline/lib/constants";

/* ===================================================================
   DEMO DATA - preset timeline nodes matching TimelineNode type
   =================================================================== */

const DEMO_NODES: TimelineNode[] = [
  // --- early cluster (close together → will cluster at default zoom) ---
  {
    nodeId: "demo-1",
    timelineId: "demo",
    title: "Research Phase",
    description:
      "Market research and feasibility study conducted across 3 target segments",
    dateMs: new Date("2021-03-10").getTime(),
    images: [{ url: "https://picsum.photos/seed/research/600/340" }],
    color: "#14b8a6",
  },
  {
    nodeId: "demo-2",
    timelineId: "demo",
    title: "Initial Concept",
    description: "First wireframes and concept docs created in Figma",
    dateMs: new Date("2021-04-02").getTime(),
    images: [{ url: "https://picsum.photos/seed/wireframe/600/340" }],
    color: "#06b6d4",
  },
  {
    nodeId: "demo-3",
    timelineId: "demo",
    title: "Team Formed",
    description: "Core contributors assembled — 4 engineers, 1 designer",
    dateMs: new Date("2021-04-28").getTime(),
    images: [],
    color: "#0ea5e9",
  },

  // --- spread out individual nodes ---
  {
    nodeId: "demo-4",
    timelineId: "demo",
    title: "First Prototype",
    description:
      "MVP delivered with core features including drag-and-drop and real-time sync",
    dateMs: new Date("2022-01-15").getTime(),
    images: [
      { url: "https://picsum.photos/seed/prototype/600/340" },
      { url: "https://picsum.photos/seed/mvp/600/340" },
    ],
    color: "#22c55e",
  },
  {
    nodeId: "demo-5",
    timelineId: "demo",
    title: "Beta Launch",
    description: "Public beta with early adopters — 200+ users in first week",
    dateMs: new Date("2022-11-08").getTime(),
    images: [{ url: "https://picsum.photos/seed/betalaunch/600/340" }],
    color: "#8b5cf6",
  },

  // --- mid cluster (close dates → cluster) ---
  {
    nodeId: "demo-6",
    timelineId: "demo",
    title: "Security Audit",
    description:
      "Third-party security review completed with zero critical findings",
    dateMs: new Date("2023-06-01").getTime(),
    images: [],
    color: "#ef4444",
  },
  {
    nodeId: "demo-7",
    timelineId: "demo",
    title: "Performance Pass",
    description: "Major perf optimizations shipped — 60% faster initial load",
    dateMs: new Date("2023-06-18").getTime(),
    images: [{ url: "https://picsum.photos/seed/perfchart/600/340" }],
    color: "#f97316",
  },

  // --- spread out ---
  {
    nodeId: "demo-8",
    timelineId: "demo",
    title: "AI Integration",
    description:
      "AI-powered timeline generation added — describe any topic and get a full timeline in seconds",
    dateMs: new Date("2024-02-12").getTime(),
    images: [
      { url: "https://picsum.photos/seed/aifeature/600/340" },
      { url: "https://picsum.photos/seed/aiui/600/340" },
    ],
    color: "#f59e0b",
  },
  {
    nodeId: "demo-9",
    timelineId: "demo",
    title: "Public Release",
    description: "Version 1.0 shipped to production with full documentation",
    dateMs: new Date("2024-09-20").getTime(),
    images: [{ url: "https://picsum.photos/seed/v1launch/600/340" }],
    color: "#ec4899",
  },

  // --- late cluster ---
  {
    nodeId: "demo-10",
    timelineId: "demo",
    title: "Multi-User Support",
    description:
      "Real-time collaboration added — multiple users can edit simultaneously",
    dateMs: new Date("2025-05-05").getTime(),
    images: [{ url: "https://picsum.photos/seed/collab/600/340" }],
    color: "#3b82f6",
  },
  {
    nodeId: "demo-11",
    timelineId: "demo",
    title: "V2 Shipped",
    description: "Major update with new UI, dark mode, and keyboard shortcuts",
    dateMs: new Date("2025-05-22").getTime(),
    images: [],
    color: "#6366f1",
  },
  {
    nodeId: "demo-12",
    timelineId: "demo",
    title: "Mobile App",
    description: "Native mobile companion launched on iOS and Android",
    dateMs: new Date("2025-06-10").getTime(),
    images: [{ url: "https://picsum.photos/seed/mobileapp/600/340" }],
    color: "#a855f7",
  },
];

/* ===================================================================
   TOAST - debounced so spam-clicking doesn't glitch
   =================================================================== */

function Toast({ visible, message }: { visible: boolean; message: string }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="showcase-toast"
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 px-5 py-3 rounded-xl
            bg-neutral-900 border border-cyan-500/30 shadow-xl shadow-cyan-500/10 text-sm text-white pointer-events-none"
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          {"\u2728"} {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ===================================================================
   Feature badge
   =================================================================== */

function FeatureBadge({
  icon,
  label,
  delay,
}: {
  icon: string;
  label: string;
  delay: number;
}) {
  return (
    <motion.div
      className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.05] border border-white/10 backdrop-blur-sm"
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.45 }}
    >
      <span className="text-base">{icon}</span>
      <span className="text-sm font-medium text-white/70">{label}</span>
    </motion.div>
  );
}

/* ===================================================================
   Floating particles
   =================================================================== */

function useFloatingParticles(count = 14) {
  const [particles, setParticles] = useState<
    {
      id: number;
      x: number;
      delay: number;
      duration: number;
      size: number;
      opacity: number;
    }[]
  >([]);

  useEffect(() => {
    setParticles(
      Array.from({ length: count }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 8,
        duration: 12 + Math.random() * 10,
        size: 2 + Math.random() * 4,
        opacity: 0.15 + Math.random() * 0.2,
      })),
    );
  }, [count]);

  return particles;
}

/* ===================================================================
   MAIN SHOWCASE
   =================================================================== */

export default function TimelineShowcase() {
  const particles = useFloatingParticles(12);

  /* -- Timeline engine state -- */
  const initialCenterMs = useMemo(() => {
    const first = Math.min(...DEMO_NODES.map((n) => n.dateMs));
    const last = Math.max(...DEMO_NODES.map((n) => n.dateMs));
    return (first + last) / 2;
  }, []);

  const [centerMs, setCenterMs] = useState(initialCenterMs);
  const [scale, setScale] = useState(1);
  const [showAllCards, setShowAllCards] = useState(false);

  /* -- Container measurement -- */
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(800);

  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        const w = Math.round(
          containerRef.current.getBoundingClientRect().width,
        );
        if (w > 0) setContainerWidth(w);
      }
    };
    update();
    requestAnimationFrame(update);
    window.addEventListener("resize", update);
    const ro = containerRef.current ? new ResizeObserver(update) : null;
    if (containerRef.current && ro) ro.observe(containerRef.current);
    return () => {
      window.removeEventListener("resize", update);
      ro?.disconnect();
    };
  }, []);

  /* -- Coordinate helpers (same as TimelineRoot) -- */
  const getXForMs = useCallback(
    (ms: number) =>
      dateToX(ms, centerMs, scale, containerWidth, BASE_RANGE_DAYS),
    [centerMs, scale, containerWidth],
  );
  const getMsForX = useCallback(
    (x: number) =>
      xToDateMs(x, centerMs, scale, containerWidth, BASE_RANGE_DAYS),
    [centerMs, scale, containerWidth],
  );

  /* -- Zoom (Alt+wheel) & scroll-pan (Ctrl+wheel) -- */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      // Let scrollable children (hover cards, cluster panels) handle their own scroll
      const target = e.target as HTMLElement;
      if (target.closest(".overflow-y-auto, .overflow-auto, .customScroll"))
        return;

      if (e.altKey) {
        e.preventDefault();
        const rect = el.getBoundingClientRect();
        const mouseLocalX = e.clientX - rect.left;
        const beforeMs = getMsForX(mouseLocalX);
        const factor = Math.exp(-e.deltaY * 0.002);
        const newScale = Math.max(0.005, Math.min(500, scale * factor));
        setScale(newScale);
        const visibleMsAfter = (BASE_RANGE_DAYS * MS_PER_DAY) / newScale;
        const startAfter =
          beforeMs - (mouseLocalX / containerWidth) * visibleMsAfter;
        setCenterMs(startAfter + visibleMsAfter / 2);
        return;
      }

      if (e.ctrlKey) {
        // Ctrl + scroll -> pan
        e.preventDefault();
        const visibleMs = (BASE_RANGE_DAYS * MS_PER_DAY) / scale;
        const shiftMs = ((e.deltaY + e.deltaX) / containerWidth) * visibleMs;
        setCenterMs((c) => c + shiftMs);
        return;
      }

      // No modifier -> let the page scroll normally
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [scale, getMsForX, containerWidth, setCenterMs]);

  /* -- Drag panning with inertia (shared hook) -- */
  const { handlers: panHandlers, stopInertia } = useTimelineInertia(
    scale,
    containerWidth,
    setCenterMs,
  );

  /* -- Pinch-to-zoom (mobile) -- */
  const isPinchingRef = useRef(false);
  const pinchInitialDistRef = useRef(0);
  const pinchInitialScaleRef = useRef(0);
  const pinchMidLocalXRef = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length >= 2) {
      stopInertia();
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const t1 = e.touches[0],
        t2 = e.touches[1];
      pinchInitialDistRef.current = Math.hypot(
        t2.clientX - t1.clientX,
        t2.clientY - t1.clientY,
      );
      pinchInitialScaleRef.current = scale;
      pinchMidLocalXRef.current = (t1.clientX + t2.clientX) / 2 - rect.left;
      isPinchingRef.current = true;
      return;
    }
    isPinchingRef.current = false;
    panHandlers.onTouchStart(e);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isPinchingRef.current || e.touches.length >= 2) {
      if (e.touches.length < 2) return;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const t1 = e.touches[0],
        t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      if (!isPinchingRef.current) {
        pinchInitialDistRef.current = dist;
        pinchInitialScaleRef.current = scale;
        pinchMidLocalXRef.current = (t1.clientX + t2.clientX) / 2 - rect.left;
        isPinchingRef.current = true;
      }
      const factor = dist / (pinchInitialDistRef.current || dist);
      const newScale = Math.max(
        0.005,
        Math.min(500, pinchInitialScaleRef.current * factor),
      );
      const beforeMs = getMsForX(pinchMidLocalXRef.current);
      const visibleMsAfter = (BASE_RANGE_DAYS * MS_PER_DAY) / newScale;
      const startAfter =
        beforeMs -
        (pinchMidLocalXRef.current / containerWidth) * visibleMsAfter;
      setScale(newScale);
      setCenterMs(startAfter + visibleMsAfter / 2);
      return;
    }
    panHandlers.onTouchMove(e);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (isPinchingRef.current) {
      if (e.touches.length < 2) isPinchingRef.current = false;
      return;
    }
    panHandlers.onTouchEnd();
  };

  /* -- Center helpers for header nav -- */
  const centerOnFirstNode = useCallback(() => {
    const first = DEMO_NODES.reduce((a, b) => (a.dateMs < b.dateMs ? a : b));
    setCenterMs(first.dateMs);
  }, []);

  const centerOnLastNode = useCallback(() => {
    const last = DEMO_NODES.reduce((a, b) => (a.dateMs > b.dateMs ? a : b));
    setCenterMs(last.dateMs);
  }, []);

  /* -- Toast (debounced - fixes spam-click glitch) -- */
  const [showToast, setShowToast] = useState(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fireToast = useCallback(() => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setShowToast(true);
    toastTimerRef.current = setTimeout(() => {
      setShowToast(false);
      toastTimerRef.current = null;
    }, 2500);
  }, []);

  /* -- No-op save/delete for the demo -- */
  const noopSave = useCallback(async (payload: TimelineNode) => payload, []);
  const noopDelete = useCallback(async () => {}, []);

  return (
    <section className="relative w-full max-w-5xl mx-auto px-4">
      {/* -- Background glow -- */}
      <div className="absolute inset-0 -z-10 overflow-hidden rounded-3xl">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-20 blur-[120px]"
          style={{
            background:
              "radial-gradient(circle, #06b6d4 0%, #3b82f6 40%, transparent 70%)",
          }}
        />
      </div>

      {/* -- Floating particles -- */}
      <div className="absolute inset-0 -z-5 overflow-hidden rounded-3xl pointer-events-none">
        {particles.map((p) => (
          <motion.div
            key={p.id}
            className="absolute rounded-full"
            style={{
              left: `${p.x}%`,
              bottom: -10,
              width: p.size,
              height: p.size,
              background: `radial-gradient(circle, rgba(6,182,212,${p.opacity}) 0%, transparent 70%)`,
            }}
            animate={{
              y: [0, -600],
              opacity: [0, p.opacity, p.opacity * 0.8, 0],
            }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        ))}
      </div>

      {/* -- Card -- */}
      <motion.div
        className="relative z-10 rounded-3xl border border-white/10 overflow-clip
          bg-gradient-to-b from-white/[0.06] to-white/[0.02]
          backdrop-blur-xl shadow-2xl shadow-cyan-500/5"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      >
        {/* Top accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 rounded-t-3xl" />

        <div className="p-8 md:p-12 lg:p-16">
          {/* -- Header row -- */}
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-8">
            <div className="max-w-md flex-shrink-0">
              <motion.span
                className="inline-block px-3 py-1 mb-4 rounded-full text-xs font-semibold uppercase tracking-wider
                  bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.15 }}
              >
                Featured Tool
              </motion.span>

              <motion.h2
                className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight
                  bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
              >
                Timeline Engine
              </motion.h2>

              <motion.p
                className="mt-4 text-base md:text-lg text-white/50 leading-relaxed"
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
              >
                A full-featured interactive timeline with{" "}
                <span className="text-white/70 font-semibold">
                  pointer-lock panning
                </span>
                , zoom, drag &amp; drop events, and{" "}
                <span className="text-white/70 font-semibold">
                  AI-powered timeline generation
                </span>
                . Create, share, and explore timelines with beautiful hover
                cards and node clustering.
              </motion.p>

              <div className="flex flex-wrap gap-2 mt-6">
                <FeatureBadge
                  icon={"\uD83D\uDDB1\uFE0F"}
                  label="Pan & Zoom"
                  delay={0.35}
                />
                <FeatureBadge
                  icon={"\u2728"}
                  label="AI Generation"
                  delay={0.4}
                />
                <FeatureBadge
                  icon={"\uD83D\uDC65"}
                  label="Multi-User"
                  delay={0.45}
                />
                <FeatureBadge
                  icon={"\uD83D\uDDBC\uFE0F"}
                  label="Image Nodes"
                  delay={0.5}
                />
              </div>
            </div>
          </div>

          {/* -- Interactive timeline preview using REAL components -- */}
          <motion.div
            className="relative rounded-2xl border border-white/[0.06] bg-neutral-950/60 overflow-x-clip"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.35, duration: 0.5 }}
          >
            {/* Real TimelineHeader - buttons fire toast, auth hidden for demo */}
            <div className="border-b border-white/[0.06] demo-tl-header">
              <div className="relative">
                {/* Hide Clerk sign-in / user buttons in demo context */}
                <style
                  dangerouslySetInnerHTML={{
                    __html: `
                  .demo-tl-header div.flex.justify-end.items-center.gap-2.w-full > div.whitespace-nowrap {
                    display: none !important;
                  }
                `,
                  }}
                />
                <TimelineHeader
                  scale={scale}
                  centerMs={centerMs}
                  showAllCards={showAllCards}
                  onToggleShowAll={() => setShowAllCards((v) => !v)}
                  activeTimelineName="Demo Timeline"
                  onOpenTimelines={fireToast}
                  onOpenUsers={fireToast}
                  onOpenAIModal={fireToast}
                  onOpenTutorial={fireToast}
                  hasActiveTimeline
                  onCenterToday={() => setCenterMs(Date.now())}
                  onCenterFirstNode={centerOnFirstNode}
                  onCenterLastNode={centerOnLastNode}
                  isOwner={false}
                />
              </div>
            </div>

            {/* Real TimelineCanvas + TimelineNodes */}
            <div
              ref={containerRef}
              className="relative w-full overflow-visible select-none touch-none"
              style={{ height: 380, cursor: "grab" }}
              onMouseDown={panHandlers.onMouseDown}
              onMouseMove={panHandlers.onMouseMove}
              onMouseUp={panHandlers.onMouseUp}
              onMouseLeave={panHandlers.onMouseLeave}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <TimelineCanvas
                containerWidth={containerWidth}
                centerMs={centerMs}
                scale={scale}
                baseRangeDays={BASE_RANGE_DAYS}
                onTimelineClick={() => {}}
                onPan={(dir) => {
                  const visibleMs = (BASE_RANGE_DAYS * MS_PER_DAY) / scale;
                  const shiftMs = (40 / containerWidth) * visibleMs;
                  setCenterMs((c) =>
                    dir === "right" ? c + shiftMs : c - shiftMs,
                  );
                }}
              />

              <TimelineNodes
                events={DEMO_NODES}
                getXForMs={getXForMs}
                containerWidth={containerWidth}
                centerMs={centerMs}
                scale={scale}
                baseRangeDays={BASE_RANGE_DAYS}
                saveNode={noopSave}
                deleteNode={noopDelete}
                isLoading={false}
                showAllCards={showAllCards}
                canEdit={false}
              />

              <TimelineScrollHint />

              {/* Toast notification - on timeline */}
              <Toast
                visible={showToast}
                message="Explore Timeline for all features"
              />
            </div>
          </motion.div>

          {/* -- Divider -- */}
          <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent my-8" />

          {/* -- Bottom - CTA -- */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <motion.p
              className="text-white/30 text-sm"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 }}
            >
              Built with React, Framer Motion &amp; Pointer Lock API &mdash;
              real-time persistence via Appwrite
            </motion.p>

            <Link href="/timeline">
              <motion.button
                className="group relative px-8 py-3.5 rounded-2xl text-sm font-bold
                  bg-gradient-to-r from-cyan-500 to-blue-500
                  hover:from-cyan-400 hover:to-blue-400
                  text-white shadow-xl shadow-cyan-500/25
                  transition-shadow hover:shadow-cyan-500/40 cursor-pointer"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.55 }}
              >
                <span className="flex items-center gap-2">
                  Explore Timeline
                  <svg
                    className="w-4 h-4 transition-transform group-hover:translate-x-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                    />
                  </svg>
                </span>
              </motion.button>
            </Link>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
