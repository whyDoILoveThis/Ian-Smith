import { NextResponse } from "next/server";
import { callGroq } from "@/components/ItsSmarterAI/lib/groq";
import { MEDIUM_SUMMARY_PROMPT } from "@/components/ItsSmarterAI/lib/prompts";

/**
 * POST /api/smarter-ai-pipeline/medium-summary
 * Given a focal point + its todos, produces a short summary instead of deep execution.
 * Expects: { prompt: string, focalPoint: string, todos: string[] }
 * Returns: { summary: string }
 */
export async function POST(req: Request) {
  try {
    const { prompt, focalPoint, todos } = await req.json();

    if (!prompt || !focalPoint || !Array.isArray(todos)) {
      return NextResponse.json(
        { error: "prompt, focalPoint, and todos are required" },
        { status: 400 }
      );
    }

    const todoBlock = todos.map((t: string, i: number) => `${i + 1}. ${t}`).join("\n");

    const summary = await callGroq([
      { role: "system", content: MEDIUM_SUMMARY_PROMPT },
      {
        role: "user",
        content: `Original prompt: "${prompt}"\n\nFocal point: "${focalPoint}"\n\nTodo list:\n${todoBlock}\n\nProvide a concise summary.`,
      },
    ]);

    return NextResponse.json({ summary });
  } catch (err) {
    console.error("medium-summary error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
