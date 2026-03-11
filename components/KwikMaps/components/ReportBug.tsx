"use client";

import React, { useState } from "react";
import { appwrSubmitBugReport } from "@/appwrite/appwrBugReport";
import {
  MessageSquarePlus,
  Bug,
  Send,
  X,
  Check,
  ChevronDown,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const categories = [
  { label: "Problem", value: "problem" },
  { label: "Idea", value: "idea" },
  { label: "Found Limitation", value: "limitation" },
] as const;

interface ReportBugProps {
  mode?: "feedback" | "bug";
  open: boolean;
  onClose: () => void;
}

export default function ReportBug({
  mode = "feedback",
  open,
  onClose,
}: ReportBugProps) {
  const isBug = mode === "bug";
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || status === "sending") return;

    setStatus("sending");
    try {
      await appwrSubmitBugReport(
        message.trim(),
        isBug ? "bug" : (category ?? undefined),
      );
      setStatus("sent");
      setMessage("");
      setCategory(null);
      setDetailsOpen(false);
      setTimeout(() => {
        onClose();
        setTimeout(() => setStatus("idle"), 300);
      }, 2000);
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          onClick={() => {
            if (status !== "sending") {
              onClose();
            }
          }}
        >
          <div className="absolute inset-0 bg-black/60" />
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-white/10 shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-3">
              <div className="flex items-center gap-2.5">
                <div
                  className={`p-2 rounded-xl ${isBug ? "bg-red-500/15" : "bg-indigo-500/15"}`}
                >
                  {isBug ? (
                    <Bug size={18} className="text-red-400" />
                  ) : (
                    <MessageSquarePlus size={18} className="text-indigo-400" />
                  )}
                </div>
                <h2 className="text-lg font-semibold text-white">
                  {isBug ? "Report a Bug" : "Send Feedback"}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white/80 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <AnimatePresence mode="wait">
              {status === "sent" ? (
                <motion.div
                  key="thanks"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex flex-col items-center gap-3 px-6 py-10"
                >
                  <div className="w-14 h-14 rounded-full bg-emerald-500/15 flex items-center justify-center">
                    <Check size={28} className="text-emerald-400" />
                  </div>
                  <p className="text-white font-semibold text-lg">Thank you!</p>
                  <p className="text-white/40 text-sm text-center">
                    {isBug
                      ? "Your bug report has been submitted."
                      : "Your feedback has been submitted."}
                  </p>
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  onSubmit={handleSubmit}
                  className="px-6 pb-6"
                >
                  <p className="text-white/40 text-xs mb-3">
                    {isBug
                      ? "Describe the bug you encountered."
                      : "Let us know what's on your mind."}
                  </p>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={
                      isBug ? "What went wrong?" : "Tell us something..."
                    }
                    rows={4}
                    disabled={status === "sending"}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-indigo-400/50 text-white placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-indigo-400/30 transition-all duration-200 text-sm resize-none disabled:opacity-50"
                    autoFocus
                  />

                  {/* Optional details dropdown — feedback mode only */}
                  {!isBug && (
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => setDetailsOpen(!detailsOpen)}
                        className="flex items-center gap-1.5 text-white/30 hover:text-white/50 transition-colors text-xs"
                      >
                        <ChevronDown
                          size={14}
                          className={`transition-transform duration-200 ${detailsOpen ? "rotate-180" : ""}`}
                        />
                        Optional details
                      </button>
                      <AnimatePresence>
                        {detailsOpen && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.15 }}
                            className="overflow-hidden"
                          >
                            <div className="flex flex-wrap gap-2 pt-2.5">
                              {categories.map((cat) => (
                                <button
                                  key={cat.value}
                                  type="button"
                                  onClick={() =>
                                    setCategory(
                                      category === cat.value ? null : cat.value,
                                    )
                                  }
                                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-150 ${
                                    category === cat.value
                                      ? "bg-indigo-500/25 text-indigo-300 ring-1 ring-indigo-400/40"
                                      : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60"
                                  }`}
                                >
                                  {cat.label}
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {status === "error" && (
                    <p className="text-red-400 text-xs mt-2">
                      Failed to send. Please try again.
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={!message.trim() || status === "sending"}
                    className={`mt-4 w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r ${
                      isBug
                        ? "from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600"
                        : "from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600"
                    } disabled:from-gray-600 disabled:to-gray-600 text-white font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:hover:scale-100`}
                  >
                    {status === "sending" ? (
                      <>
                        <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send size={16} />
                        Submit
                      </>
                    )}
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
