/**
 * IconCreatorApp — Root layout component
 *
 * Provides the tabbed interface with:
 *  - About tab (splash page)
 *  - Convert tab (full tool)
 *  - Orange + black glass theme
 *  - Smooth tab transitions
 */

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { AboutTab } from "./AboutTab";
import { ConvertTab } from "./ConvertTab";
import type { TabId } from "../types";
import { ANIM } from "../lib/constants";

// ─── Tab Configuration ───────────────────────────────────────────────────────

const TABS: { id: TabId; label: string }[] = [
  { id: "about", label: "About" },
  { id: "convert", label: "Convert" },
];

// ─── Component ───────────────────────────────────────────────────────────────

export function IconCreatorApp() {
  const [activeTab, setActiveTab] = useState<TabId>("about");

  return (
    <div className="min-h-screen pt-16 w-full bg-gradient-to-br from-gray-50 via-orange-50/30 to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-black">
      {/* Decorative background orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-orange-500/10 dark:bg-orange-500/5 blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-80 h-80 rounded-full bg-orange-400/10 dark:bg-orange-600/5 blur-3xl" />
        <div className="absolute -bottom-40 right-1/3 w-72 h-72 rounded-full bg-amber-400/10 dark:bg-amber-500/5 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* ── Header + Tabs ── */}
        <div className="flex flex-col gap-6 mb-12">
          {/* Logo — large & bold */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-xl shadow-orange-500/25">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-6 h-6 sm:w-10 sm:h-10 text-white"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="m21 15-5-5L5 21" />
              </svg>
            </div>
            <h1 className="text-4xl sm:text-7xl font-[900] text-gray-900 dark:text-white tracking-tight leading-none">
              Icon<span className="text-orange-500">Creator</span>
            </h1>
          </div>

          {/* Tabs — aligned left on mobile, right on desktop */}
          <nav className="flex gap-8 pl-8">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "relative pb-2 text-md sm:text-lg font-medium tracking-wide transition-colors duration-300",
                    isActive
                      ? "text-orange-500"
                      : "text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300",
                  )}
                >
                  {tab.label}

                  {/* Animated underline */}
                  {isActive && (
                    <motion.div
                      layoutId="tabUnderline"
                      className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-gradient-to-r from-orange-500 to-amber-400"
                      style={{ boxShadow: "0 1px 8px rgba(249,115,22,0.4)" }}
                      transition={{
                        type: "spring",
                        stiffness: 380,
                        damping: 30,
                      }}
                    />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* ── Tab Content ── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: ANIM.normal }}
          >
            {activeTab === "about" ? <AboutTab /> : <ConvertTab />}
          </motion.div>
        </AnimatePresence>

        {/* ── Footer ── */}
        <footer className="text-center mt-12 pb-6">
          <p className="text-xs text-gray-400 dark:text-gray-600">
            Built with Canvas API · 100% Client-Side · No data leaves your
            device
          </p>
        </footer>
      </div>
    </div>
  );
}
