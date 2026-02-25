/**
 * FileUploader — Drag-and-drop + click-to-upload component
 *
 * Features:
 *  - Drag-over visual feedback (orange border pulse)
 *  - Click to open file picker
 *  - Validates file type (PNG, JPG, WEBP)
 *  - Shows loading state
 *  - Mobile-friendly large touch target
 */

"use client";

import { useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Image as ImageIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ACCEPTED_TYPES, type AcceptedType } from "../types";
import { ACCEPTED_EXTENSIONS } from "../lib/constants";

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  isLoading: boolean;
  disabled?: boolean;
}

export function FileUploader({
  onFileSelect,
  isLoading,
  disabled,
}: FileUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Validate and emit file ──
  const handleFile = useCallback(
    (file: File) => {
      if (!ACCEPTED_TYPES.includes(file.type as AcceptedType)) {
        alert("Please upload a PNG, JPG, or WEBP image.");
        return;
      }
      onFileSelect(file);
    },
    [onFileSelect],
  );

  // ── Drag events ──
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  // ── Click to browse ──
  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      // Reset input so the same file can be re-selected
      e.target.value = "";
    },
    [handleFile],
  );

  return (
    <motion.button
      type="button"
      onClick={() => !disabled && !isLoading && inputRef.current?.click()}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      disabled={disabled || isLoading}
      className={cn(
        "relative w-full min-h-[220px] rounded-2xl border-2 border-dashed",
        "flex flex-col items-center justify-center gap-4 p-8",
        "transition-all duration-300 cursor-pointer",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50",
        // Default
        "border-gray-300 dark:border-gray-700",
        "bg-white/40 dark:bg-black/20",
        "hover:border-orange-400 hover:bg-orange-50/30 dark:hover:border-orange-500/40 dark:hover:bg-orange-500/5",
        // Drag over
        isDragOver &&
          "border-orange-500 bg-orange-50/50 dark:border-orange-400 dark:bg-orange-500/10 scale-[1.02]",
        // Disabled
        (disabled || isLoading) && "opacity-50 cursor-not-allowed",
      )}
      whileHover={!disabled && !isLoading ? { scale: 1.01 } : undefined}
      whileTap={!disabled && !isLoading ? { scale: 0.99 } : undefined}
    >
      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS}
        onChange={onInputChange}
        className="hidden"
        aria-label="Upload image"
      />

      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex flex-col items-center gap-3"
          >
            <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Loading image...
            </span>
          </motion.div>
        ) : (
          <motion.div
            key="idle"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex flex-col items-center gap-3"
          >
            <div className="relative">
              <ImageIcon className="w-12 h-12 text-gray-400 dark:text-gray-500" />
              <Upload className="w-5 h-5 text-orange-500 absolute -bottom-1 -right-1" />
            </div>
            <div className="text-center">
              <p className="text-base font-medium text-gray-700 dark:text-gray-200">
                Drop your logo here
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                or click to browse — PNG, JPG, WEBP
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
