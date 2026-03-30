import { NextResponse } from "next/server";
import { callGroq } from "@/components/ItsSmarterAI/lib/groq";
import { TODO_GENERATION_PROMPT } from "@/components/ItsSmarterAI/lib/prompts";
import { parseJsonArray } from "@/components/ItsSmarterAI/utils/confidence";

/**
 * POST /api/smarter-ai-pipeline/focal-point-generator/todo-generator
 * Generates a todo list from a focal point and its analysis.
 * Expects: { focalPoint: string, analysis: string }
 * Returns: { todos: string[] }
 */
export async function POST(req: Request) {
  try {
    const { focalPoint, analysis } = await req.json();

    if (!focalPoint || !analysis) {
      return NextResponse.json({ error: "focalPoint and analysis are required" }, { status: 400 });
    }

    const raw = await callGroq([
      { role: "system", content: TODO_GENERATION_PROMPT },
      {
        role: "user",
        content: `Focal point: "${focalPoint}"\n\nAnalysis:\n${analysis}\n\nGenerate specific implementation steps.`,
      },
    ]);

    const todos = parseJsonArray(raw);

    if (todos.length === 0) {
      return NextResponse.json({ error: "Failed to generate todos" }, { status: 502 });
    }

    return NextResponse.json({ todos });
  } catch (err) {
    console.error("todo-generator error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
