import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = {
  role: "system",
  content: `
You are a rewording assistant. Your ONLY job is to rephrase the user's text while keeping the same meaning, tone, and approximate length.

Rules:
- Return ONLY the reworded text — no quotes, no explanation, no preamble.
- NEVER wrap your response in quotation marks or any kind of quotes.
- Keep the same casual/friendly tone as the original.
- Keep it roughly the same length (± a few words).
- Preserve any emojis in approximately the same positions, but you may swap them for similar ones.
- Never add extra sentences or commentary.
- Each time you are called, produce a DIFFERENT variation — don't repeat yourself.
- If the input is very short (1–4 words), just rephrase creatively while keeping the meaning.
`,
};

export async function POST(req: NextRequest) {
  try {
    const { text, maxWords } = await req.json();

    if (!text || typeof text !== "string" || text.length > 500) {
      return NextResponse.json(
        { error: "Invalid or missing `text` (max 500 chars)" },
        { status: 400 },
      );
    }

    const wordLimit =
      typeof maxWords === "number" && maxWords > 0
        ? `\nIMPORTANT: Your response MUST be ${maxWords} words or fewer. Be concise.`
        : "";

    const messages = [
      SYSTEM_PROMPT,
      {
        role: "user",
        content: `Rephrase this: ${text}${wordLimit}`,
      },
    ];

    const proxied = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages,
          temperature: 0.95,
          max_tokens: 120,
        }),
      },
    );

    const status = proxied.status;
    const raw = await proxied.text();

    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      console.error("Parse error, raw:", raw);
      return NextResponse.json(
        { error: "Bad provider response" },
        { status: 502 },
      );
    }

    if (!proxied.ok) {
      console.error("Provider error:", status, data);
      return NextResponse.json(
        { error: "Provider error", body: data },
        { status: 502 },
      );
    }

    const possible =
      data.choices?.[0]?.message?.content ??
      data.choices?.[0]?.text ??
      text; // fallback to original

    const reply =
      typeof possible === "string"
        ? possible.trim().replace(/^["'""]+|["'""]+$/g, "")
        : text;

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("ai-tagline-text error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
