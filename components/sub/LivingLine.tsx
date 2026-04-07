"use client";
import { motion } from "framer-motion";

interface LivingLineProps {
  className?: string;
}

const LivingLine = ({ className = "" }: LivingLineProps) => (
  <div className={`flex justify-center overflow-hidden ${className}`}>
    <motion.div
      className="h-1 rounded-full bg-gradient-to-r from-transparent via-indigo-500 to-transparent"
      animate={{
        width: ["5rem", "7.5rem", "4.5rem", "8rem", "5rem"],
        x: [0, 18, -14, 10, 0],
        opacity: [0.85, 1, 0.7, 0.95, 0.85],
      }}
      transition={{
        width: {
          duration: 10,
          ease: [0.45, 0.05, 0.55, 0.95],
          repeat: Infinity,
          repeatType: "mirror",
        },
        x: {
          duration: 7,
          ease: [0.45, 0.05, 0.55, 0.95],
          repeat: Infinity,
          repeatType: "mirror",
        },
        opacity: {
          duration: 13,
          ease: "easeInOut",
          repeat: Infinity,
          repeatType: "mirror",
        },
      }}
    />
  </div>
);

export default LivingLine;
