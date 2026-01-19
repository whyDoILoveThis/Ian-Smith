export type Message = { role: "user" | "assistant"; content: string, timestamp?: number; };
export type Conversation = { id: string; title: string; messages: Message[]; fingerprint?: string; };
