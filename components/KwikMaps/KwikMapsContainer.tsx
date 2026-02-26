"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { Coordinate } from "@/types/KwikMaps.type";
import { CoordinateInput, CoordinateList, MapComponent } from "./components";
import {
  Navigation2,
  Clock,
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
  optimizedRoute: Coordinate[];
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
  const resultsRef = useRef<HTMLDivElement>(null);

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isSendingChat, setIsSendingChat] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

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

        // Scroll to results after a short delay
        setTimeout(() => {
          resultsRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }, 300);
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
      if (msg.previousRoute.coordinates) {
        setCoordinates(msg.previousRoute.coordinates);
      }

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
      if (msg.newRoute.coordinates) {
        setCoordinates(msg.newRoute.coordinates);
      }

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

  const handleSendChat = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const msg = chatInput.trim();
    if (!msg || !optimizedRoute || isSendingChat) return;

    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: "user",
      content: msg,
    };

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
          currentRoute: optimizedRoute,
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
          const previousSnapshot: RouteSnapshot = {
            optimizedRoute: optimizedRoute!,
            legs,
            totalDistanceMiles,
            totalDistanceKm,
            coordinates: [...coordinates],
          };

          // Compute new coordinates list after add/remove
          let newCoordinates = [...coordinates];
          if (data.routeUpdate.removedCoordinateIds) {
            const removeSet = new Set(data.routeUpdate.removedCoordinateIds);
            newCoordinates = newCoordinates.filter((c) => !removeSet.has(c.id));
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

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-4 md:p-8">
      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      {/* Main content */}
      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500">
              <Navigation2 size={24} className="text-white" />
            </span>
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-300 to-cyan-300 bg-clip-text text-transparent">
              KwikMaps
            </h1>
          </div>
          <p className="text-white/60 text-lg">
            AI-powered route optimization with hotel recommendations
          </p>
        </div>

        {/* Main layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Left sidebar - Input and list */}
          <div className="lg:col-span-1 space-y-6">
            {/* Input section */}
            <div className="p-6 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <MapPin size={20} className="text-blue-400" />
                Add Locations
              </h2>
              <CoordinateInput onAddCoordinate={handleAddCoordinate} />
            </div>

            {/* List section */}
            <div className="p-6 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl">
              <CoordinateList
                coordinates={coordinates}
                onRemoveCoordinate={handleRemoveCoordinate}
                optimizedOrder={
                  optimizedRoute ? optimizedRoute.map((c) => c.id) : undefined
                }
              />
            </div>

            {/* Action buttons */}
            <div className="space-y-3">
              <button
                onClick={handleOptimizeRoute}
                disabled={coordinates.length < 2 || isOptimizing}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:from-gray-500 disabled:to-gray-600 text-white font-bold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {isOptimizing ? (
                  <>
                    <span className="inline-block animate-spin">⚡</span>
                    Optimizing with AI...
                  </>
                ) : (
                  <>
                    <Navigation2 size={20} />
                    Map Out Route
                  </>
                )}
              </button>

              {optimizedRoute && (
                <button
                  onClick={handleReset}
                  className="w-full px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold transition-all duration-200"
                >
                  Clear Route
                </button>
              )}

              <button
                onClick={handleLoadDemo}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500/50 to-pink-500/50 hover:from-purple-600/60 hover:to-pink-600/60 border border-purple-400/30 text-white font-semibold transition-all duration-200 transform hover:scale-105 active:scale-95"
              >
                <Sparkles size={18} />
                Load Demo (10 TN Cities)
              </button>
            </div>

            {/* Error message */}
            {error && (
              <div className="p-4 rounded-xl bg-red-500/20 backdrop-blur-md border border-red-400/30 text-red-200 text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Right side - Map */}
          <div className="lg:col-span-2 space-y-6">
            <div className="h-96 lg:h-full min-h-96 rounded-2xl overflow-hidden shadow-2xl">
              <MapComponent
                coordinates={coordinates}
                optimizedRoute={optimizedRoute || undefined}
                isLoading={isOptimizing}
                error={error && coordinates.length > 0 ? error : undefined}
              />
            </div>
          </div>
        </div>

        {/* Results section */}
        <AnimatePresence>
          {showResults && optimizedRoute && (
            <motion.div
              ref={resultsRef}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              {/* Stats bar */}
              <div className="p-6 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-1">
                      Route Optimized
                    </h3>
                    <p className="text-white/60">
                      {optimizedRoute.length} stops planned with AI-powered
                      insights
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="px-5 py-3 rounded-xl bg-white/10 border border-white/20">
                      <div className="flex items-center gap-2 text-white/60 mb-1">
                        <Map size={14} />
                        <span className="text-xs uppercase tracking-wide">
                          Distance
                        </span>
                      </div>
                      <p className="text-xl font-bold text-cyan-400">
                        {totalDistanceMiles.toFixed(0)} mi
                      </p>
                      <p className="text-xs text-white/40">
                        {totalDistanceKm.toFixed(0)} km
                      </p>
                    </div>
                    <div className="px-5 py-3 rounded-xl bg-white/10 border border-white/20">
                      <div className="flex items-center gap-2 text-white/60 mb-1">
                        <Route size={14} />
                        <span className="text-xs uppercase tracking-wide">
                          Legs
                        </span>
                      </div>
                      <p className="text-xl font-bold text-cyan-400">
                        {legs.length}
                      </p>
                      <p className="text-xs text-white/40">segments</p>
                    </div>
                  </div>
                </div>

                {/* Optimized route cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {optimizedRoute.map((coord, index) => (
                    <motion.div
                      key={coord.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-4 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-white/20 hover:border-white/40 transition-all"
                    >
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-blue-400 to-cyan-400 text-white font-bold mb-2 mx-auto">
                        {index + 1}
                      </div>
                      <p className="text-white font-semibold text-center text-sm">
                        {coord.name}
                      </p>
                      <p className="text-white/50 text-xs text-center mt-1">
                        {coord.latitude.toFixed(4)},{" "}
                        {coord.longitude.toFixed(4)}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Route legs */}
              {legs.length > 0 && (
                <div className="p-6 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Route size={20} className="text-emerald-400" />
                    Route Legs
                  </h3>
                  <div className="space-y-2">
                    {legs.map((leg, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                      >
                        <div className="flex items-center justify-center w-7 h-7 rounded-md bg-emerald-500/30 text-emerald-300 text-xs font-bold shrink-0">
                          {i + 1}
                        </div>
                        <span className="text-white/90 text-sm font-medium">
                          {leg.from}
                        </span>
                        <ChevronRight
                          size={14}
                          className="text-white/30 shrink-0"
                        />
                        <span className="text-white/90 text-sm font-medium">
                          {leg.to}
                        </span>
                        <span className="ml-auto text-cyan-400 text-sm font-semibold whitespace-nowrap">
                          {leg.distanceMiles} mi
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Insights panel */}
              {aiInsights && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="p-6 rounded-2xl bg-gradient-to-br from-purple-500/10 to-blue-500/10 backdrop-blur-xl border border-purple-400/20 shadow-2xl"
                >
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Bot size={20} className="text-purple-400" />
                    AI Travel Insights & Hotel Recommendations
                  </h3>
                  <div className="prose prose-invert max-w-none">
                    <div className="text-white/85 text-sm leading-relaxed whitespace-pre-wrap">
                      {aiInsights}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Chat with AI panel */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="p-6 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 backdrop-blur-xl border border-indigo-400/20 shadow-2xl"
              >
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <MessageCircle size={20} className="text-indigo-400" />
                  Chat with AI about your route
                </h3>
                <p className="text-white/50 text-xs mb-4">
                  Suggest changes like &quot;why not put Memphis first?&quot;,
                  &quot;swap stops 3 and 5&quot;, &quot;add a stop in
                  Atlanta&quot;, or &quot;remove Memphis&quot; — the AI will
                  evaluate and update the map.
                </p>

                {/* Chat messages */}
                <div className="max-h-80 overflow-y-auto mb-4 space-y-3 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent pr-2">
                  {chatMessages.length === 0 && (
                    <div className="text-center py-8">
                      <Bot size={32} className="text-white/20 mx-auto mb-2" />
                      <p className="text-white/30 text-sm">
                        Ask me anything about your route...
                      </p>
                    </div>
                  )}
                  {chatMessages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                          msg.role === "user"
                            ? "bg-blue-500/30 border border-blue-400/30 text-white rounded-br-md"
                            : "bg-white/10 border border-white/15 text-white/90 rounded-bl-md"
                        }`}
                      >
                        {msg.role === "assistant" && (
                          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                            <Bot size={12} className="text-purple-400" />
                            <span className="text-purple-400 text-xs font-semibold">
                              AI
                            </span>
                            {msg.routeChanged && (
                              <span
                                className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                  msg.undone
                                    ? "bg-gray-500/30 text-gray-400 line-through"
                                    : "bg-emerald-500/30 text-emerald-300"
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
                                  className="ml-1 px-2 py-0.5 rounded-full bg-amber-500/20 hover:bg-amber-500/40 border border-amber-400/30 text-amber-300 text-[10px] font-bold uppercase flex items-center gap-1 transition-all duration-200 hover:scale-105 active:scale-95"
                                  title="Undo this route change"
                                >
                                  <Undo2 size={10} />
                                  Undo
                                </button>
                              )}
                            {msg.routeChanged && msg.newRoute && msg.undone && (
                              <button
                                onClick={() => handleRedoRouteChange(msg.id)}
                                className="ml-1 px-2 py-0.5 rounded-full bg-blue-500/20 hover:bg-blue-500/40 border border-blue-400/30 text-blue-300 text-[10px] font-bold uppercase flex items-center gap-1 transition-all duration-200 hover:scale-105 active:scale-95"
                                title="Redo this route change"
                              >
                                <Redo2 size={10} />
                                Redo
                              </button>
                            )}
                          </div>
                        )}
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                      </div>
                    </motion.div>
                  ))}
                  {isSendingChat && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex justify-start"
                    >
                      <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-white/10 border border-white/15">
                        <div className="flex items-center gap-2">
                          <Loader
                            size={14}
                            className="animate-spin text-purple-400"
                          />
                          <span className="text-white/50 text-sm">
                            Thinking...
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Chat input */}
                <form
                  onSubmit={handleSendChat}
                  className="flex items-center gap-2"
                >
                  <input
                    ref={chatInputRef}
                    type="text"
                    placeholder="e.g., Why not visit Memphis first instead?"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    disabled={isSendingChat}
                    className="flex-1 px-4 py-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all duration-200 text-sm disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim() || isSendingChat}
                    className="p-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 disabled:from-gray-500 disabled:to-gray-600 text-white transition-all duration-200 transform hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    <Send size={18} />
                  </button>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
