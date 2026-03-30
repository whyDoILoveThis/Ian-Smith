import { NextResponse } from "next/server";
import { callGroq } from "@/components/ItsSmarterAI/lib/groq";

/**
 * POST /api/smarter-ai-pipeline/fast-chat
 * Simple single-shot chat with optional conversation history.
 * Expects: { prompt: string, history?: { role: string; content: string }[] }
 * Returns: { reply: string }
 */
export async function POST(req: Request) {
  try {
    const { prompt, history } = await req.json();

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    }

    const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
      {
        role: "system",
        content:
          "You are a helpful, knowledgeable assistant. Provide clear, concise, well-structured answers. Be direct and practical.",
      },
    ];

    // Append conversation history if provided
    if (Array.isArray(history)) {
      for (const msg of history) {
        if (msg.role === "user" || msg.role === "assistant") {
          messages.push({ role: msg.role, content: msg.content });
        }
      }
    }

    messages.push({ role: "user", content: prompt });

    const reply = await callGroq(messages);

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("fast-chat error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
