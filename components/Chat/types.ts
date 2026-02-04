// Shared types for the Chat module

export type AIMessage = {
  role: "user" | "assistant";
  content: string;
};

export type SlotState = {
  name: string;
  joinedAt: number | object;
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
  readBy?: { "1"?: boolean; "2"?: boolean };
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
  | "ended";         // Call ended

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

export type ChatTheme = "emerald" | "blue" | "purple" | "rose";

export type ThemeColors = {
  bg: string;
  text: string;
  accent: string;
  ring: string;
  btn: string;
};
