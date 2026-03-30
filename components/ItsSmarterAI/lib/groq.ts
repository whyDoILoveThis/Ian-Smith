import { PIPELINE_MODEL, GROQ_API_URL, GENERATION_TEMPERATURE } from "./constants";

interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** Max fetch-level retries for transient Groq errors (429, 500, 503) */
const FETCH_RETRIES = 3;

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Server-side utility to call Groq's chat completions API.
 * Retries automatically on 429 (rate limit), 500, and 503 with exponential backoff.
 */
export async function callGroq(
  messages: GroqMessage[],
  temperature: number = GENERATION_TEMPERATURE
): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= FETCH_RETRIES; attempt++) {
    if (attempt > 0) {
      // Exponential backoff: 3s, 6s, 12s
      await wait(3000 * Math.pow(2, attempt - 1));
    }

    const res = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: PIPELINE_MODEL,
        messages,
        temperature,
      }),
    });

    // Retry on transient errors
    if (res.status === 429 || res.status === 500 || res.status === 503) {
      const text = await res.text().catch(() => "");
      lastError = new Error(`Groq API error ${res.status}: ${text}`);
      console.warn(`Groq ${res.status} on attempt ${attempt + 1}/${FETCH_RETRIES + 1}, retrying...`);
      continue;
    }

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Groq API error ${res.status}: ${text}`);
    }

    const data = await res.json();

    const content =
      data.choices?.[0]?.message?.content ??
      data.choices?.[0]?.text ??
      (typeof data === "string" ? data : undefined);

    if (!content) {
      throw new Error("No content in Groq response");
    }

    return typeof content === "string" ? content.trim() : JSON.stringify(content);
  }

  throw lastError ?? new Error("Groq API failed after retries");
}
