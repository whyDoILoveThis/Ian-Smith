"use client";

import React from "react";
import { Coordinate } from "@/types/KwikMaps.type";
import { Trash2, GripVertical } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CoordinateListProps {
  coordinates: Coordinate[];
  onRemoveCoordinate: (id: string) => void;
  optimizedOrder?: string[];
}

export function CoordinateList({
  coordinates,
  onRemoveCoordinate,
  optimizedOrder,
}: CoordinateListProps) {
  const getSortedCoordinates = () => {
    if (!optimizedOrder) return coordinates;
    return coordinates.sort((a, b) => {
      const indexA = optimizedOrder.indexOf(a.id);
      const indexB = optimizedOrder.indexOf(b.id);
      return indexA - indexB;
    });
  };

  const sortedCoordinates = getSortedCoordinates();

  if (coordinates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center mb-4">
          <GripVertical size={24} className="text-white/40" />
        </div>
        <p className="text-white/60 text-center">No locations added yet</p>
        <p className="text-white/40 text-sm text-center mt-1">
          Add some locations to get started
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-white/80 px-2">
        Locations ({coordinates.length})
      </h3>
      <AnimatePresence mode="popLayout">
        {sortedCoordinates.map((coord, index) => (
          <motion.div
            key={coord.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="group relative"
          >
            <div className="px-4 py-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 hover:border-white/40 transition-all duration-200 flex items-center justify-between hover:bg-white/15">
              <div className="flex items-center gap-3 flex-1">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-cyan-400 text-white font-semibold text-sm">
                  {optimizedOrder
                    ? optimizedOrder.indexOf(coord.id) + 1
                    : index + 1}
                </div>
                <div className="flex-1">
                  <p className="text-white font-medium text-sm">{coord.name}</p>
                  <p className="text-white/50 text-xs">
                    {coord.latitude.toFixed(6)}, {coord.longitude.toFixed(6)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => onRemoveCoordinate(coord.id)}
                className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/40 text-red-300 hover:text-red-100 transition-all duration-200 opacity-0 group-hover:opacity-100 transform hover:scale-110 active:scale-95"
                aria-label="Remove location"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
