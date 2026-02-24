export interface Coordinate {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  order?: number;
}

export interface RouteOptimizationRequest {
  coordinates: Coordinate[];
}

export interface RouteOptimizationResponse {
  optimizedRoute: Coordinate[];
  totalDistance: number;
  totalDuration: number;
  waypoints: google.maps.LatLng[];
}

export interface MapMarker {
  id: string;
  position: google.maps.LatLngLiteral;
  label: string;
  order?: number;
}
