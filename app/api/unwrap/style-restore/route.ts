/* ─────────────────────────────────────────────────────────────
   POST /api/unwrap/style-restore

   Uses Groq Vision to analyse tattoo style properties, then
   applies deterministic sharp-based corrections.

   Body: { imageBase64 }
   Returns: { success, refinedBase64, skinRemoved, lightingCorrected }
   ───────────────────────────────────────────────────────────── */

import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

const GROQ_API_KEY = process.env.GROQ_API_KEY ?? "";

function res(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status });
}

interface StyleAnalysis {
  lineThickness: "thin" | "medium" | "thick";
  shadingStyle: "none" | "stipple" | "gradient" | "solid";
  hasColor: boolean;
  contrast: "low" | "medium" | "high";
}

const DEFAULT_ANALYSIS: StyleAnalysis = {
  lineThickness: "medium",
  shadingStyle: "none",
  hasColor: false,
  contrast: "medium",
};

async function analyseStyle(imageBase64: string): Promise<StyleAnalysis> {
  if (!GROQ_API_KEY) return DEFAULT_ANALYSIS;

  // Downscale for fast upload
  const thumbBuf = await sharp(Buffer.from(imageBase64, "base64"))
    .resize(512, 512, { fit: "inside", withoutEnlargement: true })
    .png({ compressionLevel: 9 })
    .toBuffer();
  const thumbB64 = thumbBuf.toString("base64");

  try {
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: [
                  "Analyse this tattoo image. Respond with ONLY a JSON object, no other text:",
                  '{"lineThickness":"thin"|"medium"|"thick","shadingStyle":"none"|"stipple"|"gradient"|"solid","hasColor":true|false,"contrast":"low"|"medium"|"high"}',
                ].join("\n"),
              },
              {
                type: "image_url",
                image_url: { url: `data:image/png;base64,${thumbB64}` },
              },
            ],
          },
        ],
        max_tokens: 120,
        temperature: 0.1,
      }),
    });

    if (!groqRes.ok) return DEFAULT_ANALYSIS;

    const data = await groqRes.json();
    const content: string = data?.choices?.[0]?.message?.content ?? "";
    const match = content.match(/\{[^}]+\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      return {
        lineThickness: ["thin", "medium", "thick"].includes(parsed.lineThickness) ? parsed.lineThickness : "medium",
        shadingStyle: ["none", "stipple", "gradient", "solid"].includes(parsed.shadingStyle) ? parsed.shadingStyle : "none",
        hasColor: typeof parsed.hasColor === "boolean" ? parsed.hasColor : false,
        contrast: ["low", "medium", "high"].includes(parsed.contrast) ? parsed.contrast : "medium",
      };
    }
  } catch (err) {
    console.error("[unwrap/style-restore] Groq analysis failed:", err);
  }

  return DEFAULT_ANALYSIS;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageBase64 } = body ?? {};

    if (!imageBase64 || typeof imageBase64 !== "string") {
      return res({ success: false, error: "Missing imageBase64" }, 400);
    }

    const imgBuf = Buffer.from(imageBase64, "base64");

    // 1. Analyse style via Groq Vision
    const analysis = await analyseStyle(imageBase64);
    console.log("[unwrap/style-restore] Style analysis:", analysis);

    // 2. Apply sharp corrections based on analysis

    // Start with desaturation (remove skin colour)
    let pipeline = sharp(imgBuf).grayscale();

    // Contrast adjustment
    const contrastMap = { low: 1.1, medium: 1.3, high: 1.6 };
    const contrastFactor = contrastMap[analysis.contrast];

    // Linear contrast: (pixel - 128) * factor + 128
    pipeline = pipeline.linear(contrastFactor, 128 * (1 - contrastFactor));

    // Sharpening based on line thickness
    const sharpSigma = { thin: 0.5, medium: 1.0, thick: 1.5 };
    pipeline = pipeline.sharpen({ sigma: sharpSigma[analysis.lineThickness] });

    // Light denoise to remove skin texture noise
    pipeline = pipeline.median(3);

    // Gamma correction to normalise lighting
    pipeline = pipeline.gamma(1.2);

    const resultBuf = await pipeline.png().toBuffer();
    const refinedBase64 = resultBuf.toString("base64");

    return res({
      success: true,
      refinedBase64,
      skinRemoved: true,
      lightingCorrected: true,
      analysis,
    });
  } catch (err) {
    console.error("[unwrap/style-restore] Error:", err);
    return res({ success: false, error: "Internal server error" }, 500);
  }
}
