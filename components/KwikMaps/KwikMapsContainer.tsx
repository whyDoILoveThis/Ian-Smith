"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Coordinate } from "@/types/KwikMaps.type";
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
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { motion, AnimatePresence } from "framer-motion";

interface RouteLeg {
  from: string;
  to: string;
  distanceKm: number;
  distanceMiles: number;
}

interface RouteSnapshot {
  optimizedRoute: Coordinate[] | null;
  legs: RouteLeg[];
  totalDistanceMiles: number;
  totalDistanceKm: number;
  coordinates: Coordinate[]; // full coordinates list for undo/redo of add/remove
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  routeChanged?: boolean;
  previousRoute?: RouteSnapshot;
  newRoute?: RouteSnapshot;
  undone?: boolean;
  resent?: boolean;
  originalSnapshot?: RouteSnapshot;
}

// Demo locations across Tennessee
const DEMO_LOCATIONS = [
  { name: "Nashville Downtown", latitude: 36.1627, longitude: -86.7816 },
  { name: "Memphis Midtown", latitude: 35.1364, longitude: -89.9789 },
  { name: "Johnson City Square", latitude: 36.3131, longitude: -82.3151 },
  { name: "Knoxville Downtown", latitude: 35.9606, longitude: -83.9207 },
  { name: "Chattanooga Rivefront", latitude: 35.0469, longitude: -85.2693 },
  { name: "Clarksville Downtown", latitude: 36.5296, longitude: -87.3595 },
  { name: "Springfield Town Square", latitude: 36.4847, longitude: -86.4919 },
  { name: "Jackson Town Center", latitude: 35.6144, longitude: -88.8142 },
  { name: "Oak Ridge City Center", latitude: 36.0197, longitude: -84.2673 },
  { name: "Murfreesboro Downtown", latitude: 35.8458, longitude: -86.3914 },
];

export function KwikMapsContainer() {
  const searchParams = useSearchParams();
  const [coordinates, setCoordinates] = useState<Coordinate[]>([]);
  const [optimizedRoute, setOptimizedRoute] = useState<Coordinate[] | null>(
    null,
  );
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [error, setError] = useState<string>("");
  const [showResults, setShowResults] = useState(false);
  const [totalDistanceMiles, setTotalDistanceMiles] = useState<number>(0);
  const [totalDistanceKm, setTotalDistanceKm] = useState<number>(0);
  const [legs, setLegs] = useState<RouteLeg[]>([]);
  const [aiInsights, setAiInsights] = useState<string>("");

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isSendingChat, setIsSendingChat] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pendingReset, setPendingReset] = useState(false);
  const [pendingDemo, setPendingDemo] = useState(false);
  const pendingResendRef = useRef<string | null>(null);
  const pendingResendSnapshotRef = useRef<RouteSnapshot | null>(null);

  // Dashboard tab state
  const [leftTab, setLeftTab] = useState<"add" | "share">("add");
  const [mainTab, setMainTab] = useState<"planner" | "route" | "ai">("planner");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Feedback / Bug report modal state
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [bugReportOpen, setBugReportOpen] = useState(false);

  // Map highlight state (arrays for multi-select via ctrl+click)
  const [highlightedStopIds, setHighlightedStopIds] = useState<string[]>([]);
  const [highlightedLegIndices, setHighlightedLegIndices] = useState<number[]>([]);

  // Chat panel state (fixed bottom, draggable)
  const [chatOpen, setChatOpen] = useState(false);
  const [chatHeight, setChatHeight] = useState(340);
  const isDraggingRef = useRef(false);
  const didDragRef = useRef(false);
  const dragStartYRef = useRef(0);
  const dragStartHeightRef = useRef(0);

  // Load shared route from URL param on mount
  useEffect(() => {
    const routeParam = searchParams.get("route");
    if (routeParam) {
      const parsed = parseShareParam(routeParam);
      if (parsed && parsed.length > 0) {
        setCoordinates(parsed);
      }
    }
  }, [searchParams]);

  const handleImportRoute = useCallback((imported: Coordinate[]) => {
    setCoordinates(imported);
    setOptimizedRoute(null);
    setShowResults(false);
    setError("");
    setChatMessages([]);
  }, []);

  const handleDeleteMessage = useCallback(
    (messageId: string) => {
      const msg = chatMessages.find((m) => m.id === messageId);
      // If deleting an AI message that changed the route (and wasn't already undone), revert it
      if (
        msg?.role === "assistant" &&
        msg.routeChanged &&
        msg.previousRoute &&
        !msg.undone
      ) {
        setOptimizedRoute(msg.previousRoute.optimizedRoute);
        setLegs(msg.previousRoute.legs);
        setTotalDistanceMiles(msg.previousRoute.totalDistanceMiles);
        setTotalDistanceKm(msg.previousRoute.totalDistanceKm);
        if (msg.previousRoute.coordinates) {
          setCoordinates(msg.previousRoute.coordinates);
        }
      }
      setChatMessages((prev) => prev.filter((m) => m.id !== messageId));
    },
    [chatMessages],
  );

  const handleResendMessage = useCallback(
    (messageId: string) => {
      const msg = chatMessages.find((m) => m.id === messageId);
      if (!msg || msg.role !== "user") return;

      // Find the index of this user message
      const idx = chatMessages.findIndex((m) => m.id === messageId);
      // Capture the original AI snapshot before removing
      let savedSnapshot: RouteSnapshot | undefined;
      const toRemove = new Set([messageId]);
      if (
        idx + 1 < chatMessages.length &&
        chatMessages[idx + 1].role === "assistant"
      ) {
        const aiMsg = chatMessages[idx + 1];
        // Save the snapshot the AI response applied (so we can restore it later)
        if (aiMsg.routeChanged && aiMsg.newRoute && !aiMsg.undone) {
          savedSnapshot = aiMsg.newRoute;
        }
        // Undo route change if that AI message changed the route
        if (aiMsg.routeChanged && aiMsg.previousRoute && !aiMsg.undone) {
          setOptimizedRoute(aiMsg.previousRoute.optimizedRoute);
          setLegs(aiMsg.previousRoute.legs);
          setTotalDistanceMiles(aiMsg.previousRoute.totalDistanceMiles);
          setTotalDistanceKm(aiMsg.previousRoute.totalDistanceKm);
          if (aiMsg.previousRoute.coordinates) {
            setCoordinates(aiMsg.previousRoute.coordinates);
          }
        }
        toRemove.add(aiMsg.id);
      }

      setChatMessages((prev) => prev.filter((m) => !toRemove.has(m.id)));
      setChatInput(msg.content);
      pendingResendRef.current = msg.content;
      // Store snapshot so the new user message gets tagged
      pendingResendSnapshotRef.current = savedSnapshot ?? null;
    },
    [chatMessages],
  );

  const handleRestoreOriginal = useCallback(
    (messageId: string) => {
      const msg = chatMessages.find((m) => m.id === messageId);
      if (!msg?.originalSnapshot) return;
      const snap = msg.originalSnapshot;
      setOptimizedRoute(snap.optimizedRoute);
      setLegs(snap.legs);
      setTotalDistanceMiles(snap.totalDistanceMiles);
      setTotalDistanceKm(snap.totalDistanceKm);
      if (snap.coordinates) {
        setCoordinates(snap.coordinates);
      }
      // Mark as restored so the pill updates
      setChatMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, resent: false } : m)),
      );
    },
    [chatMessages],
  );

  // Auto-send after resend populates chatInput
  useEffect(() => {
    if (
      pendingResendRef.current &&
      chatInput === pendingResendRef.current &&
      !isSendingChat
    ) {
      pendingResendRef.current = null;
      handleSendChat();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatInput]);

  const handleAddCoordinate = useCallback((coordinate: Coordinate) => {
    setCoordinates((prev) => [...prev, coordinate]);
    setError("");
  }, []);

  const handleRemoveCoordinate = useCallback(
    (id: string) => {
      setCoordinates((prev) => prev.filter((c) => c.id !== id));
      if (optimizedRoute) {
        setOptimizedRoute((prev) =>
          prev ? prev.filter((c) => c.id !== id) : null,
        );
      }
    },
    [optimizedRoute],
  );

  const handleOptimizeRoute = async () => {
    if (coordinates.length < 2) {
      setError("Please add at least 2 locations to optimize");
      return;
    }

    setIsOptimizing(true);
    setError("");

    try {
      const response = await fetch("/api/kwikmaps-optimize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ coordinates }),
      });

      if (!response.ok) {
        throw new Error("Failed to optimize route");
      }

      const data = await response.json();
      if (data.success) {
        setOptimizedRoute(data.optimizedRoute);
        setTotalDistanceMiles(data.totalDistanceMiles || 0);
        setTotalDistanceKm(data.totalDistanceKm || 0);
        setLegs(data.legs || []);
        setAiInsights(data.aiInsights || "");
        setShowResults(true);
        setMainTab("route");
      } else {
        setError(data.error || "Failed to optimize route");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred",
      );
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleReset = () => {
    setOptimizedRoute(null);
    setShowResults(false);
    setTotalDistanceMiles(0);
    setTotalDistanceKm(0);
    setLegs([]);
    setAiInsights("");
    setChatMessages([]);
    setChatInput("");
    setHighlightedStopIds([]);
    setHighlightedLegIndices([]);
  };

  const handleLoadDemo = useCallback(() => {
    const demoCoordinates: Coordinate[] = DEMO_LOCATIONS.map((loc) => ({
      id: uuidv4(),
      name: loc.name,
      latitude: loc.latitude,
      longitude: loc.longitude,
    }));
    setCoordinates(demoCoordinates);
    setOptimizedRoute(null);
    setShowResults(false);
    setError("");
  }, []);

  const handleUndoRouteChange = useCallback(
    (messageId: string) => {
      const msg = chatMessages.find((m) => m.id === messageId);
      if (!msg?.previousRoute) return;

      setOptimizedRoute(msg.previousRoute.optimizedRoute);
      setLegs(msg.previousRoute.legs);
      setTotalDistanceMiles(msg.previousRoute.totalDistanceMiles);
      setTotalDistanceKm(msg.previousRoute.totalDistanceKm);
      setCoordinates(msg.previousRoute.coordinates);

      // Mark this message as undone so the button shows the state
      setChatMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, undone: true } : m)),
      );
    },
    [chatMessages],
  );

  const handleRedoRouteChange = useCallback(
    (messageId: string) => {
      const msg = chatMessages.find((m) => m.id === messageId);
      if (!msg?.newRoute) return;

      setOptimizedRoute(msg.newRoute.optimizedRoute);
      setLegs(msg.newRoute.legs);
      setTotalDistanceMiles(msg.newRoute.totalDistanceMiles);
      setTotalDistanceKm(msg.newRoute.totalDistanceKm);
      setCoordinates(msg.newRoute.coordinates);

      setChatMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, undone: false } : m)),
      );
    },
    [chatMessages],
  );

  // Scroll chat to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

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

  const handleSendChat = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const msg = chatInput.trim();
    if (!msg || isSendingChat) return;

    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: "user",
      content: msg,
      ...(pendingResendSnapshotRef.current && {
        resent: true,
        originalSnapshot: pendingResendSnapshotRef.current,
      }),
    };
    pendingResendSnapshotRef.current = null;

    setChatMessages((prev) => [...prev, userMessage]);
    setChatInput("");
    setIsSendingChat(true);

    try {
      // Build conversation history for context
      const conversationHistory = chatMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch("/api/kwikmaps-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: msg,
          currentRoute: optimizedRoute || [],
          allCoordinates: coordinates,
          conversationHistory,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get AI response");
      }

      const data = await response.json();

      if (data.success) {
        const assistantMessage: ChatMessage = {
          id: uuidv4(),
          role: "assistant",
          content: data.reply,
          routeChanged: !!data.routeUpdate,
        };
        setChatMessages((prev) => [...prev, assistantMessage]);

        // If the AI updated the route, save snapshots then apply
        if (data.routeUpdate) {
          if (optimizedRoute) {
            // Route exists — full snapshot handling
            const previousSnapshot: RouteSnapshot = {
              optimizedRoute: optimizedRoute,
              legs,
              totalDistanceMiles,
              totalDistanceKm,
              coordinates: [...coordinates],
            };

            // Compute new coordinates list after add/remove
            let newCoordinates = [...coordinates];
            if (data.routeUpdate.removedCoordinateIds) {
              const removeSet = new Set(data.routeUpdate.removedCoordinateIds);
              newCoordinates = newCoordinates.filter(
                (c) => !removeSet.has(c.id),
              );
            }
            if (data.routeUpdate.addedCoordinates) {
              newCoordinates = [
                ...newCoordinates,
                ...data.routeUpdate.addedCoordinates,
              ];
            }

            const newSnapshot: RouteSnapshot = {
              optimizedRoute: data.routeUpdate.optimizedRoute,
              legs: data.routeUpdate.legs,
              totalDistanceMiles: data.routeUpdate.totalDistanceMiles,
              totalDistanceKm: data.routeUpdate.totalDistanceKm,
              coordinates: newCoordinates,
            };
            setChatMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMessage.id
                  ? {
                      ...m,
                      previousRoute: previousSnapshot,
                      newRoute: newSnapshot,
                    }
                  : m,
              ),
            );

            setOptimizedRoute(data.routeUpdate.optimizedRoute);
            setLegs(data.routeUpdate.legs);
            setTotalDistanceMiles(data.routeUpdate.totalDistanceMiles);
            setTotalDistanceKm(data.routeUpdate.totalDistanceKm);

            // Sync coordinates if locations were added or removed
            if (
              data.routeUpdate.addedCoordinates ||
              data.routeUpdate.removedCoordinateIds
            ) {
              setCoordinates(newCoordinates);
            }
          } else {
            // No route yet — snapshot coordinates for undo/redo, then add
            const previousSnapshot: RouteSnapshot = {
              optimizedRoute: null,
              legs: [],
              totalDistanceMiles: 0,
              totalDistanceKm: 0,
              coordinates: [...coordinates],
            };

            let newCoordinates = [...coordinates];
            if (data.routeUpdate.addedCoordinates) {
              newCoordinates = [
                ...newCoordinates,
                ...data.routeUpdate.addedCoordinates,
              ];
            }

            const newSnapshot: RouteSnapshot = {
              optimizedRoute: null,
              legs: [],
              totalDistanceMiles: 0,
              totalDistanceKm: 0,
              coordinates: newCoordinates,
            };

            setChatMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMessage.id
                  ? {
                      ...m,
                      previousRoute: previousSnapshot,
                      newRoute: newSnapshot,
                    }
                  : m,
              ),
            );

            setCoordinates(newCoordinates);
          }
        }
      } else {
        const errorMessage: ChatMessage = {
          id: uuidv4(),
          role: "assistant",
          content: data.error || "Something went wrong. Try again.",
        };
        setChatMessages((prev) => [...prev, errorMessage]);
      }
    } catch (err) {
      const errorMessage: ChatMessage = {
        id: uuidv4(),
        role: "assistant",
        content: "Failed to reach AI. Please try again.",
      };
      setChatMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsSendingChat(false);
      chatInputRef.current?.focus();
    }
  };

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
                    <div className="whitespace-pre-wrap">{msg.content}</div>
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
          if (didDragRef.current) { didDragRef.current = false; return; }
          setChatOpen((o) => !o);
        }}
      >
        {chatOpen && (
          <div
            className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 cursor-ns-resize touch-none"
            onMouseDown={(e) => { e.stopPropagation(); handleDragStart(e); }}
            onTouchStart={(e) => { e.stopPropagation(); handleDragStart(e); }}
          >
            <GripHorizontal size={16} className="text-white/25 hover:text-white/50 transition-colors" />
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
                <p className="text-white/20 text-xs">Ask me anything about your route...</p>
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
                    <button onClick={() => handleResendMessage(msg.id)} className="self-center mr-1 p-1 rounded-md opacity-0 group-hover/msg:opacity-100 hover:bg-blue-500/20 text-white/30 hover:text-blue-400 transition-all duration-150" title="Resend message">
                      <RotateCcw size={11} />
                    </button>
                  )}
                  {msg.role === "user" && (
                    <button onClick={() => setPendingDeleteId(msg.id)} className="self-center mr-1.5 p-1 rounded-md opacity-0 group-hover/msg:opacity-100 hover:bg-red-500/20 text-white/30 hover:text-red-400 transition-all duration-150" title="Delete message">
                      <Trash2 size={11} />
                    </button>
                  )}
                  <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${msg.role === "user" ? "bg-blue-500/25 border border-blue-400/25 text-white rounded-br-md" : "bg-white/[0.06] border border-white/10 text-white/85 rounded-bl-md"}`}>
                    {msg.role === "assistant" && (
                      <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                        <Bot size={11} className="text-purple-400" />
                        <span className="text-purple-400 text-[10px] font-semibold">AI</span>
                        {msg.routeChanged && (
                          <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${msg.undone ? "bg-gray-500/25 text-gray-400 line-through" : "bg-emerald-500/25 text-emerald-300"}`}>
                            {msg.undone ? "Undone" : "Route Updated"}
                          </span>
                        )}
                        {msg.routeChanged && msg.previousRoute && !msg.undone && (
                          <button onClick={() => handleUndoRouteChange(msg.id)} className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-500/15 hover:bg-amber-500/30 border border-amber-400/20 text-amber-300 text-[9px] font-bold uppercase flex items-center gap-1 transition-all" title="Undo">
                            <Undo2 size={9} /> Undo
                          </button>
                        )}
                        {msg.routeChanged && msg.newRoute && msg.undone && (
                          <button onClick={() => handleRedoRouteChange(msg.id)} className="ml-1 px-1.5 py-0.5 rounded-full bg-blue-500/15 hover:bg-blue-500/30 border border-blue-400/20 text-blue-300 text-[9px] font-bold uppercase flex items-center gap-1 transition-all" title="Redo">
                            <Redo2 size={9} /> Redo
                          </button>
                        )}
                      </div>
                    )}
                    {msg.role === "user" && msg.resent && msg.originalSnapshot && (
                      <button onClick={() => handleRestoreOriginal(msg.id)} className="mb-1.5 px-1.5 py-0.5 rounded-full bg-amber-500/15 hover:bg-amber-500/30 border border-amber-400/20 text-amber-300 text-[9px] font-bold uppercase flex items-center gap-1 transition-all" title="Restore original">
                        <History size={9} /> Restore original
                      </button>
                    )}
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>
                  {msg.role === "assistant" && (
                    <button onClick={() => setPendingDeleteId(msg.id)} className="self-center ml-1.5 p-1 rounded-md opacity-0 group-hover/msg:opacity-100 hover:bg-red-500/20 text-white/30 hover:text-red-400 transition-all duration-150" title="Delete message">
                      <Trash2 size={11} />
                    </button>
                  )}
                </motion.div>
              ))
            )}
            {isSendingChat && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                <div className="px-3.5 py-2.5 rounded-2xl rounded-bl-md bg-white/[0.06] border border-white/10">
                  <div className="flex items-center gap-2">
                    <Loader size={12} className="animate-spin text-purple-400" />
                    <span className="text-white/40 text-xs">Thinking...</span>
                  </div>
                </div>
              </motion.div>
            )}
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={handleSendChat} className="flex items-center gap-2 shrink-0">
            <input
              ref={chatInputRef}
              type="text"
              placeholder="Add locations, ask about your route..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              disabled={isSendingChat}
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-white/[0.06] border border-white/10 text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-indigo-400/50 focus:border-indigo-400/30 text-xs disabled:opacity-40 transition-all"
            />
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
      <header className="relative z-10 shrink-0 px-3 lg:px-5 py-2 flex items-center gap-4 border-b border-white/5 bg-slate-950/60">
        <button
          className="flex items-center gap-2 mr-2 lg:pointer-events-none"
          onClick={() => {
            const el = document.querySelector('[data-scroll-container]');
            el?.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        >
          <span className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg shadow-blue-500/20">
            <Navigation2 size={16} className="text-white" />
          </span>
          <h1 className="text-base font-bold text-white leading-tight">
            KwikMaps
            <span className="text-[9px] ml-1 text-white/30 font-normal">
              v0.2
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

        <div className="flex items-center gap-2">
          <button
            onClick={() => setFeedbackOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-400/15 text-indigo-300 text-xs font-medium transition-all"
          >
            <MessageSquarePlus size={12} />
            <span className="hidden sm:inline">Feedback</span>
          </button>
          <button
            onClick={() => setBugReportOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-400/15 text-red-300 text-xs font-medium transition-all"
          >
            <Bug size={12} />
            <span className="hidden sm:inline">Bug</span>
          </button>
          <button
            onClick={() => coordinates.length > 0 ? setPendingDemo(true) : handleLoadDemo()}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 border border-purple-400/15 text-purple-300 text-xs font-medium transition-all"
          >
            <Sparkles size={12} />
            <span className="hidden sm:inline">Demo</span>
          </button>
          {optimizedRoute && (
            <button
              onClick={() => setPendingReset(true)}
              className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/8 text-white/50 hover:text-white/80 text-xs font-medium transition-all"
            >
              Clear
            </button>
          )}
        </div>
      </header>

      {/* ── MAIN CONTENT ── */}
      <div data-scroll-container className="relative z-10 flex-1 min-h-0 overflow-y-auto lg:overflow-hidden pb-12 lg:pb-0">
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
                      <div className="p-3 rounded-xl bg-white/[0.03] border border-white/8">
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

                    <button
                      onClick={handleOptimizeRoute}
                      disabled={coordinates.length < 2 || isOptimizing}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:from-gray-600 disabled:to-gray-700 text-white text-sm font-bold transition-all duration-150 disabled:cursor-not-allowed shrink-0"
                    >
                      {isOptimizing ? (
                        <>
                          <Loader size={15} className="animate-spin" />{" "}
                          Optimizing...
                        </>
                      ) : (
                        <>
                          <Navigation2 size={15} /> Map Out Route
                        </>
                      )}
                    </button>

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
                                  prev.length === 1 && prev[0] === coord.id ? [] : [coord.id],
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
                                    prev.length === 1 && prev[0] === i ? [] : [i],
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
      <ReportBug mode="feedback" open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
      <ReportBug mode="bug" open={bugReportOpen} onClose={() => setBugReportOpen(false)} />
    </div>
  );
}
