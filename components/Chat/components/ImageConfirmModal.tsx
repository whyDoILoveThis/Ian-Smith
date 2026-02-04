"use client";

import React from "react";

type ImageConfirmModalProps = {
  pendingMediaUrl: string;
  isVideo: boolean;
  isSending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ImageConfirmModal({
  pendingMediaUrl,
  isVideo,
  isSending,
  onConfirm,
  onCancel,
}: ImageConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-neutral-900/90 p-6 shadow-2xl backdrop-blur">
        <h3 className="text-lg font-semibold text-white">
          Send this {isVideo ? "video" : "image"}?
        </h3>
        <p className="mt-1 text-sm text-neutral-400">
          Confirm or cancel before sending.
        </p>
        <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black/40">
          {isVideo ? (
            <video
              src={pendingMediaUrl}
              controls
              className="max-h-[320px] w-full object-contain"
            />
          ) : (
            <img
              src={pendingMediaUrl}
              alt="Preview"
              className="max-h-[320px] w-full object-contain"
            />
          )}
        </div>
        <div className="mt-5 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isSending}
            className="flex-1 rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSending ? "Sending..." : `Send ${isVideo ? "Video" : "Image"}`}
          </button>
        </div>
      </div>
    </div>
  );
}
