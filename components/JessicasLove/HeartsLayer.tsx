"use client";

import React from "react";
import { motion } from "framer-motion";

type Heart = { id: number; x: number; y: number; size: number };

export default function HeartsLayer({ hearts }: { hearts: Heart[] }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 20,
      }}
    >
      {hearts.map((h) => (
        <motion.div
          key={h.id}
          initial={{ opacity: 1, y: 0, scale: 1 }}
          animate={{ opacity: 0, y: -120, scale: 1.8 }}
          transition={{ duration: 1.6 }}
          style={{
            position: "absolute",
            left: h.x - h.size / 2,
            top: h.y - h.size / 2,
            fontSize: h.size,
          }}
        >
          ❤️
        </motion.div>
      ))}
    </div>
  );
}
