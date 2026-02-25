/**
 * DownloadPanel — Displays download buttons for generated outputs
 *
 * Shows both PNG (transparent) and ICO download options
 * with file size info and clear visual hierarchy.
 */

"use client";

import { motion } from "framer-motion";
import { Download, FileImage, FileBox, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { downloadBlob, stripExtension } from "../lib/imageUtils";
import { GlassCard } from "./GlassCard";
import { ANIM } from "../lib/constants";

interface DownloadPanelProps {
  processedBlob: Blob | null;
  icoBlob: Blob | null;
  fileName: string;
  onReset: () => void;
}

/** Format bytes to human-readable string */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DownloadPanel({
  processedBlob,
  icoBlob,
  fileName,
  onReset,
}: DownloadPanelProps) {
  const baseName = stripExtension(fileName);

  const handleDownloadPng = () => {
    if (processedBlob) {
      downloadBlob(processedBlob, `${baseName}-transparent.png`);
    }
  };

  const handleDownloadIco = () => {
    if (icoBlob) {
      downloadBlob(icoBlob, `${baseName}.ico`);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: ANIM.normal }}
      className="space-y-4"
    >
      {/* Success header */}
      <div className="text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={ANIM.spring}
          className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-500/10 dark:bg-green-500/20 mb-3"
        >
          <Download className="w-7 h-7 text-green-500" />
        </motion.div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Files Ready
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Your icon files have been generated successfully.
        </p>
      </div>

      {/* Download buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* PNG download */}
        <GlassCard className="p-0 overflow-hidden" glow>
          <button
            onClick={handleDownloadPng}
            disabled={!processedBlob}
            className={cn(
              "w-full p-4 flex items-center gap-4 transition-colors",
              "hover:bg-orange-50/50 dark:hover:bg-orange-500/5",
              "disabled:opacity-50 disabled:cursor-not-allowed",
            )}
          >
            <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-orange-500/10 dark:bg-orange-500/20 flex items-center justify-center">
              <FileImage className="w-5 h-5 text-orange-500" />
            </div>
            <div className="text-left min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                Transparent PNG
              </p>
              {processedBlob && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatBytes(processedBlob.size)}
                </p>
              )}
            </div>
            <Download className="w-4 h-4 text-gray-400 ml-auto flex-shrink-0" />
          </button>
        </GlassCard>

        {/* ICO download */}
        <GlassCard className="p-0 overflow-hidden" glow>
          <button
            onClick={handleDownloadIco}
            disabled={!icoBlob}
            className={cn(
              "w-full p-4 flex items-center gap-4 transition-colors",
              "hover:bg-orange-50/50 dark:hover:bg-orange-500/5",
              "disabled:opacity-50 disabled:cursor-not-allowed",
            )}
          >
            <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-orange-500/10 dark:bg-orange-500/20 flex items-center justify-center">
              <FileBox className="w-5 h-5 text-orange-500" />
            </div>
            <div className="text-left min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                Multi-Size ICO
              </p>
              {icoBlob && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  16 · 32 · 48 · 256 px — {formatBytes(icoBlob.size)}
                </p>
              )}
            </div>
            <Download className="w-4 h-4 text-gray-400 ml-auto flex-shrink-0" />
          </button>
        </GlassCard>
      </div>

      {/* Reset button */}
      <div className="flex justify-center pt-2">
        <button
          onClick={onReset}
          className={cn(
            "px-5 py-2.5 rounded-xl text-sm font-medium transition-all",
            "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white",
            "hover:bg-gray-100 dark:hover:bg-gray-800",
            "flex items-center gap-2",
          )}
        >
          <RotateCcw className="w-4 h-4" />
          Process Another Image
        </button>
      </div>
    </motion.div>
  );
}
