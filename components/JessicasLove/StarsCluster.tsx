"use client";

import React from "react";
import { motion } from "framer-motion";

export default function StarsCluster() {
  return (
    <div style={{ position: "absolute", left: 30, top: 60, zIndex: 12 }}>
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          whileHover={{ scale: 1.6, rotate: 45 }}
          className="text-2xl"
          style={{ display: "inline-block", margin: 6, color: "#fffae6" }}
        >
          ✨
        </motion.div>
      ))}
    </div>
  );
}
