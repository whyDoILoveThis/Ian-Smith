import { NextResponse } from "next/server";
import { callGroq } from "@/components/ItsSmarterAI/lib/groq";
import { SYNTHESIS_PROMPT } from "@/components/ItsSmarterAI/lib/prompts";

/**
 * POST /api/smarter-ai-pipeline/synthesize
 * Synthesizes all focal point analyses and todo results into a final answer.
 * Expects: { prompt: string, analyses: { focalPoint: string, analysis: string, todos: { text: string, result: string }[] }[] }
 * Returns: { synthesis: string }
 */
export async function POST(req: Request) {
  try {
    const { prompt, analyses } = await req.json();

    if (!prompt || !analyses || !Array.isArray(analyses)) {
      return NextResponse.json({ error: "prompt and analyses are required" }, { status: 400 });
    }

    // Build a structured context block from all analysis stages
    const contextBlock = analyses
      .map(
        (a: { focalPoint: string; analysis: string; todos: { text: string; result: string }[] }, i: number) => {
          const todoBlock = a.todos
            .map((t, j) => `  Step ${j + 1}: ${t.text}\n  Result: ${t.result}`)
            .join("\n\n");

          return `--- Focal Point ${i + 1}: ${a.focalPoint} ---\nAnalysis: ${a.analysis}\n\nImplementation Steps:\n${todoBlock}`;
        }
      )
      .join("\n\n");

    const response = await callGroq([
      { role: "system", content: SYNTHESIS_PROMPT },
      {
        role: "user",
        content: `Original prompt: "${prompt}"\n\nAll analysis results:\n\n${contextBlock}\n\nSynthesize everything into a final comprehensive answer.`,
      },
    ]);

    return NextResponse.json({ synthesis: response });
  } catch (err) {
    console.error("synthesis error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
