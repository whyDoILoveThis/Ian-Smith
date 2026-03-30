import { NextResponse } from "next/server";
import { callGroq } from "@/components/ItsSmarterAI/lib/groq";
import { DECOMPOSITION_PROMPT } from "@/components/ItsSmarterAI/lib/prompts";

/**
 * POST /api/smarter-ai-pipeline/focal-point-generator
 * Decomposes a user prompt into 3-5 focal points.
 * Expects: { prompt: string }
 * Returns: { focalPoints: string[] }
 */
export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    }

    const raw = await callGroq([
      { role: "system", content: DECOMPOSITION_PROMPT },
      { role: "user", content: prompt },
    ]);

    // Parse the JSON array from the response
    let focalPoints: string[];
    try {
      const cleaned = raw.replace(/^```json?\s*/i, "").replace(/```\s*$/, "");
      const parsed = JSON.parse(cleaned);
      focalPoints = Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      // Fallback: extract array from surrounding text
      const match = raw.match(/\[[\s\S]*\]/);
      if (match) {
        try {
          focalPoints = JSON.parse(match[0]).map(String);
        } catch {
          focalPoints = raw
            .split(/\n/)
            .map((l) => l.replace(/^\d+[\.)]\s*/, "").replace(/^[-*]\s*/, "").trim())
            .filter((l) => l.length > 5);
        }
      } else {
        focalPoints = raw
          .split(/\n/)
          .map((l) => l.replace(/^\d+[\.)]\s*/, "").replace(/^[-*]\s*/, "").trim())
          .filter((l) => l.length > 5);
      }
    }

    if (focalPoints.length === 0) {
      return NextResponse.json({ error: "Failed to decompose prompt" }, { status: 502 });
    }

    return NextResponse.json({ focalPoints });
  } catch (err) {
    console.error("focal-point-generator error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
