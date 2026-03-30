import { NextResponse } from "next/server";
import { callGroq } from "@/components/ItsSmarterAI/lib/groq";
import { TODO_EXECUTION_PROMPT, CONFIDENCE_PROMPT } from "@/components/ItsSmarterAI/lib/prompts";
import { EVALUATION_TEMPERATURE } from "@/components/ItsSmarterAI/lib/constants";
import { parseConfidence } from "@/components/ItsSmarterAI/utils/confidence";

/**
 * POST /api/smarter-ai-pipeline/focal-point-generator/another-generator
 * Executes a single todo step and scores it.
 * Expects: { prompt: string, focalPoint: string, todo: string }
 * Returns: { response: string, confidence: number, confidenceReasoning: string }
 */
export async function POST(req: Request) {
  try {
    const { prompt, focalPoint, todo } = await req.json();

    if (!prompt || !focalPoint || !todo) {
      return NextResponse.json(
        { error: "prompt, focalPoint, and todo are required" },
        { status: 400 }
      );
    }

    // Step 1: Execute the todo
    const response = await callGroq([
      { role: "system", content: TODO_EXECUTION_PROMPT },
      {
        role: "user",
        content: `Original prompt: "${prompt}"\nFocal point: "${focalPoint}"\n\nTask to implement: "${todo}"\n\nProvide detailed, actionable guidance.`,
      },
    ]);

    // Brief gap between execute and score to avoid back-to-back rate hits
    await new Promise((r) => setTimeout(r, 1500));

    // Step 2: Score the response
    const scoreRaw = await callGroq(
      [
        { role: "system", content: CONFIDENCE_PROMPT },
        {
          role: "user",
          content: `Original prompt: "${prompt}"\nTask: "${todo}"\nResponse to evaluate:\n${response}`,
        },
      ],
      EVALUATION_TEMPERATURE
    );

    const { confidence, reasoning } = parseConfidence(scoreRaw);

    return NextResponse.json({ response, confidence, confidenceReasoning: reasoning });
  } catch (err) {
    console.error("todo-executor error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
