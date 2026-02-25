/**
 * ConvertTab — Main conversion interface
 *
 * Contains the full processing pipeline UI:
 *  - File upload
 *  - Image preview with tolerance slider
 *  - Process button
 *  - Preview modal for confirmation
 *  - Download panel for final outputs
 */

"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Wand2, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useImageProcessor } from "../hooks/useImageProcessor";
import { FileUploader } from "./FileUploader";
import { ToleranceSlider } from "./ToleranceSlider";
import { PreviewModal } from "./PreviewModal";
import { DownloadPanel } from "./DownloadPanel";
import { GlassCard } from "./GlassCard";
import { ANIM } from "../lib/constants";

export function ConvertTab() {
  const {
    state,
    loadImage,
    processImage,
    confirmResult,
    cancelPreview,
    reset,
    setTolerance,
  } = useImageProcessor();

  const isIdle = state.status === "idle";
  const isLoading = state.status === "loading";
  const isReady = state.status === "ready";
  const isProcessing = state.status === "processing";
  const isPreview = state.status === "preview";
  const isGenerating = state.status === "generating";
  const isDone = state.status === "done";
  const isError = state.status === "error";

  const canProcess = isReady && !!state.originalDataUrl;
  const showUploader = isIdle || isLoading;
  const showControls = isReady || isProcessing;
  const showModal = isPreview || isGenerating;

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-4">
      {/* ── File Upload ── */}
      <AnimatePresence mode="wait">
        {showUploader && (
          <motion.div
            key="uploader"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: ANIM.normal }}
          >
            <FileUploader onFileSelect={loadImage} isLoading={isLoading} />
          </motion.div>
        )}

        {/* ── Controls: Image preview + tolerance + process button ── */}
        {showControls && (
          <motion.div
            key="controls"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: ANIM.normal }}
            className="space-y-5"
          >
            {/* Original image preview */}
            <GlassCard className="overflow-hidden">
              <div className="p-4 border-b border-gray-200/30 dark:border-gray-700/30">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                      Source Image
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate max-w-[200px]">
                      {state.fileName}
                    </p>
                  </div>
                  <button
                    onClick={reset}
                    className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    Change
                  </button>
                </div>
              </div>
              <div className="p-4 bg-gray-50/50 dark:bg-black/20">
                {state.originalDataUrl && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={state.originalDataUrl}
                    alt="Source"
                    className="max-h-[300px] w-auto mx-auto rounded-lg"
                  />
                )}
              </div>
            </GlassCard>

            {/* Tolerance controls */}
            <GlassCard className="p-5">
              <ToleranceSlider
                value={state.tolerance}
                onChange={setTolerance}
                disabled={isProcessing}
              />
            </GlassCard>

            {/* Process button */}
            <motion.button
              onClick={() => processImage()}
              disabled={!canProcess || isProcessing}
              className={cn(
                "w-full py-3.5 rounded-xl text-base font-semibold transition-all",
                "flex items-center justify-center gap-3",
                "bg-orange-500 text-white",
                "hover:bg-orange-600 active:bg-orange-700",
                "shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40",
                "disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none",
              )}
              whileHover={
                canProcess && !isProcessing ? { scale: 1.01 } : undefined
              }
              whileTap={
                canProcess && !isProcessing ? { scale: 0.99 } : undefined
              }
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Wand2 className="w-5 h-5" />
                  Remove Background
                </>
              )}
            </motion.button>
          </motion.div>
        )}

        {/* ── Downloads ── */}
        {isDone && (
          <motion.div
            key="downloads"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: ANIM.normal }}
          >
            <DownloadPanel
              processedBlob={state.processedBlob}
              icoBlob={state.icoBlob}
              fileName={state.fileName}
              onReset={reset}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Error State ── */}
      <AnimatePresence>
        {isError && state.error && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <GlassCard className="p-4 border-red-300 dark:border-red-500/20">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {state.error}
                  </p>
                  <button
                    onClick={reset}
                    className="text-xs text-red-500 hover:text-red-600 underline mt-2"
                  >
                    Start over
                  </button>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Preview Modal ── */}
      <PreviewModal
        isOpen={showModal}
        processedDataUrl={state.processedDataUrl}
        originalDataUrl={state.originalDataUrl}
        isGenerating={isGenerating}
        onConfirm={confirmResult}
        onCancel={cancelPreview}
      />
    </div>
  );
}
