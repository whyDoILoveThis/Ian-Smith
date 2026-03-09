import { Coordinate } from "@/types/KwikMaps.type";

/**
 * Compact format: each stop is [name, lat, lng]
 * Encoded as base64url in a query param for shareable links.
 */

interface RouteExport {
  stops: Coordinate[];
  optimized: boolean;
}

// --- Google Maps ---

export function buildGoogleMapsUrl(route: Coordinate[]): string {
  if (route.length === 0) return "https://www.google.com/maps";
  if (route.length === 1) {
    const c = route[0];
    return `https://www.google.com/maps/search/?api=1&query=${c.latitude},${c.longitude}`;
  }

  const origin = route[0];
  const destination = route[route.length - 1];
  const waypoints = route.slice(1, -1);

  let url = `https://www.google.com/maps/dir/?api=1`;
  url += `&origin=${origin.latitude},${origin.longitude}`;
  url += `&destination=${destination.latitude},${destination.longitude}`;

  if (waypoints.length > 0) {
    const waypointStr = waypoints
      .map((c) => `${c.latitude},${c.longitude}`)
      .join("|");
    url += `&waypoints=${encodeURIComponent(waypointStr)}`;
  }

  url += `&travelmode=driving`;
  return url;
}

// --- JSON export / import ---

export function routeToJSON(
  coordinates: Coordinate[],
  optimizedRoute: Coordinate[] | null,
): string {
  const data: RouteExport = {
    stops: (optimizedRoute ?? coordinates).map((c, i) => ({
      id: c.id,
      name: c.name,
      latitude: c.latitude,
      longitude: c.longitude,
      order: i + 1,
    })),
    optimized: !!optimizedRoute,
  };
  return JSON.stringify(data, null, 2);
}

export function parseRouteJSON(json: string): Coordinate[] | null {
  try {
    const data = JSON.parse(json);
    if (data.stops && Array.isArray(data.stops)) {
      return data.stops.map((s: Coordinate, i: number) => ({
        id: s.id || crypto.randomUUID(),
        name: s.name,
        latitude: Number(s.latitude),
        longitude: Number(s.longitude),
        order: s.order ?? i + 1,
      }));
    }
    return null;
  } catch {
    return null;
  }
}

// --- Shareable URL via base64url in query param ---

export function routeToShareParam(
  coordinates: Coordinate[],
  optimizedRoute: Coordinate[] | null,
): string {
  const route = optimizedRoute ?? coordinates;
  // Compact: array of [name, lat, lng]
  const compact = route.map((c) => [c.name, c.latitude, c.longitude]);
  const json = JSON.stringify(compact);
  // btoa-safe: encode as base64url
  const b64 = btoa(unescape(encodeURIComponent(json)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return b64;
}

export function parseShareParam(param: string): Coordinate[] | null {
  try {
    // Restore base64 padding
    let b64 = param.replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    const json = decodeURIComponent(escape(atob(b64)));
    const compact = JSON.parse(json);
    if (!Array.isArray(compact)) return null;
    return compact.map(
      (item: [string, number, number], i: number) => ({
        id: crypto.randomUUID(),
        name: item[0],
        latitude: item[1],
        longitude: item[2],
        order: i + 1,
      }),
    );
  } catch {
    return null;
  }
}
