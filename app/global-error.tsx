"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { RefreshCcw, Home, RotateCcw, Bug } from "lucide-react";
import EmojiText from "@/components/ui/EmojiText";
import ReportBug from "@/components/KwikMaps/components/ReportBug";

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  const router = useRouter();
  const [bugReportOpen, setBugReportOpen] = useState(false);

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <EmojiText
      as="div"
      className="relative h-screen w-full overflow-hidden bg-slate-950 text-white flex items-center justify-center"
    >
      {/* 🌌 Animated background glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-black" />

      <motion.div
        className="absolute w-[500px] h-[500px] bg-red-500/20 rounded-full blur-3xl"
        animate={{ x: [0, 100, -100, 0], y: [0, -50, 50, 0] }}
        transition={{ repeat: Infinity, duration: 12, ease: "easeInOut" }}
      />

      {/* 💎 Main Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="
relative z-10
backdrop-blur-xl
rounded-3xl
p-10 max-w-lg text-center

border border-red-500/30

shadow-[0_10px_30px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.08),inset_0_-2px_4px_rgba(0,0,0,0.6)]

before:absolute before:inset-0 before:rounded-3xl
before:bg-gradient-to-b before:from-red-500/10 before:to-transparent
before:pointer-events-none
"
      >
        {/* 😱 Icon */}
        <motion.div
          initial={{ rotate: -10, scale: 0.8 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 120 }}
          className="flex justify-center mb-6"
        >
          <div className="p-4 rounded-full w-20 h-20 bg-red-500/20 border border-red-500/50">
            <span className="text-4xl">😱</span>
          </div>
        </motion.div>

        {/* 🧠 Message */}
        <h1 className="text-2xl font-bold mb-4">
          Oh no! An err has occurred!! 😱
        </h1>

        <p className="text-slate-400 mb-8">
          But don&apos;t worry tho 👌 We are aware of the issue, and are
          diligently working on a fix 😎
        </p>

        {/* 🔘 Buttons */}
        <div className="flex gap-3 justify-center flex-wrap">
          {/* 🔁 Refresh */}
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition border border-white/10"
          >
            <RefreshCcw size={16} />
            Refresh
          </button>

          {/* 🔄 Reset */}
          <button
            onClick={() => reset()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition border border-white/10"
          >
            <RotateCcw size={16} />
            Reset
          </button>

          {/* 🏠 Home */}
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition border border-white/10"
          >
            <Home size={16} />
            Home
          </button>
        </div>
        <p className="text-gray-400 text-xs p-4 pt-8">
          If you believe we are unaware of this err, please send a bug report 🐛
        </p>
        <button
          className="btn btn-sm btn-w-icon btn-red !rounded-xl !text-sm place-self-center"
          onClick={() => setBugReportOpen(true)}
        >
          <Bug size={16} /> Bug
        </button>
        <ReportBug
          mode="bug"
          open={bugReportOpen}
          onClose={() => setBugReportOpen(false)}
        />
      </motion.div>
    </EmojiText>
  );
}
