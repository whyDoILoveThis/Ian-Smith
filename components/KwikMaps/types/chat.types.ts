import { Coordinate } from "@/types/KwikMaps.type";

// ── Action types the AI (or local intent) can produce ──

export type ActionType =
  | "ADD_STOP"
  | "REMOVE_STOP"
  | "REORDER_STOPS"
  | "OPTIMIZE_ROUTE";

export interface AddStopPayload {
  name: string;
  afterStop: number; // 0 = beginning, N = after Nth stop
}

export interface RemoveStopPayload {
  stopNumbers: number[]; // 1-indexed
}

export interface ReorderStopsPayload {
  newOrder: number[]; // 1-indexed, must list all stops exactly once
}

// OPTIMIZE_ROUTE payload — optional lockedPrefix to keep first N stops in place
export interface OptimizeRoutePayload {
  lockedPrefix?: number; // keep first N stops fixed, optimize the rest
}

export interface RouteAction {
  type: "ADD_STOP";
  payload: AddStopPayload;
}

export interface RemoveAction {
  type: "REMOVE_STOP";
  payload: RemoveStopPayload;
}

export interface ReorderAction {
  type: "REORDER_STOPS";
  payload: ReorderStopsPayload;
}

export interface OptimizeAction {
  type: "OPTIMIZE_ROUTE";
  payload?: OptimizeRoutePayload;
  lockedPrefix?: number; // convenience alias
}

export type Action = RouteAction | RemoveAction | ReorderAction | OptimizeAction;

export interface AIResponse {
  actions: Action[];
  message: string;
}

// ── Validated response wrapper ──

export interface ValidatedResponse {
  ok: true;
  data: AIResponse;
}

export interface ValidationError {
  ok: false;
  error: string;
  fallbackMessage: string;
}

export type ValidationResult = ValidatedResponse | ValidationError;

// ── Route state for the execution engine ──

export interface RouteLeg {
  from: string;
  to: string;
  distanceKm: number;
  distanceMiles: number;
}

export interface RouteSnapshot {
  optimizedRoute: Coordinate[] | null;
  legs: RouteLeg[];
  totalDistanceMiles: number;
  totalDistanceKm: number;
  coordinates: Coordinate[];
}

export interface RouteState {
  coordinates: Coordinate[];
  optimizedRoute: Coordinate[] | null;
  legs: RouteLeg[];
  totalDistanceMiles: number;
  totalDistanceKm: number;
}

// ── Chat message types ──

export interface ChatMessage {
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

// ── Local intent detection ──

export type LocalIntentType =
  | "OPTIMIZE"
  | "REMOVE_STOP"
  | "SWAP_STOPS"
  | "MOVE_STOP"
  | "REVERSE_ROUTE"
  | "CLEAR_ROUTE";

export interface LocalIntent {
  type: LocalIntentType;
  actions: Action[];
  message: string;
}

// ── API request/response shapes ──

export interface ChatAPIRequest {
  message: string;
  stops: { index: number; name: string; lat: number; lng: number }[];
  hasRoute: boolean;
  conversationHistory: { role: string; content: string }[];
  creativity: number; // 1-10
}

export interface ChatAPIResponse {
  success: true;
  actions: Action[];
  message: string;
  geocoded?: { name: string; latitude: number; longitude: number }[];
}

export interface ChatAPIError {
  error: string;
}

// ── Execution result ──

export interface ExecutionResult {
  newState: RouteState;
  addedCoordinates: Coordinate[];
  removedCoordinateIds: string[];
  routeChanged: boolean;
}
