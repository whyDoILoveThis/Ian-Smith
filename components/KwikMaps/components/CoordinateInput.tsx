"use client";

import React, { useState } from "react";
import { Coordinate } from "@/types/KwikMaps.type";
import { v4 as uuidv4 } from "uuid";
import { Plus, AlertCircle } from "lucide-react";

interface CoordinateInputProps {
  onAddCoordinate: (coordinate: Coordinate) => void;
}

export function CoordinateInput({ onAddCoordinate }: CoordinateInputProps) {
  const [name, setName] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [error, setError] = useState("");

  const validateCoordinates = (): boolean => {
    setError("");

    if (!name.trim()) {
      setError("Location name is required");
      return false;
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      setError("Latitude must be between -90 and 90");
      return false;
    }

    if (isNaN(lng) || lng < -180 || lng > 180) {
      setError("Longitude must be between -180 and 180");
      return false;
    }

    return true;
  };

  const handleAddCoordinate = (e: React.FormEvent) => {
    e.preventDefault();

    if (validateCoordinates()) {
      const newCoordinate: Coordinate = {
        id: uuidv4(),
        name: name.trim(),
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
      };

      onAddCoordinate(newCoordinate);
      setName("");
      setLatitude("");
      setLongitude("");
      setError("");
    }
  };

  return (
    <div className="w-full">
      <form onSubmit={handleAddCoordinate} className="space-y-4">
        <div className="space-y-3">
          {/* Name Input */}
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium mb-2 text-white/90"
            >
              Location Name
            </label>
            <input
              id="name"
              type="text"
              placeholder="e.g., Home, Office, Gym"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
            />
          </div>

          {/* Coordinates Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="latitude"
                className="block text-sm font-medium mb-2 text-white/90"
              >
                Latitude
              </label>
              <input
                id="latitude"
                type="number"
                step="0.000001"
                placeholder="-90 to 90"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
              />
            </div>

            <div>
              <label
                htmlFor="longitude"
                className="block text-sm font-medium mb-2 text-white/90"
              >
                Longitude
              </label>
              <input
                id="longitude"
                type="number"
                step="0.000001"
                placeholder="-180 to 180"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/20 backdrop-blur-md border border-red-400/30 text-red-200">
              <AlertCircle size={18} />
              <span className="text-sm">{error}</span>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 active:scale-95"
        >
          <Plus size={20} />
          Add Location
        </button>
      </form>
    </div>
  );
}
