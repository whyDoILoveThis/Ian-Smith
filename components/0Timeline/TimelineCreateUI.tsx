// components/timeline/TimelineCreateUI.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import LoaderSpinSmall from "../sub/LoaderSpinSmall";
import TimelineImageViewer from "./TimelineImageViewer";

const DOT_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#f59e0b", // amber
  "#22c55e", // green
  "#10b981", // emerald
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#ec4899", // pink
];

export default function TimelineCreateUI({
  defaultDateMs,
  onClose,
  onCreate,
  containerWidth,
  getXForMs,
  initialEvent,
  isLoading,
}: {
  defaultDateMs: number;
  onClose: () => void;
  onCreate: (payload: TimelineNode) => Promise<void>;
  containerWidth: number;
  getXForMs: (ms: number) => number;
  initialEvent?: TimelineNode;
  isLoading?: boolean;
}) {
  const [title, setTitle] = useState(initialEvent?.title ?? "New event");
  const [desc, setDesc] = useState(initialEvent?.description ?? "");
  const [link, setLink] = useState(initialEvent?.link ?? "");
  const [dateIso, setDateIso] = useState(
    new Date(defaultDateMs).toISOString().slice(0, 16),
  );
  const [images, setImages] = useState<File[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>(
    initialEvent?.images?.map((img) => img.url) ?? [],
  );
  const [selectedColor, setSelectedColor] = useState<string>(
    initialEvent?.color ?? "#06b6d4",
  );
  const [mounted, setMounted] = useState(false);

  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    setDateIso(new Date(defaultDateMs).toISOString().slice(0, 16));
  }, [defaultDateMs]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      // Append new files to existing ones
      const allFiles = [...images, ...files];
      setImages(allFiles);

      // Convert files to base64 for preview
      const readFileAsDataURL = (file: File): Promise<string> =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result === "string") {
              resolve(reader.result);
            }
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

      const newUrls = await Promise.all(files.map(readFileAsDataURL));
      setImageUrls((prev) => [...prev, ...newUrls]);
      // Reset file input
      e.target.value = "";
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImageUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const x = getXForMs(defaultDateMs);

  // Don't render until mounted (for portal)
  if (!mounted) return null;

  const formContent = (
    <div
      className="fixed inset-0 z-[1000010] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={ref}
        onClick={(e) => e.stopPropagation()}
        className="relative w-96 max-h-[90vh] overflow-y-auto bg-neutral-900 border border-neutral-700 rounded-lg p-3 shadow-2xl customScroll"
      >
        <div className="flex justify-between items-center mb-2">
          <div className="font-semibold">
            {initialEvent ? "Edit Event" : "Create Event"}
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-200"
          >
            ✕
          </button>
        </div>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-sm mb-2"
          placeholder="Title"
        />

        <input
          type="datetime-local"
          value={dateIso}
          onChange={(e) => setDateIso(e.target.value)}
          className="w-full bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-sm mb-2"
        />

        <input
          placeholder="Link (optional)"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          className="w-full bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-sm mb-2"
        />

        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="Description"
          className="w-full bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-sm mb-2 h-24"
        />

        {/* Image Upload Section */}
        <div className="mb-2">
          <label className="text-xs text-neutral-400 mb-1 block">
            Images (optional)
          </label>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileChange}
            className="w-full text-xs cursor-pointer"
          />
        </div>

        {/* Image Preview */}
        {imageUrls.length > 0 && (
          <div className="mb-2 bg-neutral-800 border border-neutral-700 rounded p-2">
            <TimelineImageViewer images={imageUrls} onRemove={removeImage} />
          </div>
        )}

        {/* Color Dot Selector */}
        <div className="mb-3">
          <label className="text-xs text-neutral-400 mb-2 block">
            Dot Color
          </label>
          <div className="flex flex-wrap gap-2">
            {DOT_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setSelectedColor(color)}
                className={`w-5 h-5 rounded-full transition-all duration-200 ${
                  selectedColor === color
                    ? "ring-2 ring-white ring-offset-2 ring-offset-neutral-900 scale-110"
                    : "hover:scale-110 opacity-70 hover:opacity-100"
                }`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-neutral-800 border border-neutral-700 text-sm"
          >
            Cancel
          </button>

          <button
            onClick={() => {
              const ms = new Date(dateIso).getTime();
              console.log("createbuttonpressed", ms);

              onCreate({
                title,
                description: desc || null,
                link: link || null,
                dateMs: ms,
                images: images.length > 0 ? (images as any) : undefined,
                color: selectedColor,
              });
            }}
            className="px-3 py-1 rounded bg-cyan-500 text-black font-medium text-sm"
          >
            {initialEvent ? "Save" : "Create"}
          </button>
        </div>
      </div>
      {isLoading && (
        <div className="absolute inset-0 z-[100] rounded-lg flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <LoaderSpinSmall color="cyan" />
        </div>
      )}
    </div>
  );

  return createPortal(formContent, document.body);
}
