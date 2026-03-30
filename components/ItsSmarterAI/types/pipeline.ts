export type ThinkingMode = "fast" | "medium" | "deep";

export type PipelineStatus =
  | "idle"
  | "thinking"
  | "decomposing"
  | "processing-focal-points"
  | "processing-todos"
  | "synthesizing"
  | "complete"
  | "error";

export type ItemStatus = "pending" | "running" | "retrying" | "complete" | "failed";

export interface TodoItem {
  id: string;
  focalPointId: string;
  text: string;
  status: ItemStatus;
  response: string | null;
  confidence: number;
  confidenceReasoning: string;
  retryCount: number;
}

export interface FocalPoint {
  id: string;
  text: string;
  status: ItemStatus;
  response: string | null;
  confidence: number;
  confidenceReasoning: string;
  retryCount: number;
  todos: TodoItem[];
}

/** A single turn in the conversation — the user's prompt + the pipeline result */
export interface ConversationTurn {
  id: string;
  mode: ThinkingMode;
  prompt: string;
  status: PipelineStatus;
  focalPoints: FocalPoint[];
  finalOutput: string | null;
  error: string | null;
}

export interface PipelineState {
  status: PipelineStatus;
  mode: ThinkingMode;
  turns: ConversationTurn[];
  /** Index of the turn currently being processed (-1 if idle) */
  activeTurnIndex: number;
}

export const INITIAL_PIPELINE_STATE: PipelineState = {
  status: "idle",
  mode: "deep",
  turns: [],
  activeTurnIndex: -1,
};
