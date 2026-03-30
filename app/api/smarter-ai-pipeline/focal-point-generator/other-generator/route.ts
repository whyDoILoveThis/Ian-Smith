import { NextResponse } from "next/server";
import { callGroq } from "@/components/ItsSmarterAI/lib/groq";
import { EXECUTION_PROMPT, CONFIDENCE_PROMPT } from "@/components/ItsSmarterAI/lib/prompts";
import { EVALUATION_TEMPERATURE } from "@/components/ItsSmarterAI/lib/constants";
import { parseConfidence } from "@/components/ItsSmarterAI/utils/confidence";

/**
 * POST /api/smarter-ai-pipeline/focal-point-generator/other-generator
 * Executes analysis for a single focal point and scores it.
 * Expects: { prompt: string, focalPoint: string }
 * Returns: { response: string, confidence: number, confidenceReasoning: string }
 */
export async function POST(req: Request) {
  try {
    const { prompt, focalPoint } = await req.json();

    if (!prompt || !focalPoint) {
      return NextResponse.json({ error: "prompt and focalPoint are required" }, { status: 400 });
    }

    // Step 1: Execute the focal point analysis
    const response = await callGroq([
      { role: "system", content: EXECUTION_PROMPT },
      {
        role: "user",
        content: `Original prompt: "${prompt}"\n\nFocal point to address: "${focalPoint}"\n\nProvide a thorough analysis of this specific aspect.`,
      },
    ]);

    // Brief gap between execute and score to avoid back-to-back rate hits
    await new Promise((r) => setTimeout(r, 1500));

    // Step 2: Score the response quality
    const scoreRaw = await callGroq(
      [
        { role: "system", content: CONFIDENCE_PROMPT },
        {
          role: "user",
          content: `Original prompt: "${prompt}"\nFocal point: "${focalPoint}"\nResponse to evaluate:\n${response}`,
        },
      ],
      EVALUATION_TEMPERATURE
    );

    const { confidence, reasoning } = parseConfidence(scoreRaw);

    return NextResponse.json({ response, confidence, confidenceReasoning: reasoning });
  } catch (err) {
    console.error("focal-point executor error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
