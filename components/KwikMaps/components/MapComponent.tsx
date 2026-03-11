"use client";

import React, { useEffect, useRef, useState } from "react";
import { Coordinate } from "@/types/KwikMaps.type";
import { AlertCircle, Check, Loader, X } from "lucide-react";
import { appwrSubmitBugReport } from "@/appwrite/appwrBugReport";

interface MapComponentProps {
  coordinates: Coordinate[];
  optimizedRoute?: Coordinate[];
  isLoading?: boolean;
  error?: string;
  highlightedStopIds?: string[];
  highlightedLegIndices?: number[];
}

export function MapComponent({
  coordinates,
  optimizedRoute,
  isLoading = false,
  error,
  highlightedStopIds = [],
  highlightedLegIndices = [],
}: MapComponentProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const highlightMarkersRef = useRef<google.maps.Marker[]>([]);
  const highlightPolylinesRef = useRef<google.maps.Polyline[]>([]);
  const [mapsReady, setMapsReady] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const [reported, setReported] = useState(false);

  // Wait for Google Maps to load, give up after 15s
  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 150;
    const checkMapsLoaded = () => {
      if (typeof window !== "undefined" && window.google?.maps) {
        setMapsReady(true);
      } else if (attempts >= maxAttempts) {
        // script never loaded — overlay stays
      } else {
        attempts++;
        setTimeout(checkMapsLoaded, 100);
      }
    };
    checkMapsLoaded();
  }, []);

  // Re-show overlay every 15s unless permanently dismissed
  useEffect(() => {
    if (dismissed) return;
    const interval = setInterval(() => {
      setShowOverlay(true);
    }, 15_000);
    return () => clearInterval(interval);
  }, [dismissed]);

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

  // Highlight selected stops
  useEffect(() => {
    highlightMarkersRef.current.forEach((m) => m.setMap(null));
    highlightMarkersRef.current = [];
    if (!mapsReady || !mapInstance.current || highlightedStopIds.length === 0)
      return;
    const displayRoute = optimizedRoute || coordinates;
    const bounds = new google.maps.LatLngBounds();
    for (const stopId of highlightedStopIds) {
      const coord = displayRoute.find((c) => c.id === stopId);
      if (!coord) continue;
      const marker = new google.maps.Marker({
        position: { lat: coord.latitude, lng: coord.longitude },
        map: mapInstance.current,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 22,
          fillColor: "#facc15",
          fillOpacity: 0.35,
          strokeColor: "#facc15",
          strokeWeight: 3,
        },
        zIndex: 0,
      });
      highlightMarkersRef.current.push(marker);
      bounds.extend({ lat: coord.latitude, lng: coord.longitude });
    }
    if (highlightedStopIds.length === 1) {
      const coord = displayRoute.find((c) => c.id === highlightedStopIds[0]);
      if (coord)
        mapInstance.current.panTo({
          lat: coord.latitude,
          lng: coord.longitude,
        });
    } else {
      mapInstance.current.fitBounds(bounds, 120);
    }
  }, [highlightedStopIds, mapsReady, coordinates, optimizedRoute]);

  // Highlight selected legs
  useEffect(() => {
    highlightPolylinesRef.current.forEach((p) => p.setMap(null));
    highlightPolylinesRef.current = [];
    if (
      !mapsReady ||
      !mapInstance.current ||
      highlightedLegIndices.length === 0
    )
      return;
    const displayRoute = optimizedRoute || coordinates;
    const bounds = new google.maps.LatLngBounds();
    for (const legIndex of highlightedLegIndices) {
      if (legIndex < 0 || legIndex >= displayRoute.length - 1) continue;
      const from = displayRoute[legIndex];
      const to = displayRoute[legIndex + 1];
      const polyline = new google.maps.Polyline({
        path: [
          { lat: from.latitude, lng: from.longitude },
          { lat: to.latitude, lng: to.longitude },
        ],
        geodesic: true,
        strokeColor: "#facc15",
        strokeOpacity: 1,
        strokeWeight: 5,
        zIndex: 10,
        map: mapInstance.current,
      });
      highlightPolylinesRef.current.push(polyline);
      bounds.extend({ lat: from.latitude, lng: from.longitude });
      bounds.extend({ lat: to.latitude, lng: to.longitude });
    }
    if (highlightedLegIndices.length === 1) {
      mapInstance.current.fitBounds(bounds, 120);
    } else {
      mapInstance.current.fitBounds(bounds, 100);
    }
  }, [highlightedLegIndices, mapsReady, coordinates, optimizedRoute]);

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
      <div className="w-full h-full bg-white/10 border border-white/20 border-dashed flex flex-col items-center justify-center p-6">
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
    <div className="relative w-full h-full overflow-hidden">
      <div ref={mapRef} className="w-full h-full" />
      {showOverlay && !dismissed && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-8 bg-gradient-to-b from-red-950/90 to-slate-950/95">
          <button
            onClick={() => setShowOverlay(false)}
            className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/50 hover:text-white transition-all"
          >
            <X size={16} />
          </button>
          <div className="w-16 h-16 rounded-full bg-red-500/15 border border-red-500/25 flex items-center justify-center mb-5 animate-pulse">
            <AlertCircle size={32} className="text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2 text-center">
            Google Maps API Issue
          </h2>
          <p className="text-white/50 text-sm text-center max-w-xs mb-6 leading-relaxed">
            We are aware of the issue and are currently working on a fix. The
            map will be restored as soon as possible.
          </p>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 mb-4">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400" />
            </span>
            <span className="text-amber-300 text-xs font-medium">
              Investigating
            </span>
          </div>
          <p className="text-white/50 text-sm text-center max-w-xs mb-6 leading-relaxed">
            You can close this and give it a try, but it will probly not work
            right now.
          </p>
          <button
            onClick={async () => {
              try {
                await appwrSubmitBugReport(
                  "User reports Google Maps is working again.",
                  "Feedback",
                );
                setReported(true);
              } catch {}
            }}
            disabled={reported}
            className={`flex items-center gap-1.5 px-6 py-4 rounded-lg font-medium transition-all mb-3 ${
              reported
                ? "bg-green-500/15 border border-green-500/25 text-green-300 cursor-default"
                : "bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 hover:bg-emerald-500/25"
            }`}
          >
            {reported ? (
              <>
                <Check size={14} /> Reported — thank you!
              </>
            ) : (
              "Click to report that it's working again"
            )}
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="text-white/30 hover:text-white/60 text-xs underline underline-offset-2 transition-colors"
          >
            Don&apos;t show anymore
          </button>
        </div>
      )}
      {(!showOverlay || dismissed) && (
        <button
          onClick={() => {
            setShowOverlay(true);
            setDismissed(false);
          }}
          className="absolute top-3 right-3 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/15 border border-red-500/25 text-red-300 hover:bg-red-500/25 text-xs font-medium transition-all backdrop-blur-sm"
        >
          <AlertCircle size={14} />
          Click to View Status
        </button>
      )}
      {isLoading && (dismissed || !showOverlay) && (
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
