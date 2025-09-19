"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ConfettiHandle } from "./ConfettiCanvas";
import ItsConfettiCannon from "../sub/ItsConfettiCannon";

export default function LoveLetterModal({
  show,
  setShow,
  confettiRef,
}: {
  show: boolean;
  setShow: (v: boolean) => void;
  confettiRef: React.RefObject<ConfettiHandle | null>;
}) {
  const fullLetter =
    "My love,\n\nYou are my sweetness, my steady in the storm, my laugh on a heavy day. I adore you — more than words can hold, more than chocolate can sweeten. I wake up grateful for you every single day and I dont want to go to sleep without seeing your smile. You make ordinary moments feel like home, and your strength is admirable. I promise to show up for you, to laugh with you, and to build a life that keeps you safe and loved. I love you more than I can ever say, and I'll spend forever proving it. Always yours, Ian";
  const [typed, setTyped] = useState("");

  useEffect(() => {
    if (!show) return;
    let i = 0;
    let timeoutId: number | undefined;
    let mounted = true;

    setTyped(""); // reset immediately

    // recursive timeout is more reliable than setInterval for this kind of typewriter
    const tick = () => {
      if (!mounted) return;
      if (i < fullLetter.length) {
        // safe char retrieval — charAt never returns undefined
        const ch = fullLetter.charAt(i);
        setTyped((prev) => prev + ch);
        i++;
        timeoutId = window.setTimeout(tick, 25);
      } else {
        // finished typing — optional confetti reveal
        try {
          confettiRef?.current?.explode?.(80);
        } catch {
          /* ignore if ref not provided */
        }
      }
    };

    // start immediately so first char doesn't get missed
    tick();

    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
    // include confettiRef in deps only as a ref object (safe), fullLetter stable here
  }, [show, fullLetter, confettiRef]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ zIndex: 50, background: "rgba(0,0,0,0.5)" }}
          onClick={() => setShow(false)}
        >
          <motion.div
            className="p-8 rounded-3xl max-w-xl mx-4 bg-white shadow-2xl"
            initial={{ scale: 0.8, y: 30 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 30, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              className="text-3xl font-bold mb-4"
              style={{ color: "#84563C" }}
            >
              💖 To the Love of My Life 💖
            </h2>
            <pre
              className="whitespace-pre-wrap text-left text-sm"
              style={{ color: "#422f27", lineHeight: 1.5 }}
            >
              {typed}
            </pre>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShow(false)}
                className="px-4 py-2 rounded-full"
                style={{ background: "#ffd6e8", color: "#3b2a20" }}
              >
                Close 💕
              </button>
              <button
                onClick={() => confettiRef.current?.explode(80)}
                className="px-4 py-2 rounded-full flex flex-nowrap items-center gap-1"
                style={{ background: "#84563C", color: "#fff" }}
              >
                <ItsConfettiCannon />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
