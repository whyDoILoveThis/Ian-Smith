import { NextRequest, NextResponse } from 'next/server';

interface ChatRequest {
  message: string;
  stops: { index: number; name: string }[];
  hasRoute: boolean;
  conversationHistory: { role: string; content: string }[];
}

// ── Geocoding via OpenStreetMap Nominatim (free, no API key) ──

async function geocodeLocation(
  name: string,
): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(name)}&format=json&limit=1`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'KwikMaps/1.0' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.length === 0) return null;
    return {
      latitude: parseFloat(data[0].lat),
      longitude: parseFloat(data[0].lon),
    };
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();

    if (!body.message) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GROQ_API_KEY not configured' }, { status: 500 });
    }

    const hasRoute = body.hasRoute && body.stops && body.stops.length > 0;
    const stopCount = body.stops?.length ?? 0;

    // Build a minimal stop list (name + index only)
    const stopsDescription = hasRoute
      ? body.stops.map((s) => `Stop ${s.index}: ${s.name}`).join('\n')
      : 'No route yet.';

    const systemPrompt = `You are a friendly, knowledgeable route planning assistant for KwikMaps. You MUST respond with ONLY valid JSON — no text, no markdown, no comments outside the JSON.

RESPONSE FORMAT (strict):
{
  "actions": [action objects],
  "message": "your conversational response here"
}

ACTION TYPES:

1. ADD_STOP — add a new location
   {"type":"ADD_STOP","payload":{"name":"City, State","afterStop":N}}
   - afterStop: 0 = beginning, N = after stop N
   - Use "City, State" or "City, State, Country" for the name. Be as specific as possible for geocoding.
   - You do NOT provide coordinates — the server geocodes the name.

2. REMOVE_STOP — remove stops by number
   {"type":"REMOVE_STOP","payload":{"stopNumbers":[N]}}
   - Numbers are 1-indexed current stop numbers.

3. REORDER_STOPS — manually reorder all stops
   {"type":"REORDER_STOPS","payload":{"newOrder":[new,order,of,stop,numbers]}}
   - MUST list ALL ${stopCount} stop numbers exactly once.
   - Use ONLY for explicit user requests like "move stop 3 first" or "swap 2 and 4".
   - NEVER use REORDER_STOPS to "optimize" — that's what OPTIMIZE_ROUTE is for.

4. OPTIMIZE_ROUTE — run a real TSP (Traveling Salesman Problem) algorithm
   {"type":"OPTIMIZE_ROUTE"}
   - This runs a nearest-neighbor + 2-opt improvement algorithm on the server.
   - It finds the shortest path that visits all stops with MINIMAL BACKTRACKING.
   - Use for ANY request about: "optimize", "best order", "efficient", "shortest", "no backtracking", "minimize driving", "logical order", "reduce zig-zagging", "best sequence", "plan the route", "figure out the order".
   - ALWAYS use this instead of trying to guess the optimal order yourself.
   - Even if the user phrases it differently ("make it so I don't have to drive back and forth"), use OPTIMIZE_ROUTE.

CURRENT ROUTE (${stopCount} stops):
${stopsDescription}

RULES:
- If user asks ANYTHING related to optimizing, ordering efficiently, reducing backtracking, or finding the best sequence → use OPTIMIZE_ROUTE. NEVER use REORDER_STOPS as a substitute for optimization.
- If user asks to add a location → use ADD_STOP with the location name. Be specific with state/country.
- If user asks about a location but not to change route → use empty actions array and answer their question.
- For compound requests, include multiple actions. Order: REMOVE_STOP → ADD_STOP → REORDER_STOPS → OPTIMIZE_ROUTE.

MESSAGE STYLE:
- Write like a helpful human — full sentences, natural tone, 1-3 sentences.
- When you use OPTIMIZE_ROUTE, explain what you're doing: "I'll run the optimization algorithm to find the most efficient order that minimizes backtracking."
- When adding stops, mention where you're inserting them.
- When the user asks a question, give a thoughtful answer — don't be overly terse.
- Output ONLY the JSON object. Nothing else.`;

    const messages: { role: string; content: string }[] = [
      { role: 'system', content: systemPrompt },
    ];

    // Last 5 messages of history
    if (body.conversationHistory?.length > 0) {
      messages.push(...body.conversationHistory.slice(-5));
    }

    messages.push({ role: 'user', content: body.message });

    const response = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages,
          temperature: 0.3,
          max_tokens: 800,
          response_format: { type: 'json_object' },
        }),
      },
    );

    const status = response.status;
    const text = await response.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      console.error('Failed to parse Groq response:', text);
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 502 });
    }

    if (!response.ok) {
      console.error('Groq API error:', status, data);
      if (status === 429 && data?.error?.message) {
        const cleaned = (data.error.message as string)
          .replace(/\s*Need more tokens\?.*$/i, '')
          .replace(/\s*in organization `[^`]*`/i, '')
          .trim();
        return NextResponse.json({ error: cleaned }, { status: 429 });
      }
      return NextResponse.json({ error: 'AI service error' }, { status: 502 });
    }

    const rawReply = data.choices?.[0]?.message?.content ?? null;
    if (!rawReply) {
      return NextResponse.json({ error: 'No response from AI' }, { status: 502 });
    }

    // Parse the AI JSON response
    let aiResult: { actions?: unknown[]; message?: string };
    try {
      aiResult = JSON.parse(typeof rawReply === 'string' ? rawReply : JSON.stringify(rawReply));
    } catch {
      console.error('AI returned non-JSON:', rawReply);
      return NextResponse.json({
        success: true,
        actions: [],
        message: typeof rawReply === 'string' ? rawReply.slice(0, 300) : 'I had trouble with that. Could you try rephrasing?',
        geocoded: [],
      });
    }

    const actions = Array.isArray(aiResult.actions) ? aiResult.actions : [];
    const message = typeof aiResult.message === 'string' ? aiResult.message : '';

    // ── Geocode any ADD_STOP actions ──
    const geocoded: { name: string; latitude: number; longitude: number }[] = [];

    for (const action of actions) {
      if (
        action &&
        typeof action === 'object' &&
        (action as Record<string, unknown>).type === 'ADD_STOP'
      ) {
        const payload = (action as Record<string, unknown>).payload as Record<string, unknown> | undefined;
        const name = payload?.name;
        if (typeof name === 'string' && name.trim().length > 0) {
          const geo = await geocodeLocation(name.trim());
          if (geo) {
            geocoded.push({ name: name.trim(), ...geo });
          } else {
            console.warn(`[KwikMaps] Geocoding failed for: ${name}`);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      actions,
      message,
      geocoded,
    });
  } catch (error) {
    console.error('KwikMaps chat API error:', error);
    return NextResponse.json({ error: 'Failed to process chat message' }, { status: 500 });
  }
}
