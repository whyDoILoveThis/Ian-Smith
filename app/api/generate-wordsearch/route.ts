// app/api/generate-wordsearch/route.ts
import { NextResponse } from "next/server";

const GROQ_AI_MODEL = "llama-3.3-70b-versatile";

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
        const waitTime = retryAfter
          ? parseFloat(retryAfter) * 1000
          : (attempt + 1) * 2000;
        console.log(
          `Rate limited, waiting ${waitTime}ms before retry ${attempt + 1}/${maxRetries}`
        );
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        continue;
      }

      return response;
    } catch (err) {
      lastError = err as Error;
      const waitTime = (attempt + 1) * 1000;
      console.log(
        `Request failed, waiting ${waitTime}ms before retry ${attempt + 1}/${maxRetries}`
      );
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }

  throw lastError || new Error("Max retries exceeded");
}

// Directions for placing words
type Direction = { dx: number; dy: number; name: string };
const DIRECTIONS: Direction[] = [
  { dx: 1, dy: 0, name: "right" },
  { dx: 0, dy: 1, name: "down" },
  { dx: 1, dy: 1, name: "diagonal-down-right" },
  { dx: -1, dy: 1, name: "diagonal-down-left" },
  { dx: -1, dy: 0, name: "left" },
  { dx: 0, dy: -1, name: "up" },
  { dx: -1, dy: -1, name: "diagonal-up-left" },
  { dx: 1, dy: -1, name: "diagonal-up-right" },
];

type WordPlacement = {
  word: string;
  startRow: number;
  startCol: number;
  direction: string;
  cells: { row: number; col: number }[];
};

function canPlaceWord(
  grid: string[][],
  word: string,
  startRow: number,
  startCol: number,
  dir: Direction,
  gridSize: number
): boolean {
  for (let i = 0; i < word.length; i++) {
    const row = startRow + i * dir.dy;
    const col = startCol + i * dir.dx;

    if (row < 0 || row >= gridSize || col < 0 || col >= gridSize) {
      return false;
    }

    const existing = grid[row][col];
    if (existing !== "" && existing !== word[i]) {
      return false;
    }
  }
  return true;
}

function placeWord(
  grid: string[][],
  word: string,
  startRow: number,
  startCol: number,
  dir: Direction
): WordPlacement {
  const cells: { row: number; col: number }[] = [];
  for (let i = 0; i < word.length; i++) {
    const row = startRow + i * dir.dy;
    const col = startCol + i * dir.dx;
    grid[row][col] = word[i];
    cells.push({ row, col });
  }
  return {
    word,
    startRow,
    startCol,
    direction: dir.name,
    cells,
  };
}

function generateGrid(
  words: string[],
  gridSize: number
): { grid: string[][]; placements: WordPlacement[] } {
  // Initialize empty grid
  const grid: string[][] = Array(gridSize)
    .fill(null)
    .map(() => Array(gridSize).fill(""));

  const placements: WordPlacement[] = [];
  const shuffledWords = [...words].sort(() => Math.random() - 0.5);

  for (const originalWord of shuffledWords) {
    const word = originalWord.toUpperCase().replace(/[^A-Z]/g, "");
    if (word.length < 3 || word.length > gridSize) continue;

    // Try random placements
    let placed = false;
    const maxAttempts = 100;

    for (let attempt = 0; attempt < maxAttempts && !placed; attempt++) {
      const dir = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
      const startRow = Math.floor(Math.random() * gridSize);
      const startCol = Math.floor(Math.random() * gridSize);

      if (canPlaceWord(grid, word, startRow, startCol, dir, gridSize)) {
        const placement = placeWord(grid, word, startRow, startCol, dir);
        placements.push(placement);
        placed = true;
      }
    }
  }

  // Fill remaining cells with random letters
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      if (grid[row][col] === "") {
        grid[row][col] = letters[Math.floor(Math.random() * letters.length)];
      }
    }
  }

  return { grid, placements };
}

export async function POST(request: Request) {
  try {
    const { prompt, gridSize = 10 } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required ❌" },
        { status: 400 }
      );
    }

    const systemPrompt = `You are a word generator for a word search puzzle game. 
Given a theme or topic, generate a list of 15-20 related words that would be fun to find in a word search.

Rules:
- Words should be 4-10 letters long
- Words should be single words (no spaces or hyphens)
- Words should be related to the given theme
- Include a mix of easy and harder words
- Only use common English words

Respond with ONLY a JSON array of words, no other text. Example:
["ELEPHANT", "GIRAFFE", "ZEBRA", "LION", "TIGER"]`;

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
              content: systemPrompt,
            },
            {
              role: "user",
              content: `Generate word search words for the theme: "${prompt}"`,
            },
          ],
          temperature: 0.8,
          max_tokens: 500,
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
    const wordsJson = data.choices?.[0]?.message?.content;

    if (!wordsJson) {
      return NextResponse.json(
        { error: "No response from AI ❌" },
        { status: 500 }
      );
    }

    try {
      // Extract JSON from potential markdown code blocks
      let jsonString = wordsJson;
      const jsonMatch = wordsJson.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonString = jsonMatch[1];
      }

      const words: string[] = JSON.parse(jsonString.trim());

      if (!Array.isArray(words) || words.length === 0) {
        throw new Error("Invalid words array");
      }

      // Generate the grid with the AI-provided words
      const { grid, placements } = generateGrid(words, gridSize);

      // Calculate points for each word (longer = more points)
      const wordsWithPoints = placements.map((p) => ({
        word: p.word,
        cells: p.cells,
        points: Math.pow(p.word.length, 2), // Square of length for exponential scoring
      }));

      return NextResponse.json({
        grid,
        words: wordsWithPoints,
        theme: prompt,
        gridSize,
      });
    } catch (parseError) {
      console.error("Parse error:", parseError, wordsJson);
      return NextResponse.json(
        { error: "Failed to parse AI response ❌" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Generate word search error:", error);
    return NextResponse.json(
      { error: "Failed to generate word search ❌" },
      { status: 500 }
    );
  }
}
