"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Coordinate } from "@/types/KwikMaps.type";
import {
  appwrGetMapsFailureFlag,
  appwrSetMapsFailureFlag,
} from "@/appwrite/appwrUpdateSecurity";
import { CoordinateInput, CoordinateList, MapComponent } from "./components";
import { RouteSharePanel } from "./components/RouteSharePanel";
import ReportBug from "./components/ReportBug";
import { parseShareParam } from "./utils/routeShare";
import {
  Navigation2,
  MapPin,
  Sparkles,
  Route,
  Bot,
  ChevronRight,
  Map,
  Send,
  Loader,
  Settings,
  MessageCircle,
  Undo2,
  Redo2,
  Trash2,
  AlertTriangle,
  RotateCcw,
  History,
  Share2,
  Plus,
  GripHorizontal,
  ChevronUp,
  X,
  MessageSquarePlus,
  Bug,
  MoreVertical,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouteState } from "./hooks/useRouteState";
import { useUndoRedo } from "./hooks/useUndoRedo";
import { useOptimization } from "./hooks/useOptimization";
import { useChatEngine } from "./hooks/useChatEngine";
import EmojiText from "@/components/ui/EmojiText";
import { GlowOptimizeButton } from "./components/GlowOptimizeButton";

export function KwikMapsContainer() {
  const searchParams = useSearchParams();

  // ── Route state (coordinates, optimized route, legs, distances) ──
  const routeState = useRouteState();
  const {
    coordinates,
    setCoordinates,
    optimizedRoute,
    setOptimizedRoute,
    legs,
    totalDistanceMiles,
    totalDistanceKm,
    error,
    setError,
    showResults,
    setShowResults,
    aiInsights,
    setAiInsights,
    getRouteState,
    applyRouteState,
    handleAddCoordinate,
    handleRemoveCoordinate,
    handleImportRoute: baseHandleImportRoute,
    handleReset: baseHandleReset,
    handleLoadDemo,
  } = routeState;

  // ── Undo/redo + chat message state ──
  const {
    chatMessages,
    setChatMessages,
    handleUndoRouteChange,
    handleRedoRouteChange,
    handleDeleteMessage,
    handleRestoreOriginal,
  } = useUndoRedo(applyRouteState);

  // ── Chat engine (AI + local intent, debounce/throttle, validation, execution) ──
  const [creativity, setCreativity] = useState(5);
  const {
    chatInput,
    setChatInput,
    isSendingChat,
    chatEndRef,
    chatInputRef,
    handleSendChat,
    handleResendMessage,
  } = useChatEngine({
    getRouteState,
    applyRouteState,
    chatMessages,
    setChatMessages,
    creativity,
  });

  // ── Optimization (button-triggered, hits /api/kwikmaps-optimize) ──
  const { isOptimizing, optimizeRoute } = useOptimization();

  // ── UI state ──
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pendingReset, setPendingReset] = useState(false);
  const [pendingDemo, setPendingDemo] = useState(false);

  // Admin & maps failure flag
  const { userId } = useAuth();
  const isAdmin = userId === process.env.NEXT_PUBLIC_IANS_CLERK_USERID;
  const [mapsFailure, setMapsFailure] = useState(false);
  const [mapsFailureLoaded, setMapsFailureLoaded] = useState(false);
  const [togglingMaps, setTogglingMaps] = useState(false);

  const [toolbarOpen, setToolbarOpen] = useState(false);

  // Dashboard tab state
  const [leftTab, setLeftTab] = useState<"add" | "share">("add");
  const [mainTab, setMainTab] = useState<"planner" | "route" | "ai">("planner");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Fetch maps failure flag
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const flag = await appwrGetMapsFailureFlag();
        if (mounted) setMapsFailure(flag);
      } catch {
      } finally {
        if (mounted) setMapsFailureLoaded(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Feedback / Bug report modal state
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [bugReportOpen, setBugReportOpen] = useState(false);

  // Map highlight state (arrays for multi-select via ctrl+click)
  const [highlightedStopIds, setHighlightedStopIds] = useState<string[]>([]);
  const [highlightedLegIndices, setHighlightedLegIndices] = useState<number[]>(
    [],
  );

  // Chat panel state (fixed bottom, draggable)
  const [chatOpen, setChatOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const [chatHeight, setChatHeight] = useState(340);
  const isDraggingRef = useRef(false);
  const didDragRef = useRef(false);
  const dragStartYRef = useRef(0);
  const dragStartHeightRef = useRef(0);

  // Close settings dropdown on outside click
  useEffect(() => {
    if (!settingsOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        settingsRef.current &&
        !settingsRef.current.contains(e.target as Node)
      ) {
        setSettingsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [settingsOpen]);

  // Load shared route from URL param on mount
  useEffect(() => {
    const routeParam = searchParams.get("route");
    if (routeParam) {
      const parsed = parseShareParam(routeParam);
      if (parsed && parsed.length > 0) {
        setCoordinates(parsed);
      }
    }
  }, [searchParams, setCoordinates]);

  // Wrap importRoute to also clear chat
  const handleImportRoute = useCallback(
    (imported: Coordinate[]) => {
      baseHandleImportRoute(imported);
      setChatMessages([]);
    },
    [baseHandleImportRoute, setChatMessages],
  );

  // Wrap reset to also clear chat + highlights
  const handleReset = useCallback(() => {
    baseHandleReset();
    setChatMessages([]);
    setChatInput("");
    setHighlightedStopIds([]);
    setHighlightedLegIndices([]);
  }, [baseHandleReset, setChatMessages, setChatInput]);

  // Button-triggered optimization
  const handleOptimizeRoute = async () => {
    if (coordinates.length < 2) {
      setError("Please add at least 2 locations to optimize");
      return;
    }
    setError("");
    const result = await optimizeRoute(coordinates);
    if (result.success) {
      setOptimizedRoute(result.optimizedRoute);
      routeState.setTotalDistanceMiles(result.totalDistanceMiles);
      routeState.setTotalDistanceKm(result.totalDistanceKm);
      routeState.setLegs(result.legs);
      setAiInsights(result.aiInsights);
      setShowResults(true);
      setMainTab("route");
    } else {
      setError(result.error);
    }
  };

  // Auto-open chat when new messages arrive
  useEffect(() => {
    if (chatMessages.length > 0) setChatOpen(true);
  }, [chatMessages.length]);

  // Drag handlers for chat panel resize
  const handleDragStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      isDraggingRef.current = true;
      didDragRef.current = false;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      dragStartYRef.current = clientY;
      dragStartHeightRef.current = chatHeight;

      const handleMove = (ev: MouseEvent | TouchEvent) => {
        if (!isDraggingRef.current) return;
        const currentY = "touches" in ev ? ev.touches[0].clientY : ev.clientY;
        const delta = dragStartYRef.current - currentY;
        if (Math.abs(delta) > 3) didDragRef.current = true;
        const newHeight = Math.max(
          200,
          Math.min(
            window.innerHeight - 100,
            dragStartHeightRef.current + delta,
          ),
        );
        setChatHeight(newHeight);
      };
      const handleEnd = () => {
        isDraggingRef.current = false;
        document.removeEventListener("mousemove", handleMove);
        document.removeEventListener("mouseup", handleEnd);
        document.removeEventListener("touchmove", handleMove);
        document.removeEventListener("touchend", handleEnd);
      };
      document.addEventListener("mousemove", handleMove);
      document.addEventListener("mouseup", handleEnd);
      document.addEventListener("touchmove", handleMove);
      document.addEventListener("touchend", handleEnd);
    },
    [chatHeight],
  );

  // Chat panel rendered at the bottom of each tab's left column (desktop)
  const chatPanel = (
    <div
      className="shrink-0 z-50 hidden lg:flex flex-col bg-slate-950/95 border-t border-white/10"
      style={{ height: chatOpen ? chatHeight : 44 }}
    >
      {/* Drag handle + header */}
      <div
        className="relative shrink-0 flex items-center gap-2 px-4 cursor-pointer select-none"
        style={{ height: 44 }}
        onClick={() => {
          if (didDragRef.current) {
            didDragRef.current = false;
            return;
          }
          setChatOpen((o) => !o);
        }}
      >
        {chatOpen && (
          <div
            className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 cursor-ns-resize touch-none"
            onMouseDown={(e) => {
              e.stopPropagation();
              handleDragStart(e);
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
              handleDragStart(e);
            }}
          >
            <GripHorizontal
              size={16}
              className="text-white/25 hover:text-white/50 transition-colors"
            />
          </div>
        )}
        <MessageCircle size={14} className="text-indigo-400" />
        <span className="text-xs font-semibold text-white/60">Route Chat</span>
        {chatMessages.length > 0 && (
          <span className="px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[9px] font-bold">
            {chatMessages.length}
          </span>
        )}
        {isSendingChat && (
          <Loader size={12} className="animate-spin text-purple-400" />
        )}
        <div className="flex-1" />
        <ChevronUp
          size={14}
          className={`text-white/30 transition-transform duration-200 ${chatOpen ? "rotate-180" : ""}`}
        />
      </div>

      {/* Chat body */}
      {chatOpen && (
        <div className="flex-1 flex flex-col min-h-0 px-4 pb-3">
          <div className="flex-1 chat-scroll overflow-y-auto mb-2 space-y-2.5 pr-1">
            {chatMessages.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-white/20 text-xs">
                  Ask me anything about your route...
                </p>
              </div>
            ) : (
              chatMessages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`group/msg flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "user" && (
                    <button
                      onClick={() => handleResendMessage(msg.id)}
                      className="self-center mr-1 p-1 rounded-md opacity-0 group-hover/msg:opacity-100 hover:bg-blue-500/20 text-white/30 hover:text-blue-400 transition-all duration-150"
                      title="Resend message"
                    >
                      <RotateCcw size={11} />
                    </button>
                  )}
                  {msg.role === "user" && (
                    <button
                      onClick={() => setPendingDeleteId(msg.id)}
                      className="self-center mr-1.5 p-1 rounded-md opacity-0 group-hover/msg:opacity-100 hover:bg-red-500/20 text-white/30 hover:text-red-400 transition-all duration-150"
                      title="Delete message"
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                  <div
                    className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                      msg.role === "user"
                        ? "bg-blue-500/25 border border-blue-400/25 text-white rounded-br-md"
                        : "bg-white/[0.06] border border-white/10 text-white/85 rounded-bl-md"
                    }`}
                  >
                    {msg.role === "assistant" && (
                      <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                        <Bot size={11} className="text-purple-400" />
                        <span className="text-purple-400 text-[10px] font-semibold">
                          AI
                        </span>
                        {msg.routeChanged && (
                          <span
                            className={`ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                              msg.undone
                                ? "bg-gray-500/25 text-gray-400 line-through"
                                : "bg-emerald-500/25 text-emerald-300"
                            }`}
                          >
                            {msg.undone ? "Undone" : "Route Updated"}
                          </span>
                        )}
                        {msg.routeChanged &&
                          msg.previousRoute &&
                          !msg.undone && (
                            <button
                              onClick={() => handleUndoRouteChange(msg.id)}
                              className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-500/15 hover:bg-amber-500/30 border border-amber-400/20 text-amber-300 text-[9px] font-bold uppercase flex items-center gap-1 transition-all"
                              title="Undo this route change"
                            >
                              <Undo2 size={9} />
                              Undo
                            </button>
                          )}
                        {msg.routeChanged && msg.newRoute && msg.undone && (
                          <button
                            onClick={() => handleRedoRouteChange(msg.id)}
                            className="ml-1 px-1.5 py-0.5 rounded-full bg-blue-500/15 hover:bg-blue-500/30 border border-blue-400/20 text-blue-300 text-[9px] font-bold uppercase flex items-center gap-1 transition-all"
                            title="Redo this route change"
                          >
                            <Redo2 size={9} />
                            Redo
                          </button>
                        )}
                      </div>
                    )}
                    {msg.role === "user" &&
                      msg.resent &&
                      msg.originalSnapshot && (
                        <button
                          onClick={() => handleRestoreOriginal(msg.id)}
                          className="mb-1.5 px-1.5 py-0.5 rounded-full bg-amber-500/15 hover:bg-amber-500/30 border border-amber-400/20 text-amber-300 text-[9px] font-bold uppercase flex items-center gap-1 transition-all"
                          title="Restore the original AI response state"
                        >
                          <History size={9} />
                          Restore original
                        </button>
                      )}
                    <EmojiText>
                      <div className="whitespace-pre-wrap">
                        {(() => {
                          const retryMatch = msg.content.match(
                            /(Please try again in [\d.]+[smhd][\w.]*)/i,
                          );
                          const rateMatch =
                            msg.content.match(/(Rate limit reached)/i);
                          if (retryMatch || rateMatch) {
                            let parts: React.ReactNode[] = [];
                            let remaining = msg.content;
                            if (rateMatch) {
                              const i = remaining.indexOf(rateMatch[1]);
                              parts.push(remaining.slice(0, i));
                              parts.push(
                                <span
                                  key="rl"
                                  className="text-orange-400 font-semibold"
                                >
                                  {rateMatch[1]}
                                </span>,
                              );
                              remaining = remaining.slice(
                                i + rateMatch[1].length,
                              );
                            }
                            if (retryMatch) {
                              const i = remaining.indexOf(retryMatch[1]);
                              parts.push(remaining.slice(0, i));
                              parts.push(
                                <span
                                  key="rt"
                                  className="text-green-400 font-semibold"
                                >
                                  {retryMatch[1]}
                                </span>,
                              );
                              remaining = remaining.slice(
                                i + retryMatch[1].length,
                              );
                            }
                            parts.push(remaining);
                            return <>{parts}</>;
                          }
                          return msg.content;
                        })()}
                      </div>
                    </EmojiText>
                  </div>
                  {msg.role === "assistant" && (
                    <button
                      onClick={() => setPendingDeleteId(msg.id)}
                      className="self-center ml-1.5 p-1 rounded-md opacity-0 group-hover/msg:opacity-100 hover:bg-red-500/20 text-white/30 hover:text-red-400 transition-all duration-150"
                      title="Delete message"
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </motion.div>
              ))
            )}
            {isSendingChat && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start"
              >
                <div className="px-3.5 py-2.5 rounded-2xl rounded-bl-md bg-white/[0.06] border border-white/10">
                  <div className="flex items-center gap-2">
                    <Loader
                      size={12}
                      className="animate-spin text-purple-400"
                    />
                    <span className="text-white/40 text-xs">Thinking...</span>
                  </div>
                </div>
              </motion.div>
            )}
            <div ref={chatEndRef} />
          </div>

          <form
            onSubmit={handleSendChat}
            className="flex items-center gap-2 shrink-0"
          >
            <input
              ref={chatInputRef}
              type="text"
              placeholder="Add locations, ask about your route..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              disabled={isSendingChat}
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-white/[0.06] border border-white/10 text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-indigo-400/50 focus:border-indigo-400/30 text-xs disabled:opacity-40 transition-all"
            />
            <div className="relative" ref={settingsRef}>
              <button
                type="button"
                onClick={() => setSettingsOpen((o) => !o)}
                className={`p-2.5 rounded-xl border transition-all duration-150 ${
                  settingsOpen
                    ? "bg-white/10 border-indigo-400/40 text-indigo-300"
                    : "bg-white/[0.04] border-white/10 text-white/40 hover:text-white/70 hover:bg-white/[0.08]"
                }`}
                title="AI creativity settings"
              >
                <Settings size={14} />
              </button>
              <AnimatePresence>
                {settingsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.15 }}
                    className="absolute bottom-12 right-0 w-56 p-3 rounded-xl bg-slate-900/95 border border-white/10 backdrop-blur-xl shadow-xl z-50"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-medium text-white/50 uppercase tracking-wider">
                        Creativity
                      </span>
                      <span className="text-xs font-mono text-indigo-300">
                        {creativity}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={10}
                      value={creativity}
                      onChange={(e) => setCreativity(Number(e.target.value))}
                      className="w-full accent-indigo-500 h-1.5 cursor-pointer"
                    />
                    <div className="flex justify-between mt-1">
                      <span className="text-[9px] text-white/30">Precise</span>
                      <span className="text-[9px] text-white/30">Creative</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <button
              type="submit"
              disabled={!chatInput.trim() || isSendingChat}
              className="p-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 disabled:from-gray-600 disabled:to-gray-700 text-white transition-all duration-150 disabled:cursor-not-allowed"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      )}
    </div>
  );

  // Mobile-only fixed-bottom chat panel
  const mobileChatPanel = (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 flex lg:hidden flex-col bg-slate-950/95 border-t border-white/10"
      style={{ height: chatOpen ? chatHeight : 44 }}
    >
      {/* Drag handle + header */}
      <div
        className="relative shrink-0 flex items-center gap-2 px-4 cursor-pointer select-none"
        style={{ height: 44 }}
        onClick={() => {
          if (didDragRef.current) {
            didDragRef.current = false;
            return;
          }
          setChatOpen((o) => !o);
        }}
      >
        {chatOpen && (
          <div
            className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 cursor-ns-resize touch-none"
            onMouseDown={(e) => {
              e.stopPropagation();
              handleDragStart(e);
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
              handleDragStart(e);
            }}
          >
            <GripHorizontal
              size={16}
              className="text-white/25 hover:text-white/50 transition-colors"
            />
          </div>
        )}
        <MessageCircle size={14} className="text-indigo-400" />
        <span className="text-xs font-semibold text-white/60">Route Chat</span>
        {chatMessages.length > 0 && (
          <span className="px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[9px] font-bold">
            {chatMessages.length}
          </span>
        )}
        {isSendingChat && (
          <Loader size={12} className="animate-spin text-purple-400" />
        )}
        <div className="flex-1" />
        <ChevronUp
          size={14}
          className={`text-white/30 transition-transform duration-200 ${chatOpen ? "rotate-180" : ""}`}
        />
      </div>

      {/* Chat body */}
      {chatOpen && (
        <div className="flex-1 flex flex-col min-h-0 px-4 pb-3">
          <div className="flex-1 chat-scroll overflow-y-auto mb-2 space-y-2.5 pr-1">
            {chatMessages.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-white/20 text-xs">
                  Ask me anything about your route...
                </p>
              </div>
            ) : (
              chatMessages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`group/msg flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "user" && (
                    <button
                      onClick={() => handleResendMessage(msg.id)}
                      className="self-center mr-1 p-1 rounded-md opacity-0 group-hover/msg:opacity-100 hover:bg-blue-500/20 text-white/30 hover:text-blue-400 transition-all duration-150"
                      title="Resend message"
                    >
                      <RotateCcw size={11} />
                    </button>
                  )}
                  {msg.role === "user" && (
                    <button
                      onClick={() => setPendingDeleteId(msg.id)}
                      className="self-center mr-1.5 p-1 rounded-md opacity-0 group-hover/msg:opacity-100 hover:bg-red-500/20 text-white/30 hover:text-red-400 transition-all duration-150"
                      title="Delete message"
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                  <div
                    className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${msg.role === "user" ? "bg-blue-500/25 border border-blue-400/25 text-white rounded-br-md" : "bg-white/[0.06] border border-white/10 text-white/85 rounded-bl-md"}`}
                  >
                    {msg.role === "assistant" && (
                      <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                        <Bot size={11} className="text-purple-400" />
                        <span className="text-purple-400 text-[10px] font-semibold">
                          AI
                        </span>
                        {msg.routeChanged && (
                          <span
                            className={`ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${msg.undone ? "bg-gray-500/25 text-gray-400 line-through" : "bg-emerald-500/25 text-emerald-300"}`}
                          >
                            {msg.undone ? "Undone" : "Route Updated"}
                          </span>
                        )}
                        {msg.routeChanged &&
                          msg.previousRoute &&
                          !msg.undone && (
                            <button
                              onClick={() => handleUndoRouteChange(msg.id)}
                              className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-500/15 hover:bg-amber-500/30 border border-amber-400/20 text-amber-300 text-[9px] font-bold uppercase flex items-center gap-1 transition-all"
                              title="Undo"
                            >
                              <Undo2 size={9} /> Undo
                            </button>
                          )}
                        {msg.routeChanged && msg.newRoute && msg.undone && (
                          <button
                            onClick={() => handleRedoRouteChange(msg.id)}
                            className="ml-1 px-1.5 py-0.5 rounded-full bg-blue-500/15 hover:bg-blue-500/30 border border-blue-400/20 text-blue-300 text-[9px] font-bold uppercase flex items-center gap-1 transition-all"
                            title="Redo"
                          >
                            <Redo2 size={9} /> Redo
                          </button>
                        )}
                      </div>
                    )}
                    {msg.role === "user" &&
                      msg.resent &&
                      msg.originalSnapshot && (
                        <button
                          onClick={() => handleRestoreOriginal(msg.id)}
                          className="mb-1.5 px-1.5 py-0.5 rounded-full bg-amber-500/15 hover:bg-amber-500/30 border border-amber-400/20 text-amber-300 text-[9px] font-bold uppercase flex items-center gap-1 transition-all"
                          title="Restore original"
                        >
                          <History size={9} /> Restore original
                        </button>
                      )}
                    <EmojiText>
                      <div className="whitespace-pre-wrap">
                        {(() => {
                          const retryMatch = msg.content.match(
                            /(Please try again in [\d.]+[smhd][\w.]*)/i,
                          );
                          const rateMatch =
                            msg.content.match(/(Rate limit reached)/i);
                          if (retryMatch || rateMatch) {
                            let parts: React.ReactNode[] = [];
                            let remaining = msg.content;
                            if (rateMatch) {
                              const i = remaining.indexOf(rateMatch[1]);
                              parts.push(remaining.slice(0, i));
                              parts.push(
                                <span
                                  key="rl"
                                  className="text-orange-400 font-semibold"
                                >
                                  {rateMatch[1]}
                                </span>,
                              );
                              remaining = remaining.slice(
                                i + rateMatch[1].length,
                              );
                            }
                            if (retryMatch) {
                              const i = remaining.indexOf(retryMatch[1]);
                              parts.push(remaining.slice(0, i));
                              parts.push(
                                <span
                                  key="rt"
                                  className="text-green-400 font-semibold"
                                >
                                  {retryMatch[1]}
                                </span>,
                              );
                              remaining = remaining.slice(
                                i + retryMatch[1].length,
                              );
                            }
                            parts.push(remaining);
                            return <>{parts}</>;
                          }
                          return msg.content;
                        })()}
                      </div>
                    </EmojiText>
                  </div>
                  {msg.role === "assistant" && (
                    <button
                      onClick={() => setPendingDeleteId(msg.id)}
                      className="self-center ml-1.5 p-1 rounded-md opacity-0 group-hover/msg:opacity-100 hover:bg-red-500/20 text-white/30 hover:text-red-400 transition-all duration-150"
                      title="Delete message"
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </motion.div>
              ))
            )}
            {isSendingChat && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start"
              >
                <div className="px-3.5 py-2.5 rounded-2xl rounded-bl-md bg-white/[0.06] border border-white/10">
                  <div className="flex items-center gap-2">
                    <Loader
                      size={12}
                      className="animate-spin text-purple-400"
                    />
                    <span className="text-white/40 text-xs">Thinking...</span>
                  </div>
                </div>
              </motion.div>
            )}
            <div ref={chatEndRef} />
          </div>

          <form
            onSubmit={handleSendChat}
            className="flex items-center gap-2 shrink-0"
          >
            <input
              ref={chatInputRef}
              type="text"
              placeholder="Add locations, ask about your route..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              disabled={isSendingChat}
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-white/[0.06] border border-white/10 text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-indigo-400/50 focus:border-indigo-400/30 text-xs disabled:opacity-40 transition-all"
            />
            <div className="relative" ref={settingsRef}>
              <button
                type="button"
                onClick={() => setSettingsOpen((o) => !o)}
                className={`p-2.5 rounded-xl border transition-all duration-150 ${
                  settingsOpen
                    ? "bg-white/10 border-indigo-400/40 text-indigo-300"
                    : "bg-white/[0.04] border-white/10 text-white/40 hover:text-white/70 hover:bg-white/[0.08]"
                }`}
                title="AI creativity settings"
              >
                <Settings size={14} />
              </button>
              <AnimatePresence>
                {settingsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.15 }}
                    className="absolute bottom-12 right-0 w-56 p-3 rounded-xl bg-slate-900/95 border border-white/10 backdrop-blur-xl shadow-xl z-50"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-medium text-white/50 uppercase tracking-wider">
                        Creativity
                      </span>
                      <span className="text-xs font-mono text-indigo-300">
                        {creativity}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={10}
                      value={creativity}
                      onChange={(e) => setCreativity(Number(e.target.value))}
                      className="w-full accent-indigo-500 h-1.5 cursor-pointer"
                    />
                    <div className="flex justify-between mt-1">
                      <span className="text-[9px] text-white/30">Precise</span>
                      <span className="text-[9px] text-white/30">Creative</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <button
              type="submit"
              disabled={!chatInput.trim() || isSendingChat}
              className="p-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 disabled:from-gray-600 disabled:to-gray-700 text-white transition-all duration-150 disabled:cursor-not-allowed"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      )}
    </div>
  );

  return (
    <div className="w-full h-full bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 overflow-hidden flex flex-col">
      {/* Background accents */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/8 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-500/8 rounded-full blur-3xl" />
      </div>

      {/* ── TOP BAR ── */}
      <header
        className={`relative shrink-0 px-3 lg:px-5 py-2 flex items-center gap-4 border-b border-white/5 bg-slate-950/60 ${toolbarOpen ? "z-[60]" : "z-10"}`}
      >
        <button
          className="flex items-center gap-2 mr-2 lg:pointer-events-none"
          onClick={() => {
            const el = document.querySelector("[data-scroll-container]");
            el?.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          <span className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg shadow-blue-500/20">
            <Navigation2 size={16} className="text-white" />
          </span>
          <h1 className="text-base font-bold text-white leading-tight">
            KwikMaps
            <span className="text-[9px] ml-1 text-white/30 font-normal">
              v0.5
            </span>
          </h1>
        </button>

        {/* Main tabs */}
        <nav className="flex items-center gap-0.5 bg-white/5 rounded-lg p-0.5">
          {[
            { key: "planner" as const, label: "Plan", icon: MapPin },
            { key: "route" as const, label: "Route", icon: Route },
            { key: "ai" as const, label: "AI", icon: Sparkles },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setMainTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
                mainTab === tab.key
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-white/40 hover:text-white/60 hover:bg-white/[0.03]"
              }`}
            >
              <tab.icon size={13} />
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.key === "route" && optimizedRoute && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              )}
              {tab.key === "ai" && aiInsights && (
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
              )}
            </button>
          ))}
        </nav>

        <div className="flex-1" />

        {/* Desktop: inline buttons */}
        <div className="hidden lg:flex items-center gap-2">
          <button
            onClick={() => setFeedbackOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-400/15 text-indigo-300 text-xs font-medium transition-all"
          >
            <MessageSquarePlus size={12} />
            <span>Feedback</span>
          </button>
          <button
            onClick={() => setBugReportOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-400/15 text-red-300 text-xs font-medium transition-all"
          >
            <Bug size={12} />
            <span>Bug</span>
          </button>
          <button
            onClick={() =>
              coordinates.length > 0 ? setPendingDemo(true) : handleLoadDemo()
            }
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 border border-purple-400/15 text-purple-300 text-xs font-medium transition-all"
          >
            <Sparkles size={12} />
            <span>Demo</span>
          </button>
          {optimizedRoute && (
            <button
              onClick={() => setPendingReset(true)}
              className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/8 text-white/50 hover:text-white/80 text-xs font-medium transition-all"
            >
              Clear
            </button>
          )}
          {isAdmin && mapsFailureLoaded && (
            <div className="flex items-center gap-1.5 pl-2 border-l border-white/10">
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                Failure
              </span>
              <button
                onClick={async () => {
                  const next = !mapsFailure;
                  setTogglingMaps(true);
                  setMapsFailure(next);
                  try {
                    await appwrSetMapsFailureFlag(next);
                  } catch (err) {
                    console.error("❌ Toggle maps failure failed:", err);
                    setMapsFailure(!next);
                  } finally {
                    setTogglingMaps(false);
                  }
                }}
                disabled={togglingMaps}
                className={`relative inline-flex h-5 w-9 items-center rounded-full p-0.5 transition-colors duration-200 ${
                  mapsFailure ? "bg-red-500" : "bg-slate-600"
                } ${togglingMaps ? "opacity-50 pointer-events-none" : ""}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                    mapsFailure ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          )}
        </div>

        {/* Mobile: dropdown menu */}
        <div className="relative lg:hidden">
          <button
            onClick={() => setToolbarOpen((o) => !o)}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white transition-all"
          >
            <MoreVertical size={16} />
          </button>
          {toolbarOpen && (
            <>
              <div
                className="fixed inset-0 z-[55]"
                onClick={() => setToolbarOpen(false)}
              />
              <div className="absolute right-0 top-full mt-1 z-[60] w-44 rounded-lg bg-slate-900 border border-white/10 shadow-xl shadow-black/40 p-1.5 flex flex-col gap-1">
                <button
                  onClick={() => {
                    setFeedbackOpen(true);
                    setToolbarOpen(false);
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-xs font-medium text-indigo-300 hover:bg-indigo-500/15 transition-all"
                >
                  <MessageSquarePlus size={13} /> Feedback
                </button>
                <button
                  onClick={() => {
                    setBugReportOpen(true);
                    setToolbarOpen(false);
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-xs font-medium text-red-300 hover:bg-red-500/15 transition-all"
                >
                  <Bug size={13} /> Bug Report
                </button>
                <button
                  onClick={() => {
                    coordinates.length > 0
                      ? setPendingDemo(true)
                      : handleLoadDemo();
                    setToolbarOpen(false);
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-xs font-medium text-purple-300 hover:bg-purple-500/15 transition-all"
                >
                  <Sparkles size={13} /> Demo
                </button>
                {optimizedRoute && (
                  <button
                    onClick={() => {
                      setPendingReset(true);
                      setToolbarOpen(false);
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-xs font-medium text-white/50 hover:bg-white/5 transition-all"
                  >
                    <Trash2 size={13} /> Clear
                  </button>
                )}
                {isAdmin && mapsFailureLoaded && (
                  <div className="flex items-center justify-between px-3 py-2 border-t border-white/5 mt-0.5 pt-1.5">
                    <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                      Failure
                    </span>
                    <button
                      onClick={async () => {
                        const next = !mapsFailure;
                        setTogglingMaps(true);
                        setMapsFailure(next);
                        try {
                          await appwrSetMapsFailureFlag(next);
                        } catch (err) {
                          console.error("❌ Toggle maps failure failed:", err);
                          setMapsFailure(!next);
                        } finally {
                          setTogglingMaps(false);
                        }
                      }}
                      disabled={togglingMaps}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full p-0.5 transition-colors duration-200 ${
                        mapsFailure ? "bg-red-500" : "bg-slate-600"
                      } ${togglingMaps ? "opacity-50 pointer-events-none" : ""}`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                          mapsFailure ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </header>

      {/* ── MAIN CONTENT ── */}
      <div
        data-scroll-container
        className="relative z-10 flex-1 min-h-0 overflow-y-auto lg:overflow-hidden pb-12 lg:pb-0"
      >
        {/* === PLAN TAB === */}
        {mainTab === "planner" && (
          <div className="lg:h-full flex flex-col lg:flex-row">
            {/* Left column: sidebar + chat */}
            <div
              className={`shrink-0 flex flex-col border-r border-white/5 transition-all duration-200 overflow-hidden ${
                sidebarCollapsed ? "lg:w-10" : "lg:w-[400px]"
              }`}
            >
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="hidden lg:flex items-center justify-center h-7 text-white/20 hover:text-white/50 hover:bg-white/5 transition-colors shrink-0"
                title={sidebarCollapsed ? "Expand" : "Collapse"}
              >
                <ChevronRight
                  size={14}
                  className={`transition-transform duration-200 ${sidebarCollapsed ? "" : "rotate-180"}`}
                />
              </button>

              {!sidebarCollapsed && (
                <div className="flex-1 flex flex-col min-h-0 px-3 pb-3">
                  {/* Sub-tabs: Add / Share */}
                  <div className="flex gap-0.5 bg-white/5 rounded-lg p-0.5 mb-3 shrink-0">
                    <button
                      onClick={() => setLeftTab("add")}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                        leftTab === "add"
                          ? "bg-white/10 text-white"
                          : "text-white/35 hover:text-white/60"
                      }`}
                    >
                      <Plus size={12} />
                      Add Location
                    </button>
                    <button
                      onClick={() => setLeftTab("share")}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                        leftTab === "share"
                          ? "bg-white/10 text-white"
                          : "text-white/35 hover:text-white/60"
                      }`}
                    >
                      <Share2 size={12} />
                      Share
                    </button>
                  </div>

                  <div className="flex-1 chat-scroll overflow-y-auto min-h-0 space-y-3">
                    {leftTab === "add" ? (
                      <div className="p-3 rounded-xl mb-12 bg-white/[0.03] border border-white/8">
                        <CoordinateInput
                          onAddCoordinate={handleAddCoordinate}
                        />
                      </div>
                    ) : (
                      <RouteSharePanel
                        coordinates={coordinates}
                        optimizedRoute={optimizedRoute}
                        onImportRoute={handleImportRoute}
                      />
                    )}

                    <GlowOptimizeButton
                      onClick={handleOptimizeRoute}
                      isOptimizing={isOptimizing}
                      disabled={coordinates.length < 2}
                    />

                    {error && (
                      <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-400/15 text-red-300 text-xs">
                        {error}
                      </div>
                    )}

                    {/* Location list */}
                    <CoordinateList
                      coordinates={coordinates}
                      onRemoveCoordinate={handleRemoveCoordinate}
                      optimizedOrder={
                        optimizedRoute
                          ? optimizedRoute.map((c) => c.id)
                          : undefined
                      }
                    />
                  </div>
                </div>
              )}

              {/* Chat panel at bottom of sidebar */}
              {!sidebarCollapsed && chatPanel}
            </div>

            {/* Map */}
            <div className="h-screen lg:h-auto lg:flex-1 lg:min-h-0">
              <MapComponent
                coordinates={coordinates}
                optimizedRoute={optimizedRoute || undefined}
                isLoading={isOptimizing}
                error={error && coordinates.length > 0 ? error : undefined}
                highlightedStopIds={highlightedStopIds}
                highlightedLegIndices={highlightedLegIndices}
                mapsFailure={mapsFailure}
              />
            </div>
          </div>
        )}

        {/* === ROUTE TAB === */}
        {mainTab === "route" && (
          <div className="lg:h-full flex flex-col lg:flex-row">
            {/* Left column: route info + chat */}
            <div className="shrink-0 lg:w-[400px] flex flex-col min-h-0 border-r border-white/5">
              <div className="flex-1 chat-scroll overflow-y-auto p-4 space-y-4">
                {optimizedRoute ? (
                  <>
                    {/* Stats */}
                    <div className="flex gap-2">
                      <div className="flex-1 p-3 rounded-xl bg-white/[0.03] border border-white/8">
                        <div className="flex items-center gap-1.5 text-white/40 mb-0.5">
                          <Map size={11} />
                          <span className="text-[10px] uppercase tracking-wider font-medium">
                            Distance
                          </span>
                        </div>
                        <p className="text-lg font-bold text-cyan-400 leading-tight">
                          {totalDistanceMiles.toFixed(0)} mi
                        </p>
                        <p className="text-[10px] text-white/25">
                          {totalDistanceKm.toFixed(0)} km
                        </p>
                      </div>
                      <div className="flex-1 p-3 rounded-xl bg-white/[0.03] border border-white/8">
                        <div className="flex items-center gap-1.5 text-white/40 mb-0.5">
                          <Route size={11} />
                          <span className="text-[10px] uppercase tracking-wider font-medium">
                            Legs
                          </span>
                        </div>
                        <p className="text-lg font-bold text-cyan-400 leading-tight">
                          {legs.length}
                        </p>
                        <p className="text-[10px] text-white/25">segments</p>
                      </div>
                      <div className="flex-1 p-3 rounded-xl bg-white/[0.03] border border-white/8">
                        <div className="flex items-center gap-1.5 text-white/40 mb-0.5">
                          <MapPin size={11} />
                          <span className="text-[10px] uppercase tracking-wider font-medium">
                            Stops
                          </span>
                        </div>
                        <p className="text-lg font-bold text-cyan-400 leading-tight">
                          {optimizedRoute.length}
                        </p>
                        <p className="text-[10px] text-white/25">locations</p>
                      </div>
                    </div>

                    {/* Optimized order */}
                    <div>
                      <h3 className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-2">
                        Optimized Order
                      </h3>
                      <div className="space-y-1">
                        {optimizedRoute.map((coord, index) => (
                          <div
                            key={coord.id}
                            onClick={(e) => {
                              if (e.ctrlKey || e.metaKey) {
                                setHighlightedStopIds((prev) =>
                                  prev.includes(coord.id)
                                    ? prev.filter((id) => id !== coord.id)
                                    : [...prev, coord.id],
                                );
                              } else {
                                setHighlightedLegIndices([]);
                                setHighlightedStopIds((prev) =>
                                  prev.length === 1 && prev[0] === coord.id
                                    ? []
                                    : [coord.id],
                                );
                              }
                            }}
                            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                              highlightedStopIds.includes(coord.id)
                                ? "bg-yellow-500/10 border-yellow-400/25 ring-1 ring-yellow-400/20"
                                : "bg-white/[0.03] border-white/6 hover:bg-white/[0.06]"
                            }`}
                          >
                            <div className="flex items-center justify-center w-6 h-6 rounded-md bg-gradient-to-br from-blue-500/80 to-cyan-500/80 text-white text-[10px] font-bold shrink-0">
                              {index + 1}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-white/90 text-xs font-medium truncate">
                                {coord.name}
                              </p>
                              <p className="text-white/25 text-[10px]">
                                {coord.latitude.toFixed(4)},{" "}
                                {coord.longitude.toFixed(4)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Route legs */}
                    {legs.length > 0 && (
                      <div>
                        <h3 className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <Route size={11} className="text-emerald-400" />
                          Route Legs
                        </h3>
                        <div className="space-y-1">
                          {legs.map((leg, i) => (
                            <div
                              key={i}
                              onClick={(e) => {
                                if (e.ctrlKey || e.metaKey) {
                                  setHighlightedLegIndices((prev) =>
                                    prev.includes(i)
                                      ? prev.filter((idx) => idx !== i)
                                      : [...prev, i],
                                  );
                                } else {
                                  setHighlightedStopIds([]);
                                  setHighlightedLegIndices((prev) =>
                                    prev.length === 1 && prev[0] === i
                                      ? []
                                      : [i],
                                  );
                                }
                              }}
                              className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                                highlightedLegIndices.includes(i)
                                  ? "bg-yellow-500/10 border-yellow-400/25 ring-1 ring-yellow-400/20"
                                  : "bg-white/[0.03] border-white/6 hover:bg-white/[0.06]"
                              }`}
                            >
                              <div className="flex items-center justify-center w-5 h-5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold shrink-0">
                                {i + 1}
                              </div>
                              <span className="text-white/70 text-xs truncate">
                                {leg.from}
                              </span>
                              <ChevronRight
                                size={10}
                                className="text-white/15 shrink-0"
                              />
                              <span className="text-white/70 text-xs truncate">
                                {leg.to}
                              </span>
                              <span className="ml-auto text-cyan-400 text-xs font-semibold whitespace-nowrap">
                                {leg.distanceMiles} mi
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-16">
                    <Route size={36} className="text-white/8 mb-3" />
                    <p className="text-white/25 text-sm font-medium">
                      No route optimized yet
                    </p>
                    <p className="text-white/15 text-xs mt-1">
                      Switch to Plan tab to add locations
                    </p>
                  </div>
                )}
              </div>
              {/* Chat panel at bottom of sidebar */}
              {chatPanel}
            </div>

            <div className="h-screen lg:h-auto lg:flex-1 lg:min-h-0">
              <MapComponent
                coordinates={coordinates}
                optimizedRoute={optimizedRoute || undefined}
                isLoading={isOptimizing}
                error={error && coordinates.length > 0 ? error : undefined}
                highlightedStopIds={highlightedStopIds}
                highlightedLegIndices={highlightedLegIndices}
                mapsFailure={mapsFailure}
              />
            </div>
          </div>
        )}

        {/* === AI TAB (Overview only) === */}
        {mainTab === "ai" && (
          <div className="lg:h-full flex flex-col lg:flex-row">
            <div className="shrink-0 lg:w-[400px] flex flex-col min-h-0 border-r border-white/5">
              <div className="flex-1 chat-scroll overflow-y-auto p-4">
                {aiInsights ? (
                  <div>
                    <h3 className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <Sparkles size={11} className="text-purple-400" />
                      AI Route Overview
                    </h3>
                    <div className="p-4 rounded-xl bg-white/[0.03] border border-white/8">
                      <div className="text-white/70 text-xs leading-relaxed whitespace-pre-wrap">
                        {aiInsights}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-16">
                    <Sparkles size={36} className="text-white/8 mb-3" />
                    <p className="text-white/25 text-sm font-medium">
                      No AI overview yet
                    </p>
                    <p className="text-white/15 text-xs mt-1">
                      Optimize a route to generate AI insights
                    </p>
                  </div>
                )}
              </div>
              {/* Chat panel at bottom of sidebar */}
              {chatPanel}
            </div>

            <div className="h-screen lg:h-auto lg:flex-1 lg:min-h-0">
              <MapComponent
                coordinates={coordinates}
                optimizedRoute={optimizedRoute || undefined}
                isLoading={isOptimizing}
                error={error && coordinates.length > 0 ? error : undefined}
                highlightedStopIds={highlightedStopIds}
                highlightedLegIndices={highlightedLegIndices}
                mapsFailure={mapsFailure}
              />
            </div>
          </div>
        )}
      </div>

      {/* Mobile-only fixed-bottom chat panel */}
      {mobileChatPanel}

      {/* Demo confirm modal */}
      <AnimatePresence>
        {pendingDemo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            onClick={() => setPendingDemo(false)}
          >
            <div className="absolute inset-0 bg-black/60" />
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm rounded-2xl bg-slate-900 border border-white/10 shadow-2xl p-6"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-11 h-11 rounded-full bg-purple-500/15 flex items-center justify-center mb-3">
                  <Sparkles size={20} className="text-purple-400" />
                </div>
                <h3 className="text-base font-semibold text-white mb-1">
                  Load demo?
                </h3>
                <p className="text-xs text-white/45">
                  This will replace your current locations with demo data.
                </p>
              </div>
              <div className="flex gap-3 mt-5">
                <button
                  onClick={() => setPendingDemo(false)}
                  className="flex-1 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/8 text-white text-xs font-medium transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    handleLoadDemo();
                    setPendingDemo(false);
                  }}
                  className="flex-1 px-4 py-2 rounded-xl bg-purple-500/80 hover:bg-purple-500 border border-purple-400/25 text-white text-xs font-medium transition-all"
                >
                  Load Demo
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reset confirm modal */}
      <AnimatePresence>
        {pendingReset && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            onClick={() => setPendingReset(false)}
          >
            <div className="absolute inset-0 bg-black/60" />
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm rounded-2xl bg-slate-900 border border-white/10 shadow-2xl p-6"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-11 h-11 rounded-full bg-red-500/15 flex items-center justify-center mb-3">
                  <AlertTriangle size={20} className="text-red-400" />
                </div>
                <h3 className="text-base font-semibold text-white mb-1">
                  Clear route?
                </h3>
                <p className="text-xs text-white/45">
                  This will reset the optimized route, stats, and chat history.
                </p>
              </div>
              <div className="flex gap-3 mt-5">
                <button
                  onClick={() => setPendingReset(false)}
                  className="flex-1 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/8 text-white text-xs font-medium transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    handleReset();
                    setPendingReset(false);
                  }}
                  className="flex-1 px-4 py-2 rounded-xl bg-red-500/80 hover:bg-red-500 border border-red-400/25 text-white text-xs font-medium transition-all"
                >
                  Clear
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete confirm modal */}
      <AnimatePresence>
        {pendingDeleteId &&
          (() => {
            const msg = chatMessages.find((m) => m.id === pendingDeleteId);
            const willRevert =
              msg?.role === "assistant" &&
              msg.routeChanged &&
              msg.previousRoute &&
              !msg.undone;
            return (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
                onClick={() => setPendingDeleteId(null)}
              >
                <div className="absolute inset-0 bg-black/60" />
                <motion.div
                  initial={{ opacity: 0, scale: 0.92, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: 8 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  onClick={(e) => e.stopPropagation()}
                  className="relative w-full max-w-sm rounded-2xl bg-slate-900 border border-white/10 shadow-2xl p-6"
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="w-11 h-11 rounded-full bg-red-500/15 flex items-center justify-center mb-3">
                      <AlertTriangle size={20} className="text-red-400" />
                    </div>
                    <h3 className="text-base font-semibold text-white mb-1">
                      Delete message?
                    </h3>
                    <p className="text-xs text-white/45 mb-1">
                      This will permanently remove this message.
                    </p>
                    {willRevert && (
                      <p className="text-[10px] text-amber-400/80 bg-amber-500/10 border border-amber-500/15 rounded-lg px-3 py-1.5 mt-2">
                        This will also revert the route changes made by this
                        response.
                      </p>
                    )}
                  </div>
                  <div className="flex gap-3 mt-5">
                    <button
                      onClick={() => setPendingDeleteId(null)}
                      className="flex-1 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/8 text-white text-xs font-medium transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        handleDeleteMessage(pendingDeleteId);
                        setPendingDeleteId(null);
                      }}
                      className="flex-1 px-4 py-2 rounded-xl bg-red-500/80 hover:bg-red-500 border border-red-400/25 text-white text-xs font-medium transition-all"
                    >
                      Delete
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            );
          })()}
      </AnimatePresence>

      {/* Feedback & Bug Report modals */}
      <ReportBug
        mode="feedback"
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
      />
      <ReportBug
        mode="bug"
        open={bugReportOpen}
        onClose={() => setBugReportOpen(false)}
      />
    </div>
  );
}
