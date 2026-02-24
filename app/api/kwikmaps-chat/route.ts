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

CRITICAL - WHEN YOU AGREE TO A ROUTE CHANGE:
You MUST include a special line at the VERY END of your response in this EXACT format:
ROUTE_UPDATE:[3,1,2,4,5,6,7,8,9,10]

The numbers are STOP NUMBERS referring to the current order above. For example, for ${body.currentRoute.length} stops, list ALL ${body.currentRoute.length} stop numbers in the new desired order. You must include every stop number from 1 to ${body.currentRoute.length} exactly once.

Example: If the user wants to visit Stop 3 first, then Stop 1, then Stop 2, then the rest in order, write:
ROUTE_UPDATE:[3,1,2,4,5,6,7,8,9,10]

This line MUST be the very last line of your response with NO text after it. Do NOT use location names or IDs in the ROUTE_UPDATE — only stop numbers.

If you are NOT changing the route, do NOT include any ROUTE_UPDATE line.

When the user references stops by number, those numbers refer to the current order shown above (Stop 1, Stop 2, etc.).
When the user references stops by name, map them to the stop numbers above.
If they only mention a few stops, assume unmentioned stops keep their relative position but are placed after the mentioned ones. You MUST still list ALL ${body.currentRoute.length} stops in the ROUTE_UPDATE.

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

    // Check if the AI wants to update the route
    // Flexible regex: handles optional space after colon and various formatting
    const routeUpdateMatch = replyText.match(/ROUTE_UPDATE:\s*\[([^\]]+)\]/);

    let newRoute: Coordinate[] | null = null;
    let newLegs: typeof currentStats.legs | null = null;
    let newTotalDistanceMiles: number | null = null;
    let newTotalDistanceKm: number | null = null;
    let displayReply = replyText;

    if (routeUpdateMatch) {
      // Remove the ROUTE_UPDATE line from the display reply
      displayReply = replyText.replace(/\n?ROUTE_UPDATE:\s*\[[^\]]+\]/, '').trim();

      const stopNumbers = routeUpdateMatch[1]
        .split(',')
        .map((s: string) => parseInt(s.trim(), 10))
        .filter((n: number) => !isNaN(n));

      // Validate: all stop numbers are in range 1..N and all are present
      const N = body.currentRoute.length;
      const validStops =
        stopNumbers.length === N &&
        stopNumbers.every((n: number) => n >= 1 && n <= N) &&
        new Set(stopNumbers).size === N;

      if (validStops) {
        // Map stop numbers (1-based) back to actual coordinates from currentRoute
        newRoute = stopNumbers.map((stopNum: number, index: number) => {
          const coord = body.currentRoute[stopNum - 1]; // 1-based to 0-based
          return { ...coord, order: index + 1 };
        });

        const stats = computeRouteStats(newRoute);
        newLegs = stats.legs;
        newTotalDistanceMiles = stats.totalDistanceMiles;
        newTotalDistanceKm = stats.totalDistanceKm;
      }
    }

    return NextResponse.json({
      success: true,
      reply: displayReply,
      routeUpdate: newRoute
        ? {
            optimizedRoute: newRoute,
            legs: newLegs,
            totalDistanceMiles: newTotalDistanceMiles,
            totalDistanceKm: newTotalDistanceKm,
          }
        : null,
    });
  } catch (error) {
    console.error('KwikMaps chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    );
  }
}
