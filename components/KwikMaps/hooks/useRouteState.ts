"use client";

import { useState, useCallback } from "react";
import { Coordinate } from "@/types/KwikMaps.type";
import { v4 as uuidv4 } from "uuid";
import type { RouteLeg, RouteState } from "../types/chat.types";

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

export function useRouteState() {
  const [coordinates, setCoordinates] = useState<Coordinate[]>([]);
  const [optimizedRoute, setOptimizedRoute] = useState<Coordinate[] | null>(null);
  const [legs, setLegs] = useState<RouteLeg[]>([]);
  const [totalDistanceMiles, setTotalDistanceMiles] = useState(0);
  const [totalDistanceKm, setTotalDistanceKm] = useState(0);
  const [error, setError] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [aiInsights, setAiInsights] = useState("");

  const getRouteState = useCallback((): RouteState => ({
    coordinates,
    optimizedRoute,
    legs,
    totalDistanceMiles,
    totalDistanceKm,
  }), [coordinates, optimizedRoute, legs, totalDistanceMiles, totalDistanceKm]);

  const applyRouteState = useCallback((state: RouteState) => {
    setCoordinates(state.coordinates);
    setOptimizedRoute(state.optimizedRoute);
    setLegs(state.legs);
    setTotalDistanceMiles(state.totalDistanceMiles);
    setTotalDistanceKm(state.totalDistanceKm);
  }, []);

  const handleAddCoordinate = useCallback((coordinate: Coordinate) => {
    setCoordinates((prev) => [...prev, coordinate]);
    setError("");
  }, []);

  const handleRemoveCoordinate = useCallback(
    (id: string) => {
      setCoordinates((prev) => prev.filter((c) => c.id !== id));
      if (optimizedRoute) {
        setOptimizedRoute((prev) => (prev ? prev.filter((c) => c.id !== id) : null));
      }
    },
    [optimizedRoute],
  );

  const handleImportRoute = useCallback((imported: Coordinate[]) => {
    setCoordinates(imported);
    setOptimizedRoute(null);
    setShowResults(false);
    setError("");
  }, []);

  const handleReset = useCallback(() => {
    setOptimizedRoute(null);
    setShowResults(false);
    setTotalDistanceMiles(0);
    setTotalDistanceKm(0);
    setLegs([]);
    setAiInsights("");
  }, []);

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

  return {
    coordinates,
    setCoordinates,
    optimizedRoute,
    setOptimizedRoute,
    legs,
    setLegs,
    totalDistanceMiles,
    setTotalDistanceMiles,
    totalDistanceKm,
    setTotalDistanceKm,
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
    handleImportRoute,
    handleReset,
    handleLoadDemo,
  };
}
