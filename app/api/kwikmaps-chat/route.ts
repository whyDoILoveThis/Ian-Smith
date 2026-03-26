import { NextRequest, NextResponse } from 'next/server';

interface ChatRequest {
  message: string;
  stops: { index: number; name: string; lat: number; lng: number }[];
  hasRoute: boolean;
  conversationHistory: { role: string; content: string }[];
  creativity: number;
}

// ── Haversine for spatial context ──

function haversineMiles(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number {
  const R = 3959; // miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function buildSpatialContext(stops: ChatRequest['stops']): string {
  if (stops.length < 2) return '';

  const lines: string[] = [];
  let totalMiles = 0;
  for (let i = 0; i < stops.length - 1; i++) {
    const d = haversineMiles(stops[i].lat, stops[i].lng, stops[i + 1].lat, stops[i + 1].lng);
    totalMiles += d;
    lines.push(`  ${stops[i].name} → ${stops[i + 1].name}: ${Math.round(d)} mi`);
  }

  // Check if route loops back (first → last distance vs total)
  const loopDist = haversineMiles(
    stops[0].lat, stops[0].lng,
    stops[stops.length - 1].lat, stops[stops.length - 1].lng,
  );

  // Detect general direction of travel
  const latDelta = stops[stops.length - 1].lat - stops[0].lat;
  const lngDelta = stops[stops.length - 1].lng - stops[0].lng;
  const directions: string[] = [];
  if (Math.abs(latDelta) > 0.5) directions.push(latDelta > 0 ? 'north' : 'south');
  if (Math.abs(lngDelta) > 0.5) directions.push(lngDelta > 0 ? 'east' : 'west');
  const travelDir = directions.length > 0 ? directions.join('-') : 'regional';

  // Detect backtracking
  let backtracks = 0;
  for (let i = 1; i < stops.length - 1; i++) {
    const prevDir = stops[i].lat - stops[i - 1].lat; // simplified N/S direction
    const nextDir = stops[i + 1].lat - stops[i].lat;
    if ((prevDir > 0.3 && nextDir < -0.3) || (prevDir < -0.3 && nextDir > 0.3)) {
      backtracks++;
    }
  }

  let analysis = `\nROUTE ANALYSIS:\n- Total distance: ~${Math.round(totalMiles)} mi\n- General direction: ${travelDir}\n- Leg distances:\n${lines.join('\n')}`;
  if (loopDist < totalMiles * 0.3) {
    analysis += `\n- Note: Route appears to form a loop (start and end are ~${Math.round(loopDist)} mi apart)`;
  }
  if (backtracks > 0) {
    analysis += `\n- ⚠️ Route has ${backtracks} backtracking point${backtracks > 1 ? 's' : ''} where direction reverses significantly`;
  }

  return analysis;
}

// ── Geocoding (US Census primary, Nominatim fallback) ── all free, no API keys ──

async function tryCensusGeocode(
  address: string,
): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const url = `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address=${encodeURIComponent(address)}&benchmark=Public_AR_Current&format=json`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const matches = data?.result?.addressMatches;
    if (matches && matches.length > 0) {
      const coords = matches[0].coordinates;
      return { latitude: coords.y, longitude: coords.x };
    }
    return null;
  } catch {
    return null;
  }
}

async function tryNominatimGeocode(
  name: string,
): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(name)}&format=json&limit=1&countrycodes=us`;
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

async function geocodeLocation(
  name: string,
): Promise<{ latitude: number; longitude: number } | null> {
  // Try US Census Geocoder first — best for street addresses
  const census = await tryCensusGeocode(name);
  if (census) return census;

  // Fallback to Nominatim — better for business names / general places
  return tryNominatimGeocode(name);
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
    const creativity = Math.max(1, Math.min(10, body.creativity ?? 5));

    // Build rich stop list with coordinates for spatial reasoning
    const stopsDescription = hasRoute
      ? body.stops.map((s) => `Stop ${s.index}: ${s.name} (${s.lat}, ${s.lng})`).join('\n')
      : 'No route yet.';

    // Build spatial analysis so the AI can see distances, backtracking, direction
    const spatialContext = hasRoute ? buildSpatialContext(body.stops) : '';

    // Scale behavior with creativity level
    const isLow = creativity <= 3;
    const isMid = creativity >= 4 && creativity <= 6;
    const isHigh = creativity >= 7;

    const personalityBlock = isLow
      ? `PERSONALITY: You are precise and minimal. Only do exactly what the user asks — nothing more, nothing less. Don't suggest improvements or alternatives unless explicitly asked.`
      : isMid
        ? `PERSONALITY: You are helpful and conversational. Do what the user asks, and if you notice something obvious (like bad ordering or a missing stop in a logical chain), mention it briefly but don't change anything unless asked.`
        : `PERSONALITY: You are a proactive, smart route advisor. Do exactly what the user asks AND if you see clear improvements (backtracking, missing logical stops in between, inefficient ordering), suggest them or go ahead and make the change. Think like a real GPS navigator — be smart about geography. If the user's phrasing implies something (like "after stop 4, do 10 then optimize"), parse their INTENT carefully and execute it. You CAN chain multiple actions together to fulfill complex requests. Be generous with your help.`;

    const systemPrompt = `You are a route planning assistant for KwikMaps. You MUST respond with ONLY valid JSON — no text, no markdown, no comments outside the JSON.

RESPONSE FORMAT (strict):
{
  "actions": [action objects],
  "message": "your conversational response here"
}

${personalityBlock}

ACTION TYPES:

1. ADD_STOP — add a new location
   {"type":"ADD_STOP","payload":{"name":"location string","afterStop":N}}
   - afterStop: 0-indexed insertion point. afterStop=0 means insert at the very beginning. afterStop=3 means insert AFTER stop 3.
   - The "name" field is sent directly to Google Maps Geocoding — it must be as specific as possible.
   - CRITICAL: Pass through EVERYTHING the user provides — zip codes, street addresses, store names, landmarks. Do NOT simplify or strip information.
   
   ALLOWED NAME FORMATS (use the most specific one that matches user input):
     * With zip code: "Union, MS 39365" — ALWAYS include zip codes when the user provides them, they disambiguate cities
     * Exact address: "3993 Prospect Cedar Lane Rd, Union, MS 39365"
     * City + State: "Nashville, TN"
     * Business + location: "Fastenal, Oak Ridge, TN" or "Walmart, Jackson, TN"
     * Landmark: "Graceland, Memphis, TN"
   
   ZIP CODE RULE: If the user includes a zip code, you MUST include it in the name. "Union MS 39365" → name="Union, MS 39365". Never drop the zip.
   BUSINESS RULE: For store/business names, ALWAYS include city and state so geocoding finds the right one. If user says "add a Walmart" without a city, infer the nearest city from the current route.
   ADDRESS RULE: Pass exact addresses through verbatim. "3993 prospect cedar lane rd union ms" → name="3993 Prospect Cedar Lane Rd, Union, MS"
   - You do NOT provide coordinates — the server geocodes the name via Google Maps.

2. REMOVE_STOP — remove stops by number
   {"type":"REMOVE_STOP","payload":{"stopNumbers":[N]}}
   - Numbers are 1-indexed current stop numbers.

3. REORDER_STOPS — manually reorder stops
   {"type":"REORDER_STOPS","payload":{"newOrder":[new,order,of,stop,numbers]}}
   - MUST list ALL ${stopCount} stop numbers exactly once.
   - The numbers refer to CURRENT stop positions. Stop 1 is the first stop, stop 2 is the second, etc.
   - The newOrder array defines the NEW sequence. The first element becomes the new stop 1, second becomes new stop 2, etc.
   
   REORDER EXAMPLES (with ${stopCount} stops):
   - "move stop 5 to first" → newOrder starts with 5, then 1,2,3,4,6,7...
   - "after 2 should be 10" → Keep 1,2 in place, put 10 after 2, fill in the rest: [1,2,10,3,4,5,6,7,8,9] (for 10 stops)
   - "swap 3 and 7" → Same order but positions 3 and 7 are exchanged
   - "put 6 between 2 and 3" → [1,2,6,3,4,5,7,8,9,10]
   
   CRITICAL: When user says "after stop 2 should be stop 10", they mean:
   Position 1 stays, Position 2 stays, then the stop that is CURRENTLY at position 10 goes to position 3.
   Then fill remaining stops in their original order. So for [1,2,3,4,5,6,7,8,9,10]:
   → New order: [1, 2, 10, 3, 4, 5, 6, 7, 8, 9]
   
   Another CRITICAL example: "the order should be 1-2-6-..." means the user wants stop 1 first, stop 2 second, stop 6 third, then fill the rest. So: [1, 2, 6, 3, 4, 5, 7, 8, 9, 10]

4. OPTIMIZE_ROUTE — run a TSP algorithm for shortest path
   {"type":"OPTIMIZE_ROUTE"}  ← optimizes ALL stops
   {"type":"OPTIMIZE_ROUTE","payload":{"lockedPrefix":N}}  ← keeps first N stops LOCKED, optimizes only stops after position N
   
   - Runs nearest-neighbor + 2-opt to minimize total distance and backtracking.
   - Use for: "optimize", "best order", "efficient", "shortest", "no backtracking", "minimize driving", "figure out the order".
   - ALWAYS use this action instead of trying to guess optimal order yourself via REORDER_STOPS.
   - Use lockedPrefix when user wants to keep some stops in place:
     "optimize but keep the first 3 stops" → {"type":"OPTIMIZE_ROUTE","payload":{"lockedPrefix":3}}
     "don't move 1-2-3, optimize the rest" → {"type":"OPTIMIZE_ROUTE","payload":{"lockedPrefix":3}}
     "only optimize locations after 4" → {"type":"OPTIMIZE_ROUTE","payload":{"lockedPrefix":4}}

CURRENT ROUTE (${stopCount} stops):
${stopsDescription}
${spatialContext}

COMPOUND COMMANDS — how to handle multi-part requests:
- "after 2 should be 10 then optimize" → TWO actions: REORDER_STOPS [1,2,10,3,4,5,6,7,8,9] then OPTIMIZE_ROUTE with lockedPrefix:3 (because user wants 1,2,10 locked and the rest optimized)
- "the order should be 1-2-6 then optimize the rest" → TWO actions: REORDER_STOPS [1,2,6,3,4,5,7,8,9,10] then OPTIMIZE_ROUTE with lockedPrefix:3
- "after 2 put 10 then optimize without algorithm" → REORDER_STOPS [1,2,10,...rest in best geographic order you can determine]
- "optimize but keep the first 3" → OPTIMIZE_ROUTE with lockedPrefix:3
- "ONLY OPTIMIZE LOCATIONS AFTER 4" → OPTIMIZE_ROUTE with lockedPrefix:4

UNDERSTANDING NATURAL LANGUAGE:
- "after N should be M" or "after N do M" → REORDER: keep stops 1..N in place, insert stop M right after N, fill remaining stops in original order
- "the order should be X-Y-Z then optimize" → REORDER to set X,Y,Z first, then OPTIMIZE_ROUTE with lockedPrefix equal to however many stops the user specified
- "looks like we're going in a circle" → Look at spatial data, acknowledge, suggest optimization
- "add Philadelphia after Memphis" → ADD_STOP with afterStop = Memphis's current stop number
- "put Chicago between 3 and 4" → ADD_STOP with afterStop=3
- "remove the last 3 stops" → REMOVE_STOP with the last 3 stop numbers
- "skip Nashville" → REMOVE_STOP with Nashville's stop number
- "optimize without algorithm" or "do it yourself" → Use REORDER_STOPS with YOUR best geographic judgment based on coordinates. Do NOT use OPTIMIZE_ROUTE.
- "add a stop in union ms 39365" → ADD_STOP with name="Union, MS 39365" (keep the zip code!)
- "add 3993 prospect cedar lane rd union ms" → ADD_STOP with name="3993 Prospect Cedar Lane Rd, Union, MS"
- "add a Walmart near Jackson" → ADD_STOP with name="Walmart, Jackson, TN"
- "I need to stop at Fastenal" → ADD_STOP with name="Fastenal, [nearest city from route], [state]"
- Compound requests: process ALL parts — never ignore what the user said

RULES:
- QUESTIONS vs COMMANDS: If the user is ASKING a question (starts with "should", "would", "could", "is it better", "what if", "do you think", etc.), do NOT change the route. Use empty actions [] and answer the question with your analysis using the spatial data. Only change the route when the user gives a clear command/instruction.
  Examples of QUESTIONS (empty actions, just answer):
    "should it be 6 after 4?" → Analyze whether stop 6 after stop 4 makes geographic sense, give your opinion, but do NOT reorder.
    "would it be better to put Memphis first?" → Give your analysis, don't move anything.
    "is this route efficient?" → Evaluate and respond.
  Examples of COMMANDS (take action):
    "put 6 after 4" → REORDER_STOPS
    "make Memphis first" → REORDER_STOPS
    "optimize" → OPTIMIZE_ROUTE
- ALWAYS parse the user's FULL intent. If they say multiple things, do ALL of them.
- When user says "after N should be M" → REORDER only. Do NOT also optimize unless they ask.
- When user says "after N should be M then optimize" → REORDER first, then OPTIMIZE with lockedPrefix to protect the stops the user placed.
- For optimization requests → OPTIMIZE_ROUTE (never manually guess order), UNLESS user explicitly says "without algorithm" or "do it yourself".
- For reordering specific stops → REORDER_STOPS with ALL ${stopCount} numbers in the intended new sequence.
- When adding: NEVER simplify what the user typed. Include zip codes, full addresses, store names exactly. "Union ms 39365" → "Union, MS 39365", NOT "Union, MS".
- For store/business names: ALWAYS append city + state from the current route context.
- Use the spatial analysis above to understand geography — reference distances and directions in your response.${isHigh ? '\n- At high creativity: if you see obvious improvements, mention AND apply them. Be proactive.' : ''}

MESSAGE STYLE:
- Write like a knowledgeable friend — full sentences, natural, 1-3 sentences.
- Reference specific stops by name when explaining changes.
- If you notice spatial issues (backtracking, odd ordering), mention them.
- When using OPTIMIZE_ROUTE with lockedPrefix, explain which stops are kept in place.
- Output ONLY the JSON object.`;

    const messages: { role: string; content: string }[] = [
      { role: 'system', content: systemPrompt },
    ];

    // Scale history with creativity
    const historyLimit = Math.min(5 + Math.floor(creativity), 15);
    if (body.conversationHistory?.length > 0) {
      messages.push(...body.conversationHistory.slice(-historyLimit));
    }

    messages.push({ role: 'user', content: body.message });

    // Scale temperature and tokens with creativity
    const temperature = 0.15 + (creativity - 1) * 0.06; // 0.15 → 0.69
    const maxTokens = 600 + (creativity - 1) * 50; // 600 → 1050

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
          temperature: Math.round(temperature * 100) / 100,
          max_tokens: maxTokens,
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
    const failedGeocode: string[] = [];

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
            failedGeocode.push(name.trim());
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      actions,
      message,
      geocoded,
      failedGeocode,
    });
  } catch (error) {
    console.error('KwikMaps chat API error:', error);
    return NextResponse.json({ error: 'Failed to process chat message' }, { status: 500 });
  }
}
