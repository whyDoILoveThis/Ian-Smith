// Shared types for the Chat module

export type AIMessage = {
  role: "user" | "assistant";
  content: string;
};

export type SlotState = {
  name: string;
  joinedAt: number | object;
  passkey?: string;
};

export type Slots = {
  "1"?: SlotState | null;
  "2"?: SlotState | null;
};

export type Message = {
  id: string;
  slotId: "1" | "2";
  sender: string;
  text?: string; // Encrypted text from DB
  decryptedText?: string; // Decrypted text for display
  imageUrl?: string;
  imageFileId?: string;
  videoUrl?: string;
  videoFileId?: string;
  createdAt?: number | object;
  decryptionFailed?: boolean;
  replyToId?: string;
  replyToSender?: string;
  replyToText?: string;
  replyToImageUrl?: string;
  readBy?: { "1"?: boolean; "2"?: boolean };
  seenReceiptBy?: { "1"?: boolean; "2"?: boolean };
  // Ephemeral video fields
  isEphemeral?: boolean;
  viewedBy?: { "1"?: boolean; "2"?: boolean };
  disappearedFor?: { "1"?: boolean; "2"?: boolean };
  // Reactions
  reactions?: Record<string, { "1"?: boolean; "2"?: boolean }>;
  // Drawing message fields
  drawingData?: RecordedDrawingStroke[];
  drawingDuration?: number;
};

// A single stroke in a recorded drawing
export type RecordedDrawingStroke = {
  points: { x: number; y: number }[];
  color: string;
  /** ms offset from recording start when stroke began */
  startTime: number;
  /** ms offset from recording start when stroke ended */
  endTime: number;
};

export type TttState = {
  board: Array<"1" | "2" | null>;
  turn: "1" | "2";
  winner: "1" | "2" | "draw" | null;
  winningLine: number[] | null;
  resetVotes: { "1"?: boolean; "2"?: boolean };
};

export type CallStatus = 
  | "idle"           // No call
  | "calling"        // Outgoing call, waiting for answer
  | "ringing"        // Incoming call, waiting to accept/decline
  | "connecting"     // Call accepted, WebRTC connecting
  | "connected"      // Call active
  | "ended"          // Call ended
  | "error";         // Call failed with error

export type CallErrorCode =
  | "MEDIA_PERMISSION_DENIED"      // User denied microphone access
  | "MEDIA_NOT_FOUND"              // No microphone found
  | "MEDIA_NOT_SUPPORTED"          // Browser doesn't support getUserMedia
  | "MEDIA_OVERCONSTRAINED"        // Audio constraints not satisfiable
  | "MEDIA_UNKNOWN"                // Other media error
  | "ICE_FAILED"                   // ICE negotiation failed
  | "ICE_DISCONNECTED"             // ICE disconnected (network issue)
  | "CONNECTION_FAILED"            // Peer connection failed
  | "CONNECTION_TIMEOUT"           // Connection took too long
  | "SIGNALING_FAILED"             // Firebase signaling failed
  | "OFFER_FAILED"                 // Failed to create/set offer
  | "ANSWER_FAILED"                // Failed to create/set answer
  | "REMOTE_HANGUP"                // Other party hung up
  | "FIREBASE_ERROR"               // Firebase database error
  | "UNKNOWN_ERROR";               // Catch-all error

export type CallError = {
  code: CallErrorCode;
  message: string;
  details?: string;
  timestamp: number;
};

export type CallDebugEvent = {
  timestamp: number;
  event: string;
  details?: string;
  level: "info" | "warn" | "error";
};

export type CallDebugState = {
  // Connection state
  signalingState: RTCSignalingState | null;
  iceConnectionState: RTCIceConnectionState | null;
  iceGatheringState: RTCIceGatheringState | null;
  connectionState: RTCPeerConnectionState | null;
  
  // Candidates
  localCandidatesCount: number;
  remoteCandidatesCount: number;
  pendingCandidatesCount: number;
  
  // Tracks
  localTracksCount: number;
  remoteTracksCount: number;
  
  // Media
  hasLocalStream: boolean;
  hasRemoteStream: boolean;
  localAudioEnabled: boolean;
  remoteAudioPlaying: boolean;
  
  // Firebase
  signalsReceived: number;
  signalsSent: number;
  lastSignalType: string | null;
  lastSignalTime: number | null;
  
  // Event log (last N events)
  eventLog: CallDebugEvent[];
};

export type CallSignal = {
  from: "1" | "2";
  to: "1" | "2";
  type: "offer" | "answer" | "candidate" | "hangup";
  sdp?: string;
  candidate?: RTCIceCandidateInit;
  timestamp: number | object;
};

export type CallState = {
  status: CallStatus;
  callerId: "1" | "2" | null;
  startedAt: number | null;
};

export type ChatTheme =
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "emerald"
  | "cyan"
  | "blue"
  | "purple"
  | "pink"
  | "rose";

export type ThemeColors = {
  bg: string;
  text: string;
  accent: string;
  ring: string;
  btn: string;
};

// Word Search Game Types
export type WordCell = {
  row: number;
  col: number;
};

export type WordSearchWord = {
  word: string;
  cells: WordCell[];
  points: number;
  foundBy?: "1" | "2" | null;
};

export type WordSearchState = {
  grid: string[][];
  words: WordSearchWord[];
  theme: string;
  gridSize: number;
  scores: { "1": number; "2": number };
  prompt: string;
  status: "idle" | "prompting" | "generating" | "playing" | "finished";
  generatedAt?: number;
  winner?: "1" | "2" | "tie" | null;
  currentSelection?: {
    slotId: "1" | "2";
    cells: WordCell[];
  } | null;
  resetVotes?: { "1"?: boolean; "2"?: boolean };
};
