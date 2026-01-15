"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { ConfettiHandle } from "./ConfettiCanvas";

type Choco = { id: number; text: string; opened: boolean };

export default function ChocolateGrid({
  confettiRef,
  onCelebrate,
}: {
  onCelebrate?: () => void;
  confettiRef: React.RefObject<ConfettiHandle | null>;
}) {
  const MILK_CHOC = "#84563C";
  const SOFT_PINK = "#ffd6e8";

  const [chocos, setChocos] = useState<Choco[]>(
    [
      "Every morning with you is my favorite sunrise.",
      "Your smile cures my worst days.",
      "You make my life whole.",
      "Our love = my treasure.",
      "Forever is simply not long enough with you.",
      "🎶Ian and Jessie sittin in a tree🎶",
    ].map((t, i) => ({ id: i, text: t, opened: false }))
  );

  const [unwrapped, setUnwrapped] = useState(false);

  const allOpened = chocos.length > 0 && chocos.every((c) => c.opened);

  // parent component (page.tsx) — inside component scope
  const revealAll = () => {
    setChocos((c) => c.map((x) => ({ ...x, opened: true })));
    confettiRef.current?.explode(30);
    setUnwrapped(true); // if you still track that
  };

  const rewrapAll = () => {
    setChocos((c) => c.map((x) => ({ ...x, opened: false })));
    setUnwrapped(false);
  };

  const openChocolate = (id: number) => {
    setChocos((c) => {
      const next = c.map((x) => (x.id === id ? { ...x, opened: true } : x));
      // if all opened after this action, you can trigger confetti or set unwrapped flag
      if (next.every((n) => n.opened)) {
        confettiRef.current?.explode(45);
        setUnwrapped(true);
      }
      return next;
    });
  };

  return (
    <div
      className="no-heart p-4 rounded-2xl shadow-xl"
      style={{ background: "rgba(255,255,255,0.6)" }}
    >
      <h2 className="text-2xl font-semibold mb-3" style={{ color: MILK_CHOC }}>
        🍫 Chocolate Bars
      </h2>

      <div className="grid grid-cols-3 gap-4">
        {chocos.map((c) => (
          <motion.button
            key={c.id}
            onClick={(e) => {
              e.stopPropagation();
              if (!c.opened) openChocolate(c.id);
            }}
            whileTap={{ scale: 0.97 }}
            className="relative rounded-xl overflow-hidden shadow-md border border-[rgba(0,0,0,0.06)]"
            style={{
              minWidth: 96,
              minHeight: 96,
              // nicer chocolate gradient when closed; paper-like when opened
              background: c.opened
                ? `linear-gradient(180deg,#fff,#fff8f6)`
                : `linear-gradient(180deg, #6e412d 0%, #8a5f47 60%)`,
              color: c.opened ? "#3b2a20" : "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 8,
            }}
            aria-label={c.opened ? "Opened chocolate" : "Unopened chocolate"}
            title={c.opened ? "Opened" : "Unwrap"}
          >
            {/* glossy highlight */}
            {!c.opened && (
              <div
                aria-hidden
                style={{
                  pointerEvents: "none",
                  position: "absolute",
                  left: -12,
                  top: -6,
                  width: "140%",
                  height: "60%",
                  background:
                    "radial-gradient(120px 40px at 15% 10%, rgba(255,255,255,0.18), rgba(255,255,255,0) 35%)",
                  transform: "rotate(-15deg)",
                  mixBlendMode: "soft-light",
                }}
              />
            )}

            {/* molded squares (4 segments) */}
            {!c.opened ? (
              <div
                style={{
                  width: "100px",
                  height: "175px",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gridTemplateRows: "1fr 1fr 1fr",
                  gap: 6,
                }}
              >
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div
                    key={idx}
                    style={{
                      borderRadius: 8,
                      boxShadow:
                        "inset 0 -6px 10px rgba(0,0,0,0.12), inset 0 3px 4px rgba(255,255,255,0.04)",
                      background:
                        "linear-gradient(180deg, rgba(0,0,0,0.06), rgba(0,0,0,0.2))",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 18,
                    }}
                  ></div>
                ))}
              </div>
            ) : (
              // opened — show message with subtle card style
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="flex items-center justify-center p-2"
                style={{
                  maxWidth: "100px",
                  maxHeight: "175px",
                  minWidth: "100px",
                  minHeight: "175px",
                  textAlign: "center",
                  fontSize: 12,
                  color: "#3b2a20",
                  lineHeight: 1.2,
                }}
              >
                {c.text}
              </motion.div>
            )}
          </motion.button>
        ))}
      </div>

      <div className="mt-4 flex gap-3 justify-center">
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (allOpened) {
              // when all are open, clicking rewraps them
              rewrapAll();
            } else {
              // otherwise unwrap all
              revealAll();
            }
          }}
          className="no-heart px-4 py-2 rounded-full font-semibold shadow hover:brightness-105"
          style={{ background: MILK_CHOC, color: "#fff" }}
        >
          {allOpened ? "Chocolate Bars" : "Eat 'em All 🍬"}
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onCelebrate?.();
          }}
          className="no-heart px-4 py-2 rounded-full border-2 border-pink-300 font-semibold"
          style={{ background: "transparent", color: MILK_CHOC }}
        >
          🎉 Surprise!
        </button>
        <button className="text-4xl text-pink-400 font-extrabold">+</button>
      </div>
    </div>
  );
}
