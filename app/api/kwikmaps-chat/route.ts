import { NextRequest, NextResponse } from 'next/server';
import { Coordinate } from '@/types/KwikMaps.type';

interface ChatRequest {
  message: string;
  currentRoute: Coordinate[];
  allCoordinates: Coordinate[];
  conversationHistory: { role: string; content: string }[];
}

// Haversine formula
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function computeRouteStats(route: Coordinate[]) {
  let totalKm = 0;
  const legs = [];
  for (let i = 0; i < route.length - 1; i++) {
    const km = haversineDistance(
      route[i].latitude,
      route[i].longitude,
      route[i + 1].latitude,
      route[i + 1].longitude
    );
    totalKm += km;
    legs.push({
      from: route[i].name,
      to: route[i + 1].name,
      distanceKm: Math.round(km * 10) / 10,
      distanceMiles: Math.round(km * 0.621371 * 10) / 10,
    });
  }
  return {
    totalDistanceKm: Math.round(totalKm * 10) / 10,
    totalDistanceMiles: Math.round(totalKm * 0.621371 * 10) / 10,
    legs,
  };
}

// ── TSP Solver (nearest-neighbor + 2-opt) ──

function buildDistanceMatrix(coordinates: Coordinate[]): number[][] {
  const n = coordinates.length;
  const matrix: number[][] = [];
  for (let i = 0; i < n; i++) {
    matrix[i] = [];
    for (let j = 0; j < n; j++) {
      matrix[i][j] = i === j ? 0 : haversineDistance(
        coordinates[i].latitude, coordinates[i].longitude,
        coordinates[j].latitude, coordinates[j].longitude
      );
    }
  }
  return matrix;
}

function nearestNeighbor(n: number, distMatrix: number[][]): number[] {
  const visited = new Array(n).fill(false);
  const route: number[] = [0];
  visited[0] = true;
  for (let step = 1; step < n; step++) {
    const current = route[route.length - 1];
    let nearest = -1;
    let minDist = Infinity;
    for (let j = 0; j < n; j++) {
      if (!visited[j] && distMatrix[current][j] < minDist) {
        minDist = distMatrix[current][j];
        nearest = j;
      }
    }
    route.push(nearest);
    visited[nearest] = true;
  }
  return route;
}

function twoOptImprove(route: number[], distMatrix: number[][]): number[] {
  const n = route.length;
  let improved = true;
  let bestRoute = [...route];
  while (improved) {
    improved = false;
    for (let i = 0; i < n - 1; i++) {
      for (let k = i + 2; k < n; k++) {
        const a = bestRoute[i];
        const b = bestRoute[i + 1];
        const c = bestRoute[k];
        const d = k + 1 < n ? bestRoute[k + 1] : bestRoute[0];
        if (distMatrix[a][b] + distMatrix[c][d] > distMatrix[a][c] + distMatrix[b][d]) {
          bestRoute = [
            ...bestRoute.slice(0, i + 1),
            ...bestRoute.slice(i + 1, k + 1).reverse(),
            ...bestRoute.slice(k + 1),
          ];
          improved = true;
          break;
        }
      }
      if (improved) break;
    }
  }
  return bestRoute;
}

function solveTSP(coordinates: Coordinate[]): Coordinate[] {
  if (coordinates.length <= 2) return coordinates;
  const distMatrix = buildDistanceMatrix(coordinates);
  const nnRoute = nearestNeighbor(coordinates.length, distMatrix);
  const optimized = twoOptImprove(nnRoute, distMatrix);
  return optimized.map((idx, order) => ({ ...coordinates[idx], order: order + 1 }));
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();

    if (!body.message) {
      return NextResponse.json(
        { error: 'message is required' },
        { status: 400 }
      );
    }

    // Default to empty arrays if not provided
    if (!body.currentRoute) body.currentRoute = [];
    if (!body.allCoordinates) body.allCoordinates = [];

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GROQ_API_KEY not configured' },
        { status: 500 }
      );
    }

    // Build context about the current route
    const hasRoute = body.currentRoute.length > 0;

    const routeDescription = hasRoute
      ? body.currentRoute
          .map(
            (c, i) =>
              `Stop ${i + 1}: ${c.name} (${c.latitude.toFixed(4)}, ${c.longitude.toFixed(4)})`
          )
          .join('\n')
      : '';

    const currentStats = hasRoute ? computeRouteStats(body.currentRoute) : null;

    const locationsList = body.allCoordinates.length > 0
      ? body.allCoordinates.map((c, i) => `${i + 1}. ${c.name} (${c.latitude.toFixed(4)}, ${c.longitude.toFixed(4)})`).join('\n')
      : 'No locations added yet.';

    const systemPrompt = hasRoute
      ? `You are an expert AI travel route advisor for KwikMaps. You are smart, precise, and always follow the user's instructions. The user has an optimized route and wants to discuss or modify it.

CURRENT ROUTE (${body.currentRoute.length} stops, ~${currentStats!.totalDistanceMiles} miles total):
${routeDescription}

YOUR CAPABILITIES:
- Reorder stops (full reorder or partial — moving just a few stops)
- Add new locations at any position
- Remove locations
- Combine any of the above in one response
- Evaluate the current order and suggest the most efficient route
- Answer travel questions and give advice

RULES:
1. ALWAYS follow the user's instructions. If they ask to move, swap, add, remove, or reorder — DO IT immediately with the correct directive.
2. If a change would significantly increase distance, briefly note it but STILL comply.
3. When the user asks you to "evaluate", "optimize", "find the best order", or "reoptimize" — use the ROUTE_OPTIMIZE directive (see below). Do NOT try to manually figure out the optimal order yourself.
4. When the user asks about a location (e.g. "what's near stop 3?" or "how far is Memphis from Nashville?"), just answer — no directives needed.

=== ROUTE REORDER (ROUTE_UPDATE) ===
To reorder stops, put this on its own line at the VERY END of your response:
ROUTE_UPDATE:[new_order_of_stop_numbers]

CRITICAL RULES:
- Numbers refer to CURRENT stop numbers (Stop 1, Stop 2, etc. as listed above).
- You MUST list ALL ${body.currentRoute.length} stop numbers exactly once.
- The order you list them IS the new order.

EXAMPLES (assuming 5 stops):
- "move stop 3 first" -> ROUTE_UPDATE:[3,1,2,4,5]
- "swap 2 and 4" -> ROUTE_UPDATE:[1,4,3,2,5]
- "reverse it" -> ROUTE_UPDATE:[5,4,3,2,1]
- "put Memphis first" (Memphis=stop 4) -> ROUTE_UPDATE:[4,1,2,3,5]
- "order: 3,1,5,2,4" -> ROUTE_UPDATE:[3,1,5,2,4]

PARTIAL REORDER: If the user mentions only some stops, place those where requested and fill remaining stops in their original relative order.
Example (5 stops): "put stop 4 first, stop 2 second" -> positions: 4=1st, 2=2nd, remaining [1,3,5] fill 3rd-5th -> ROUTE_UPDATE:[4,2,1,3,5]

=== ADDING LOCATIONS (ROUTE_ADD) ===
ROUTE_ADD:[{"name":"City Name","latitude":33.7490,"longitude":-84.3880,"afterStop":3}]

- afterStop = current stop number to insert AFTER (0 = insert at beginning).
- Multiple: ROUTE_ADD:[{"name":"A","latitude":1.0,"longitude":2.0,"afterStop":0},{"name":"B","latitude":3.0,"longitude":4.0,"afterStop":5}]
- You MUST know approximate lat/lng for any city/location. Use your geographic knowledge.
- After adding, you can include a ROUTE_UPDATE on the next line using the NEW total stop count to place the new stop optimally.

=== REMOVING LOCATIONS (ROUTE_REMOVE) ===
ROUTE_REMOVE:[3,5]

- Numbers are CURRENT stop numbers to remove.
- Example: "remove Memphis" (Memphis=stop 3) -> ROUTE_REMOVE:[3]
- Example: "remove stops 2 and 5" -> ROUTE_REMOVE:[2,5]
- After removing, you can include a ROUTE_UPDATE using re-numbered stops (1 to N after removal).

=== COMBINING OPERATIONS ===
You can use multiple directives in one response. Processing order: ROUTE_REMOVE -> ROUTE_ADD -> ROUTE_UPDATE -> ROUTE_OPTIMIZE.
Example: Remove stop 3, add Dallas, then optimize:
ROUTE_REMOVE:[3]
ROUTE_ADD:[{"name":"Dallas","latitude":32.7767,"longitude":-96.7970,"afterStop":0}]
ROUTE_OPTIMIZE

=== OPTIMIZING THE ROUTE (ROUTE_OPTIMIZE) ===
When the user asks to "optimize", "evaluate the order", "find the best order", "reoptimize", or "make it efficient" — use this directive on its own line at the VERY END:
ROUTE_OPTIMIZE

This runs an advanced algorithm to find the shortest-distance ordering. You do NOT need to figure out the order yourself.
- You can combine it with other directives. For example, after adding a new stop, include ROUTE_OPTIMIZE to automatically find the best order including the new stop.
- If the user says something like "add Nashville and optimize" -> use ROUTE_ADD then ROUTE_OPTIMIZE.
- If the user just says "optimize" or "reorder for efficiency" -> just use ROUTE_OPTIMIZE.

All directive lines MUST be the last lines of your response. NO text after them.
If NOT changing the route, do NOT include any directives.

Keep responses conversational, practical, and concise. Use plain text only — no asterisks, no markdown, no code blocks.`
      : `You are an expert AI travel route advisor for KwikMaps. You are smart, precise, and always follow the user's instructions. The user is planning a trip and managing locations.

CURRENT LOCATIONS (${body.allCoordinates.length} total):
${locationsList}

YOUR CAPABILITIES:
- Add new locations
- Remove existing locations
- Answer travel questions and give advice
- Help plan routes

RULES:
1. ALWAYS follow the user's instructions immediately with the correct directive.
2. When adding, you MUST know approximate lat/lng for cities/locations. Use your geographic knowledge.
3. When removing, use the location numbers shown above.

=== ADDING LOCATIONS (ROUTE_ADD) ===
ROUTE_ADD:[{"name":"Location Name","latitude":33.7490,"longitude":-84.3880,"afterStop":0}]

- afterStop should be 0 when there is no route.
- Multiple: ROUTE_ADD:[{"name":"A","latitude":1.0,"longitude":2.0,"afterStop":0},{"name":"B","latitude":3.0,"longitude":4.0,"afterStop":0}]

=== REMOVING LOCATIONS (ROUTE_REMOVE) ===
ROUTE_REMOVE:[2,5]

- Numbers are the CURRENT location numbers to remove (as listed above).
- Example: "remove Atlanta" (Atlanta=location 3) -> ROUTE_REMOVE:[3]

All directive lines MUST be the last lines of your response. NO text after them.
If NOT changing locations, do NOT include any directives.

Keep responses conversational, practical, and concise. Use plain text only — no asterisks, no markdown, no code blocks.`;

    // Build conversation messages
    const messages: { role: string; content: string }[] = [
      { role: 'system', content: systemPrompt },
    ];

    // Add conversation history (limit to last 16 messages to keep context focused)
    if (body.conversationHistory && body.conversationHistory.length > 0) {
      const recentHistory = body.conversationHistory.slice(-16);
      messages.push(...recentHistory);
    }

    // Add current user message
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
          temperature: 0.2,
          max_tokens: 2000,
        }),
      }
    );

    const status = response.status;
    const text = await response.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      console.error('Failed to parse Groq chat response:', text);
      return NextResponse.json(
        { error: 'Failed to parse AI response' },
        { status: 502 }
      );
    }

    if (!response.ok) {
      console.error('Groq chat API error:', status, data);

      // Surface rate-limit details to the user
      if (status === 429 && data?.error?.message) {
        const raw: string = data.error.message;
        const cleaned = raw
          .replace(/\s*Need more tokens\?.*$/i, '')
          .replace(/\s*in organization `[^`]*`/i, '')
          .trim();
        return NextResponse.json(
          { error: cleaned },
          { status: 429 }
        );
      }

      return NextResponse.json(
        { error: 'AI service error' },
        { status: 502 }
      );
    }

    const reply =
      data.choices?.[0]?.message?.content ??
      data.choices?.[0]?.text ??
      null;

    if (!reply) {
      return NextResponse.json(
        { error: 'No response from AI' },
        { status: 502 }
      );
    }

    const replyText = typeof reply === 'string' ? reply.trim() : JSON.stringify(reply);

    // ── Parse AI directives ──
    let workingRoute = [...body.currentRoute];
    const addedCoordinates: Coordinate[] = [];
    const removedCoordinateIds: string[] = [];
    let routeChanged = false;

    // 1. Process ROUTE_REMOVE (works with route or allCoordinates)
    const routeRemoveMatch = replyText.match(/ROUTE_REMOVE:\s*\[([^\]]+)\]/);
    if (routeRemoveMatch) {
      const removeNumbers = routeRemoveMatch[1]
        .split(',')
        .map((s: string) => parseInt(s.trim(), 10))
        .filter((n: number) => !isNaN(n));

      // When route exists, remove from workingRoute; otherwise remove from allCoordinates
      const removeSource = hasRoute ? workingRoute : body.allCoordinates;
      const N = removeSource.length;
      const validRemove = removeNumbers.every((n: number) => n >= 1 && n <= N);

      if (validRemove && removeNumbers.length > 0 && removeNumbers.length < N) {
        const removeSet = new Set(removeNumbers);
        removeNumbers.forEach((n: number) => {
          removedCoordinateIds.push(removeSource[n - 1].id);
        });
        if (hasRoute) {
          workingRoute = workingRoute.filter((_: Coordinate, i: number) => !removeSet.has(i + 1));
        }
        routeChanged = true;
      }
    }

    // 2. Process ROUTE_ADD
    const routeAddMatch = replyText.match(/ROUTE_ADD:\s*(\[\{[\s\S]*?\}\])/);
    if (routeAddMatch) {
      try {
        const addItems: { name: string; latitude: number; longitude: number; afterStop?: number }[] =
          JSON.parse(routeAddMatch[1]);

        // Sort by afterStop descending so insertions don't shift indices
        const sorted = [...addItems].sort(
          (a, b) => (b.afterStop ?? workingRoute.length) - (a.afterStop ?? workingRoute.length)
        );

        for (const item of sorted) {
          if (!item.name || typeof item.latitude !== 'number' || typeof item.longitude !== 'number') {
            continue;
          }
          const { v4: uuidv4 } = await import('uuid');
          const newCoord: Coordinate = {
            id: uuidv4(),
            name: item.name,
            latitude: item.latitude,
            longitude: item.longitude,
          };
          const insertAt = Math.min(
            Math.max(item.afterStop ?? workingRoute.length, 0),
            workingRoute.length
          );
          workingRoute.splice(insertAt, 0, newCoord);
          addedCoordinates.push(newCoord);
        }
        routeChanged = addedCoordinates.length > 0 || routeChanged;
      } catch (e) {
        console.error('Failed to parse ROUTE_ADD payload:', e);
      }
    }

    // 3. Process ROUTE_UPDATE (reorder after add/remove)
    const routeUpdateMatch = replyText.match(/ROUTE_UPDATE:\s*\[([^\]]+)\]/);
    if (routeUpdateMatch) {
      const stopNumbers = routeUpdateMatch[1]
        .split(',')
        .map((s: string) => parseInt(s.trim(), 10))
        .filter((n: number) => !isNaN(n));

      const N = workingRoute.length;
      const validStops =
        stopNumbers.length === N &&
        stopNumbers.every((n: number) => n >= 1 && n <= N) &&
        new Set(stopNumbers).size === N;

      if (validStops) {
        workingRoute = stopNumbers.map((stopNum: number, index: number) => {
          const coord = workingRoute[stopNum - 1];
          return { ...coord, order: index + 1 };
        });
        routeChanged = true;
      }
    }

    // 4. Process ROUTE_OPTIMIZE — run real TSP solver instead of LLM guessing
    const routeOptimizeMatch = replyText.match(/ROUTE_OPTIMIZE/);
    if (routeOptimizeMatch && workingRoute.length >= 2) {
      workingRoute = solveTSP(workingRoute);
      routeChanged = true;
    }

    // Strip ALL directive lines from display text in one pass
    const displayReply = replyText
      .replace(/\n?ROUTE_REMOVE:\s*\[[^\]]*\]/g, '')
      .replace(/\n?ROUTE_ADD:\s*\[\{[\s\S]*?\}\]/g, '')
      .replace(/\n?ROUTE_UPDATE:\s*\[[^\]]*\]/g, '')
      .replace(/\n?ROUTE_OPTIMIZE/g, '')
      .trim();

    // Compute final stats if route changed
    let routeUpdate = null;
    if (routeChanged) {
      // Assign final order numbers
      workingRoute = workingRoute.map((c: Coordinate, i: number) => ({ ...c, order: i + 1 }));
      const stats = computeRouteStats(workingRoute);
      routeUpdate = {
        optimizedRoute: workingRoute,
        legs: stats.legs,
        totalDistanceMiles: stats.totalDistanceMiles,
        totalDistanceKm: stats.totalDistanceKm,
        addedCoordinates: addedCoordinates.length > 0 ? addedCoordinates : undefined,
        removedCoordinateIds: removedCoordinateIds.length > 0 ? removedCoordinateIds : undefined,
      };
    }

    return NextResponse.json({
      success: true,
      reply: displayReply,
      routeUpdate,
    });
  } catch (error) {
    console.error('KwikMaps chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    );
  }
}
