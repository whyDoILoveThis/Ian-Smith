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

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();

    if (!body.message || !body.currentRoute || !body.allCoordinates) {
      return NextResponse.json(
        { error: 'message, currentRoute, and allCoordinates are required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GROQ_API_KEY not configured' },
        { status: 500 }
      );
    }

    // Build context about the current route
    const routeDescription = body.currentRoute
      .map(
        (c, i) =>
          `Stop ${i + 1}: ${c.name} (${c.latitude.toFixed(4)}, ${c.longitude.toFixed(4)})`
      )
      .join('\n');

    const currentStats = computeRouteStats(body.currentRoute);

    const systemPrompt = `You are an AI travel route advisor for KwikMaps. The user has an optimized route and wants to discuss or modify it.

CURRENT ROUTE (${body.currentRoute.length} stops, ~${currentStats.totalDistanceMiles} miles total):
${routeDescription}

RULES FOR RESPONDING:
1. When the user suggests reordering (e.g., "make order 7-1-2" or "swap stops 3 and 5" or "move Memphis to the end"), evaluate whether this is a good idea.
2. Consider total distance, logical geographic flow, hotel availability, and practical driving concerns.
3. If the suggestion makes sense or the user insists, agree and provide the new order.
4. If the suggestion would make the route significantly worse, explain why respectfully but if the user insists, comply.
5. You can also ADD new locations or REMOVE existing locations from the route when the user requests it.

--- ROUTE REORDER ---
When you agree to reorder the route, include at the VERY END of your response:
ROUTE_UPDATE:[3,1,2,4,5,6,7,8,9,10]

The numbers are STOP NUMBERS referring to the current order above. For ${body.currentRoute.length} stops, list ALL stop numbers in the new desired order. You must include every stop number from 1 to ${body.currentRoute.length} exactly once.

--- ADDING LOCATIONS ---
When the user asks to ADD a new location (e.g., "add Atlanta", "include a stop in Denver"), you MUST know the approximate latitude and longitude of the location. Include at the VERY END of your response:
ROUTE_ADD:[{"name":"Atlanta Downtown","latitude":33.7490,"longitude":-84.3880,"afterStop":3}]

afterStop is the current stop number after which the new location should be inserted. Use 0 to insert at the beginning. You can add multiple locations in the array.
After adding, if you also want to reorder, include a ROUTE_UPDATE line AFTER the ROUTE_ADD line using the NEW stop count (current + added).

--- REMOVING LOCATIONS ---
When the user asks to REMOVE a location (e.g., "remove Memphis", "drop stop 3"), include at the VERY END of your response:
ROUTE_REMOVE:[3,5]

The numbers are the CURRENT stop numbers to remove. After removing, if you also want to reorder the remaining stops, include a ROUTE_UPDATE line AFTER the ROUTE_REMOVE line using the NEW stop numbers (re-numbered 1 to N after removal).

--- COMBINING OPERATIONS ---
You can combine ROUTE_REMOVE, ROUTE_ADD, and ROUTE_UPDATE in a single response. They are processed in this order:
1. ROUTE_REMOVE (remove stops first)
2. ROUTE_ADD (add new stops)
3. ROUTE_UPDATE (reorder the resulting list)

All directive lines MUST appear at the very end of your response with NO text after them.
If you are NOT changing the route, do NOT include any directive lines.

When the user references stops by number, those numbers refer to the current order shown above (Stop 1, Stop 2, etc.).
When the user references stops by name, map them to the stop numbers above.
If they only mention a few stops for reorder, assume unmentioned stops keep their relative position but are placed after the mentioned ones. You MUST still list ALL stops in the ROUTE_UPDATE.

Keep responses conversational, practical, and concise. Do not use asterisks or markdown code blocks. Use plain text.`;

    // Build conversation messages
    const messages: { role: string; content: string }[] = [
      { role: 'system', content: systemPrompt },
    ];

    // Add conversation history
    if (body.conversationHistory && body.conversationHistory.length > 0) {
      messages.push(...body.conversationHistory);
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
          temperature: 0.6,
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
    let displayReply = replyText;
    let workingRoute = [...body.currentRoute];
    const addedCoordinates: Coordinate[] = [];
    const removedCoordinateIds: string[] = [];
    let routeChanged = false;

    // 1. Process ROUTE_REMOVE
    const routeRemoveMatch = replyText.match(/ROUTE_REMOVE:\s*\[([^\]]+)\]/);
    if (routeRemoveMatch) {
      displayReply = displayReply.replace(/\n?ROUTE_REMOVE:\s*\[[^\]]+\]/, '').trim();

      const removeNumbers = routeRemoveMatch[1]
        .split(',')
        .map((s: string) => parseInt(s.trim(), 10))
        .filter((n: number) => !isNaN(n));

      const N = workingRoute.length;
      const validRemove = removeNumbers.every((n: number) => n >= 1 && n <= N);

      if (validRemove && removeNumbers.length > 0 && removeNumbers.length < N) {
        const removeSet = new Set(removeNumbers);
        // Collect IDs of removed coordinates
        removeNumbers.forEach((n: number) => {
          removedCoordinateIds.push(workingRoute[n - 1].id);
        });
        // Filter out removed stops
        workingRoute = workingRoute.filter((_: Coordinate, i: number) => !removeSet.has(i + 1));
        routeChanged = true;
      }
    }

    // 2. Process ROUTE_ADD
    const routeAddMatch = replyText.match(/ROUTE_ADD:\s*(\[\{[\s\S]*?\}\])/);
    if (routeAddMatch) {
      displayReply = displayReply.replace(/\n?ROUTE_ADD:\s*\[\{[\s\S]*?\}\]/, '').trim();

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
      displayReply = displayReply.replace(/\n?ROUTE_UPDATE:\s*\[[^\]]+\]/, '').trim();

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
