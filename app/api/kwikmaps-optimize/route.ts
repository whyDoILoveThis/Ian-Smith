import { NextRequest, NextResponse } from 'next/server';
import { Coordinate } from '@/types/KwikMaps.type';

interface OptimizeRequest {
  coordinates: Coordinate[];
}

// Haversine formula - calculates distance in km between two lat/lng points
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
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

// Build a full NxN distance matrix using haversine
function buildDistanceMatrix(coordinates: Coordinate[]): number[][] {
  const n = coordinates.length;
  const matrix: number[][] = [];
  for (let i = 0; i < n; i++) {
    matrix[i] = [];
    for (let j = 0; j < n; j++) {
      if (i === j) {
        matrix[i][j] = 0;
      } else {
        matrix[i][j] = haversineDistance(
          coordinates[i].latitude,
          coordinates[i].longitude,
          coordinates[j].latitude,
          coordinates[j].longitude
        );
      }
    }
  }
  return matrix;
}

// Nearest neighbor heuristic for TSP
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

// 2-opt local search improvement
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

        const currentDist = distMatrix[a][b] + distMatrix[c][d];
        const newDist = distMatrix[a][c] + distMatrix[b][d];

        if (newDist < currentDist) {
          const reversed = bestRoute.slice(i + 1, k + 1).reverse();
          bestRoute = [
            ...bestRoute.slice(0, i + 1),
            ...reversed,
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

// Calculate total route distance in km
function totalRouteDistance(route: number[], distMatrix: number[][]): number {
  let total = 0;
  for (let i = 0; i < route.length - 1; i++) {
    total += distMatrix[route[i]][route[i + 1]];
  }
  return total;
}

// Ask Groq AI for travel insights, hotel suggestions, and trip planning
async function getAITravelInsights(
  optimizedCoordinates: Coordinate[],
  totalDistanceKm: number,
  legs: { from: string; to: string; distanceKm: number; distanceMiles: number }[]
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return 'AI insights unavailable — GROQ_API_KEY not configured.';
  }

  const locationsList = optimizedCoordinates
    .map(
      (c, i) =>
        `${i + 1}. ${c.name} (${c.latitude.toFixed(4)}, ${c.longitude.toFixed(4)})`
    )
    .join('\n');

  const legsList = legs
    .map((l, i) => `  Leg ${i + 1}: ${l.from} -> ${l.to} (~${l.distanceMiles} mi / ${l.distanceKm} km)`)
    .join('\n');

  const totalMiles = (totalDistanceKm * 0.621371).toFixed(1);

  const prompt = `You are a travel planning expert. A user has planned a road trip with the following stops in optimized order:

${locationsList}

Route legs:
${legsList}

Total straight-line distance: ~${totalDistanceKm.toFixed(1)} km (~${totalMiles} miles). Actual driving distance will be 20-40% longer due to roads.

Please provide:

1. ROUTE ASSESSMENT - Is this order logical? Any suggested swaps?

2. DAY-BY-DAY ITINERARY - Break this into realistic travel days. Assume the traveler can visit 2-3 locations per day depending on distances. For each day, list which stops to visit and approximate driving time.

3. HOTEL RECOMMENDATIONS - For each overnight stop:
   - Name the nearest town/city with hotels
   - If the stop is rural or remote, mention how far the nearest hotels are
   - Give price ranges for different tiers:
     * Budget (motels, basic hotels): approximate nightly rate
     * Mid-range (Holiday Inn, Hampton Inn tier): approximate nightly rate
     * Upscale (Marriott, Hilton tier): approximate nightly rate
   - Mention any well-known hotel chains in that area

4. PRACTICAL TIPS - Gas stations in remote stretches, food stops worth noting, any scenic routes or detours worth considering along the way.

Keep it well-structured, practical, and conversational. Use numbered lists and clear section headers. No markdown code blocks.`;

  try {
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
          messages: [
            {
              role: 'system',
              content:
                'You are a knowledgeable travel planning assistant. Give practical, honest hotel and route advice with realistic price estimates. Be concise but thorough. Structure your response with clear sections. Do not use asterisks or markdown formatting — use plain text with dashes and numbers.',
            },
            { role: 'user', content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 3000,
        }),
      }
    );

    const status = response.status;
    const text = await response.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      console.error('Failed to parse Groq response:', text);
      return 'AI travel insights temporarily unavailable. Your route has still been optimized.';
    }

    if (!response.ok) {
      console.error('Groq API error:', status, data);
      return 'AI travel insights temporarily unavailable. Your route has still been optimized.';
    }

    const reply =
      data.choices?.[0]?.message?.content ??
      data.choices?.[0]?.text ??
      null;

    if (!reply) {
      console.error('No reply from Groq:', JSON.stringify(data));
      return 'AI could not generate insights for this route, but your optimized route is ready.';
    }

    return typeof reply === 'string' ? reply.trim() : JSON.stringify(reply);
  } catch (err) {
    console.error('AI insights fetch error:', err);
    return 'AI travel insights temporarily unavailable. Your route has still been optimized.';
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: OptimizeRequest = await request.json();

    if (!body.coordinates || !Array.isArray(body.coordinates)) {
      return NextResponse.json(
        { error: 'Invalid request body — coordinates array required' },
        { status: 400 }
      );
    }

    if (body.coordinates.length < 2) {
      return NextResponse.json(
        { error: 'At least 2 coordinates are required to optimize a route' },
        { status: 400 }
      );
    }

    const coords = body.coordinates;
    const n = coords.length;

    // Build full NxN distance matrix using haversine
    const distMatrix = buildDistanceMatrix(coords);

    // Run TSP: nearest-neighbor heuristic + 2-opt improvement
    let routeIndices = nearestNeighbor(n, distMatrix);
    routeIndices = twoOptImprove(routeIndices, distMatrix);

    // Map indices back to coordinates in optimized order
    const optimizedRoute: Coordinate[] = routeIndices.map((idx, order) => ({
      ...coords[idx],
      order: order + 1,
    }));

    // Calculate total distance
    const totalDistanceKm = totalRouteDistance(routeIndices, distMatrix);
    const totalDistanceMiles = totalDistanceKm * 0.621371;

    // Build leg-by-leg distance breakdown
    const legs = [];
    for (let i = 0; i < routeIndices.length - 1; i++) {
      const fromIdx = routeIndices[i];
      const toIdx = routeIndices[i + 1];
      const legKm = distMatrix[fromIdx][toIdx];
      legs.push({
        from: coords[fromIdx].name,
        to: coords[toIdx].name,
        distanceKm: Math.round(legKm * 10) / 10,
        distanceMiles: Math.round(legKm * 0.621371 * 10) / 10,
      });
    }

    // Get AI travel insights (hotels, tips, day planning)
    const aiInsights = await getAITravelInsights(
      optimizedRoute,
      totalDistanceKm,
      legs
    );

    return NextResponse.json({
      success: true,
      optimizedRoute,
      totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
      totalDistanceMiles: Math.round(totalDistanceMiles * 10) / 10,
      legs,
      aiInsights,
    });
  } catch (error) {
    console.error('Route optimization API error:', error);
    return NextResponse.json(
      { error: 'Failed to optimize route' },
      { status: 500 }
    );
  }
}
