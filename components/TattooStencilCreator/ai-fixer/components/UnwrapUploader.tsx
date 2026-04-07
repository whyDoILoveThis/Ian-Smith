/* ─────────────────────────────────────────────────────────────
   Unwrap Image Uploader
   Drag-and-drop upload specific to the AI Unwrap pipeline.
   ───────────────────────────────────────────────────────────── */
"use client";

import React, { useCallback, useRef } from "react";
import { useUnwrapStore } from "../store";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

export default function UnwrapUploader() {
  const { sourceImage, setSourceImage, reset, currentStep } = useUnwrapStore();
  const inputRef = useRef<HTMLInputElement>(null);

  const isBusy =
    currentStep !== "idle" &&
    currentStep !== "complete" &&
    currentStep !== "error";

  const handleFile = useCallback(
    async (file: File) => {
      if (!ACCEPTED.includes(file.type)) return;
      if (file.size > MAX_SIZE) return;

      const url = URL.createObjectURL(file);
      const img = new Image();
      await new Promise<void>((res) => {
        img.onload = () => res();
        img.src = url;
      });

      setSourceImage({
        file,
        preview: url,
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    },
    [setSourceImage],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const onInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleReset = useCallback(() => {
    if (sourceImage?.preview) URL.revokeObjectURL(sourceImage.preview);
    reset();
  }, [sourceImage, reset]);

  if (sourceImage) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-zinc-700/50 bg-zinc-900/60 p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-zinc-300">
            Source Image
          </span>
          <button
            onClick={handleReset}
            disabled={isBusy}
            className="rounded px-2 py-0.5 text-[11px] text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-40"
          >
            Reset
          </button>
        </div>
        <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-zinc-950">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={sourceImage.preview}
            alt="Source tattoo"
            className="h-full w-full object-contain"
          />
          <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-zinc-400">
            {sourceImage.width}×{sourceImage.height}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-900/50 p-10 text-center transition-colors hover:border-indigo-500/50 hover:bg-indigo-900/20"
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        className="hidden"
        onChange={onInput}
      />
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-10 w-10 text-zinc-600"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 16v-8m0 0-3 3m3-3 3 3M4 16v1a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1"
        />
      </svg>
      <p className="text-sm font-medium text-zinc-400">
        Drop a tattoo photo or click to browse
      </p>
      <p className="text-[11px] text-zinc-600">JPG, PNG, WebP · max 10 MB</p>
    </div>
  );
}
