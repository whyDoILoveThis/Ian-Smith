// app/api/generate-timeline/route.ts
import { GROQ_AI_MODEL } from "./GroqAIModel";
import { NextResponse } from "next/server";
import { timelineGenerationPrompt } from "./timelineGenerationPrompt";

// Helper for retry with exponential backoff
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3
): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      // If rate limited, wait and retry
      if (response.status === 429) {
        const retryAfter = response.headers.get("retry-after");
        const waitTime = retryAfter ? parseFloat(retryAfter) * 1000 : (attempt + 1) * 2000;
        console.log(`Rate limited, waiting ${waitTime}ms before retry ${attempt + 1}/${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      return response;
    } catch (err) {
      lastError = err as Error;
      const waitTime = (attempt + 1) * 1000;
      console.log(`Request failed, waiting ${waitTime}ms before retry ${attempt + 1}/${maxRetries}`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  throw lastError || new Error("Max retries exceeded");
}

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required ❌" },
        { status: 400 }
      );
    }

    const systemPrompt = timelineGenerationPrompt(prompt);

    const response = await fetchWithRetry(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: GROQ_AI_MODEL,
          messages: [
            {
              role: "system",
              content: "You generate timeline JSON. Respond with valid JSON only, no markdown.",
            },
            {
              role: "user",
              content: systemPrompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 2048,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Groq API error:", errorData);
      return NextResponse.json(
        { error: "AI service error ❌" },
        { status: 500 }
      );
    }

    const data = await response.json();
    const timelineJson = data.choices?.[0]?.message?.content;

    if (!timelineJson) {
      return NextResponse.json(
        { error: "No response from AI ❌" },
        { status: 500 }
      );
    }

    try {
      // Extract JSON from potential markdown code blocks
      let jsonString = timelineJson;
      const jsonMatch = timelineJson.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonString = jsonMatch[1].trim();
      }

      const timeline = JSON.parse(jsonString);

      // Validate structure
      if (!timeline.name || !Array.isArray(timeline.nodes)) {
        return NextResponse.json(
          { error: "Invalid timeline structure from AI ❌" },
          { status: 500 }
        );
      }

      return NextResponse.json({ timeline });
    } catch (err) {
      console.error("❌ Failed to parse JSON:", timelineJson);
      return NextResponse.json(
        { error: "Bad AI JSON format ❌", raw: timelineJson },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("❌ Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error ❌" },
      { status: 500 }
    );
  }
}
