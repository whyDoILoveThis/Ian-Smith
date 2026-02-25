/**
 * PreviewModal — Full-screen confirmation modal
 *
 * Shows the processed image over a checkerboard background
 * so the user can clearly see transparent areas.
 *
 * Actions: Confirm (generates ICO) or Cancel (resets to ready state).
 */

"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ANIM } from "../lib/constants";

interface PreviewModalProps {
  isOpen: boolean;
  processedDataUrl: string | null;
  originalDataUrl: string | null;
  isGenerating: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function PreviewModal({
  isOpen,
  processedDataUrl,
  originalDataUrl,
  isGenerating,
  onConfirm,
  onCancel,
}: PreviewModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: ANIM.fast }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={!isGenerating ? onCancel : undefined}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal content */}
          <motion.div
            className={cn(
              "relative z-10 w-full max-w-2xl rounded-2xl overflow-hidden",
              "bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl",
              "border border-white/30 dark:border-orange-500/15",
              "shadow-2xl shadow-black/20",
            )}
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={ANIM.spring}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Preview Result
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Check the transparency — the checkerboard shows removed areas.
              </p>
            </div>

            {/* Image previews */}
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Original */}
                <div className="space-y-2">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Original
                  </span>
                  <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
                    {originalDataUrl && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={originalDataUrl}
                        alt="Original"
                        className="w-full h-auto max-h-[300px] object-contain"
                      />
                    )}
                  </div>
                </div>

                {/* Processed — checkerboard background */}
                <div className="space-y-2">
                  <span className="text-xs font-medium text-orange-500 uppercase tracking-wider">
                    Transparent
                  </span>
                  <div
                    className="rounded-xl overflow-hidden border border-orange-300 dark:border-orange-500/30"
                    style={{
                      backgroundImage: `
                        linear-gradient(45deg, #e5e5e5 25%, transparent 25%),
                        linear-gradient(-45deg, #e5e5e5 25%, transparent 25%),
                        linear-gradient(45deg, transparent 75%, #e5e5e5 75%),
                        linear-gradient(-45deg, transparent 75%, #e5e5e5 75%)
                      `,
                      backgroundSize: "16px 16px",
                      backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
                    }}
                  >
                    {processedDataUrl && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={processedDataUrl}
                        alt="Processed"
                        className="w-full h-auto max-h-[300px] object-contain"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 py-4 border-t border-gray-200/50 dark:border-gray-700/50 flex gap-3 justify-end">
              <button
                onClick={onCancel}
                disabled={isGenerating}
                className={cn(
                  "px-5 py-2.5 rounded-xl text-sm font-medium transition-all",
                  "bg-gray-100 text-gray-700 hover:bg-gray-200",
                  "dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                )}
              >
                <span className="flex items-center gap-2">
                  <X className="w-4 h-4" />
                  Cancel
                </span>
              </button>
              <button
                onClick={onConfirm}
                disabled={isGenerating}
                className={cn(
                  "px-5 py-2.5 rounded-xl text-sm font-medium transition-all",
                  "bg-orange-500 text-white hover:bg-orange-600",
                  "shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40",
                  "disabled:opacity-70 disabled:cursor-not-allowed",
                )}
              >
                <span className="flex items-center gap-2">
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating ICO...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Confirm & Generate
                    </>
                  )}
                </span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
