"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";

export default function CenterHeart({
  onCelebrate,
}: {
  onCelebrate?: () => void;
}) {
  const [spins, setSpins] = useState<number>(0);

  const MILK_CHOC = "#CC6CE7";
  const PINK = "#ff84bf";

  return (
    <div
      className="no-heart flex flex-col items-center justify-center p-6 rounded-2xl"
      style={{ background: "rgba(255,255,255,0.5)" }}
    >
      {/* Big outer ring (click anywhere on this ring to spin) */}
      <motion.div
        onClick={(e) => {
          e.stopPropagation();
          setSpins((s) => s + 1);
          onCelebrate?.();
        }}
        animate={{ rotate: spins * 360 }}
        transition={{ type: "spring", stiffness: 260, damping: 24 }}
        whileHover={{ scale: 1.02 }}
        style={{
          width: 280,
          height: 280,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow: "0 20px 40px rgba(0,0,0,0.14)",
          background: `conic-gradient(${PINK}, ${MILK_CHOC}, ${PINK})`,
          padding: 18,
        }}
        aria-label="Spinning ring - click to spin"
        title="Click to spin the ring"
      >
        {/* Inner bezel to make ring look thick and 3D */}
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background:
              "radial-gradient(circle at 30% 25%, rgba(255,255,255,0.75), rgba(255,255,255,0.3) 10%, rgba(255,255,255,0.06) 30%, rgba(0,0,0,0.06) 100%)",
            boxShadow: "inset 0 8px 20px rgba(0,0,0,0.08)",
          }}
        >
          {/* Inner plate that holds the heart */}
          <div
            style={{
              width: 200,
              height: 200,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "linear-gradient(180deg,#fff,#fff9f7)",
              boxShadow: "inset 0 6px 12px rgba(0,0,0,0.05)",
            }}
          >
            {/* Beating heart */}
            <motion.div
              animate={{ scale: [1, 1.07, 1] }}
              transition={{ duration: 1.8, repeat: Infinity }}
              style={{ fontSize: 88, lineHeight: 1 }}
            >
              <span
                style={{
                  display: "inline-block",
                  filter: "drop-shadow(0 8px 18px rgba(0,0,0,0.18))",
                }}
              >
                ❤️
              </span>
            </motion.div>
          </div>
        </div>
      </motion.div>

      <p className="mt-4 text-sm md:text-base" style={{ color: "#4a2f25" }}>
        Tap the big heart to spin it 💫
      </p>
    </div>
  );
}
