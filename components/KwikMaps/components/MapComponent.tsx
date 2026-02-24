"use client";

import React, { useEffect, useRef, useState } from "react";
import { Coordinate } from "@/types/KwikMaps.type";
import { AlertCircle, Loader } from "lucide-react";

interface MapComponentProps {
  coordinates: Coordinate[];
  optimizedRoute?: Coordinate[];
  isLoading?: boolean;
  error?: string;
}

export function MapComponent({
  coordinates,
  optimizedRoute,
  isLoading = false,
  error,
}: MapComponentProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const [mapsReady, setMapsReady] = useState(false);

  // Wait for Google Maps to load
  useEffect(() => {
    const checkMapsLoaded = () => {
      if (typeof window !== "undefined" && window.google?.maps) {
        setMapsReady(true);
      } else {
        setTimeout(checkMapsLoaded, 100);
      }
    };
    checkMapsLoaded();
  }, []);

  useEffect(() => {
    if (!mapsReady) return;

    const displayRoute = optimizedRoute || coordinates;

    if (displayRoute.length === 0 || !mapRef.current) return;

    try {
      // Initialize map if not already done
      if (!mapInstance.current && mapRef.current) {
        mapInstance.current = new google.maps.Map(mapRef.current, {
          zoom: 12,
          center: {
            lat: displayRoute[0].latitude,
            lng: displayRoute[0].longitude,
          },
          styles: [
            {
              elementType: "geometry",
              stylers: [{ color: "#1a1a1a" }],
            },
            {
              elementType: "labels.text.stroke",
              stylers: [{ color: "#1a1a1a" }],
            },
            {
              elementType: "labels.text.fill",
              stylers: [{ color: "#ffffff" }],
            },
            {
              featureType: "water",
              elementType: "geometry",
              stylers: [{ color: "#0a0a0a" }],
            },
            {
              featureType: "road",
              elementType: "geometry.fill",
              stylers: [{ color: "#2a2a2a" }],
            },
            {
              featureType: "road",
              elementType: "geometry.stroke",
              stylers: [{ color: "#1a1a1a" }],
            },
            {
              featureType: "poi",
              elementType: "geometry.fill",
              stylers: [{ color: "#1a2a3a" }],
            },
          ],
        });
      }

      if (mapInstance.current) {
        // Clear existing markers
        markersRef.current.forEach((marker) => marker.setMap(null));
        markersRef.current = [];

        // Clear existing polyline
        if (polylineRef.current) {
          polylineRef.current.setMap(null);
        }

        // Create markers for each coordinate
        displayRoute.forEach((coord, index) => {
          const marker = new google.maps.Marker({
            position: {
              lat: coord.latitude,
              lng: coord.longitude,
            },
            map: mapInstance.current,
            title: coord.name,
            label: {
              text: String(index + 1),
              color: "#ffffff",
              fontSize: "16px",
              fontWeight: "bold",
            },
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 12,
              fillColor: index === 0 ? "#00ff00" : "#00d4ff",
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: 2,
            },
          });

          const infoWindow = new google.maps.InfoWindow({
            content: `
            <div style="padding: 8px; font-family: system-ui; color: #000;">
              <p style="margin: 0; font-weight: bold;">${coord.name}</p>
              <p style="margin: 4px 0 0 0; font-size: 12px;">
                ${coord.latitude.toFixed(6)}, ${coord.longitude.toFixed(6)}
              </p>
            </div>
          `,
          });

          marker.addListener("click", () => {
            infoWindow.open(mapInstance.current, marker);
          });

          markersRef.current.push(marker);
        });

        // Draw polyline to connect all markers
        if (displayRoute.length > 1) {
          const path = displayRoute.map((coord) => ({
            lat: coord.latitude,
            lng: coord.longitude,
          }));

          polylineRef.current = new google.maps.Polyline({
            path,
            geodesic: true,
            strokeColor: "#00d4ff",
            strokeOpacity: 0.9,
            strokeWeight: 3,
            map: mapInstance.current,
          });
        }

        // Fit map bounds to all markers
        const bounds = new google.maps.LatLngBounds();
        displayRoute.forEach((coord) => {
          bounds.extend({
            lat: coord.latitude,
            lng: coord.longitude,
          });
        });
        mapInstance.current.fitBounds(bounds, 100);
      }
    } catch (err) {
      console.error("Map initialization error:", err);
    }
  }, [coordinates, optimizedRoute, mapsReady]);

  if (!mapsReady) {
    return (
      <div className="w-full h-full rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex flex-col items-center justify-center p-6">
        <Loader className="animate-spin text-cyan-400 mb-3" size={32} />
        <p className="text-white font-semibold">Loading Maps...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex flex-col items-center justify-center p-6">
        <div className="flex items-center gap-3 text-red-300 mb-2">
          <AlertCircle size={24} />
          <span className="font-semibold">Map Error</span>
        </div>
        <p className="text-white/60 text-center text-sm">{error}</p>
      </div>
    );
  }

  if (coordinates.length === 0) {
    return (
      <div className="w-full h-full rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 border-dashed flex flex-col items-center justify-center p-6">
        <div className="w-16 h-16 rounded-full bg-white/10 border border-white/20 flex items-center justify-center mb-4">
          <MapIcon size={32} className="text-white/40" />
        </div>
        <p className="text-white/60 text-center">
          Add locations to see them on the map
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden border border-white/20 shadow-2xl">
      <div ref={mapRef} className="w-full h-full" />
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <Loader className="animate-spin text-cyan-400" size={32} />
            <p className="text-white font-semibold">Optimizing route...</p>
          </div>
        </div>
      )}
    </div>
  );
}

function MapIcon({ size = 24, ...props }: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      width={size}
      height={size}
      {...props}
    >
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}
