import { Coordinate } from "@/types/KwikMaps.type";
import { v4 as uuidv4 } from "uuid";
import type {
  Action,
  ExecutionResult,
  RouteLeg,
  RouteState,
} from "../types/chat.types";

// ── Haversine formula ──

function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function computeRouteStats(route: Coordinate[]) {
  let totalKm = 0;
  const legs: RouteLeg[] = [];
  for (let i = 0; i < route.length - 1; i++) {
    const km = haversineDistance(
      route[i].latitude,
      route[i].longitude,
      route[i + 1].latitude,
      route[i + 1].longitude,
    );
    totalKm += km;
    legs.push({
      from: route[i].name,
      to: route[i + 1].name,
      distanceKm: Math.round(km * 10) / 10,
      distanceMiles: Math.round(km * 0.621371 * 10) / 10,
    });
  }
  return {
    totalDistanceKm: Math.round(totalKm * 10) / 10,
    totalDistanceMiles: Math.round(totalKm * 0.621371 * 10) / 10,
    legs,
  };
}

// ── TSP Solver ──

function buildDistanceMatrix(coordinates: Coordinate[]): number[][] {
  const n = coordinates.length;
  const matrix: number[][] = [];
  for (let i = 0; i < n; i++) {
    matrix[i] = [];
    for (let j = 0; j < n; j++) {
      matrix[i][j] =
        i === j
          ? 0
          : haversineDistance(
              coordinates[i].latitude,
              coordinates[i].longitude,
              coordinates[j].latitude,
              coordinates[j].longitude,
            );
    }
  }
  return matrix;
}

function nearestNeighbor(n: number, distMatrix: number[][]): number[] {
  const visited = new Array(n).fill(false);
  const route: number[] = [0];
  visited[0] = true;
  for (let step = 1; step < n; step++) {
    const current = route[route.length - 1];
    let nearest = -1;
    let minDist = Infinity;
    for (let j = 0; j < n; j++) {
      if (!visited[j] && distMatrix[current][j] < minDist) {
        minDist = distMatrix[current][j];
        nearest = j;
      }
    }
    route.push(nearest);
    visited[nearest] = true;
  }
  return route;
}

function twoOptImprove(route: number[], distMatrix: number[][]): number[] {
  const n = route.length;
  let improved = true;
  let bestRoute = [...route];
  while (improved) {
    improved = false;
    for (let i = 0; i < n - 1; i++) {
      for (let k = i + 2; k < n; k++) {
        const a = bestRoute[i];
        const b = bestRoute[i + 1];
        const c = bestRoute[k];
        const d = k + 1 < n ? bestRoute[k + 1] : bestRoute[0];
        if (
          distMatrix[a][b] + distMatrix[c][d] >
          distMatrix[a][c] + distMatrix[b][d]
        ) {
          bestRoute = [
            ...bestRoute.slice(0, i + 1),
            ...bestRoute.slice(i + 1, k + 1).reverse(),
            ...bestRoute.slice(k + 1),
          ];
          improved = true;
          break;
        }
      }
      if (improved) break;
    }
  }
  return bestRoute;
}

export function solveTSP(coordinates: Coordinate[]): Coordinate[] {
  if (coordinates.length <= 2) return coordinates.map((c, i) => ({ ...c, order: i + 1 }));
  const distMatrix = buildDistanceMatrix(coordinates);
  const nnRoute = nearestNeighbor(coordinates.length, distMatrix);
  const optimized = twoOptImprove(nnRoute, distMatrix);
  return optimized.map((idx, order) => ({
    ...coordinates[idx],
    order: order + 1,
  }));
}

// ── Deterministic action execution engine ──

/**
 * Executes a list of validated actions against the current route state.
 *
 * Execution order is ALWAYS:
 *   1. REMOVE_STOP
 *   2. ADD_STOP
 *   3. REORDER_STOPS
 *   4. OPTIMIZE_ROUTE
 *
 * `geocodedLocations` supplies real lat/lng for ADD_STOP actions
 * (coordinates come from the geocoding API, never from AI).
 */
export function executeActions(
  actions: Action[],
  state: RouteState,
  geocodedLocations?: Map<string, { latitude: number; longitude: number }>,
): ExecutionResult {
  // Sort actions into execution buckets
  const removes = actions.filter((a) => a.type === "REMOVE_STOP");
  const adds = actions.filter((a) => a.type === "ADD_STOP");
  const reorders = actions.filter((a) => a.type === "REORDER_STOPS");
  const optimizes = actions.filter((a) => a.type === "OPTIMIZE_ROUTE");

  // Work with the active route (optimizedRoute if available, else coordinates)
  let workingRoute = [...(state.optimizedRoute ?? state.coordinates)];
  let allCoordinates = [...state.coordinates];
  const addedCoordinates: Coordinate[] = [];
  const removedCoordinateIds: string[] = [];
  let changed = false;

  // 1. REMOVE_STOP
  for (const action of removes) {
    if (action.type !== "REMOVE_STOP") continue;
    const { stopNumbers } = action.payload;
    const N = workingRoute.length;
    const validNums = stopNumbers.filter((n) => n >= 1 && n <= N);
    if (validNums.length > 0 && validNums.length < N) {
      const removeSet = new Set(validNums);
      validNums.forEach((n) => removedCoordinateIds.push(workingRoute[n - 1].id));
      workingRoute = workingRoute.filter((_, i) => !removeSet.has(i + 1));
      const idSet = new Set(removedCoordinateIds);
      allCoordinates = allCoordinates.filter((c) => !idSet.has(c.id));
      changed = true;
    }
  }

  // 2. ADD_STOP
  for (const action of adds) {
    if (action.type !== "ADD_STOP") continue;
    const { name, afterStop } = action.payload;
    const geo = geocodedLocations?.get(name);
    if (!geo) continue; // skip if geocoding failed

    const newCoord: Coordinate = {
      id: uuidv4(),
      name,
      latitude: geo.latitude,
      longitude: geo.longitude,
    };
    const insertAt = Math.min(Math.max(afterStop, 0), workingRoute.length);
    workingRoute.splice(insertAt, 0, newCoord);
    allCoordinates.push(newCoord);
    addedCoordinates.push(newCoord);
    changed = true;
  }

  // 3. REORDER_STOPS
  for (const action of reorders) {
    if (action.type !== "REORDER_STOPS") continue;
    const { newOrder } = action.payload;
    const N = workingRoute.length;
    const valid =
      newOrder.length === N &&
      newOrder.every((n) => n >= 1 && n <= N) &&
      new Set(newOrder).size === N;
    if (valid) {
      workingRoute = newOrder.map((stopNum, index) => ({
        ...workingRoute[stopNum - 1],
        order: index + 1,
      }));
      changed = true;
    }
  }

  // 4. OPTIMIZE_ROUTE (supports partial optimization via lockedPrefix)
  if (optimizes.length > 0 && workingRoute.length >= 2) {
    const opt = optimizes[0];
    const lockedPrefix = (opt.type === "OPTIMIZE_ROUTE" && opt.payload?.lockedPrefix) || 0;
    if (lockedPrefix > 0 && lockedPrefix < workingRoute.length) {
      // Keep first N stops locked, optimize only the rest
      const locked = workingRoute.slice(0, lockedPrefix);
      const toOptimize = workingRoute.slice(lockedPrefix);
      if (toOptimize.length >= 2) {
        const optimized = solveTSP(toOptimize);
        workingRoute = [...locked, ...optimized];
      }
    } else {
      workingRoute = solveTSP(workingRoute);
    }
    changed = true;
  }

  // Finalize
  if (changed) {
    workingRoute = workingRoute.map((c, i) => ({ ...c, order: i + 1 }));
    const stats = computeRouteStats(workingRoute);
    return {
      newState: {
        coordinates: allCoordinates,
        optimizedRoute: workingRoute,
        legs: stats.legs,
        totalDistanceMiles: stats.totalDistanceMiles,
        totalDistanceKm: stats.totalDistanceKm,
      },
      addedCoordinates,
      removedCoordinateIds,
      routeChanged: true,
    };
  }

  return {
    newState: state,
    addedCoordinates: [],
    removedCoordinateIds: [],
    routeChanged: false,
  };
}
