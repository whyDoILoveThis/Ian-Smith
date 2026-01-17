"use client";

import React, { useEffect, useRef } from "react";

interface Props {
  project: Project;
  handleDelete: (
    id: string | undefined,
    screenshots?: Screenshot[],
  ) => Promise<void>;
  setShowDeletePop: (show: boolean) => void;
  setLoadingDelete: (loading: boolean) => void;
}

export default function DeleteProjPop({
  project,
  handleDelete,
  setShowDeletePop,
  setLoadingDelete,
}: Props) {
  const modalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowDeletePop(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [setShowDeletePop]);

  const confirm = async () => {
    setLoadingDelete(true);
    try {
      await handleDelete(project.$id, project.screenshots);
    } finally {
      setShowDeletePop(false);
      setLoadingDelete(false);
    }
  };

  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Confirm delete ${project.title}`}
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 backdrop-blur-md"
    >
      <div className="mx-4 w-full max-w-lg rounded-3xl p-6 bg-rose-900/30 backdrop-blur-lg border border-red-800/50 shadow-2xl">
        <div className="flex items-start gap-4">
          <div className="flex-none w-16 h-16 rounded-xl bg-black/40 flex items-center justify-center text-white text-3xl font-black shadow-lg">
            ☠️
          </div>
          <div className="flex-1 min-w-0">
            <p
              className="text-2xl md:text-3xl font-extrabold text-red-500 animate-pulse
              drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]
              tracking-wide"
            >
              About to{" "}
              <span className="underline decoration-red-400">DELETE</span>
            </p>

            <h2 className="mt-1 text-lg md:text-2xl font-extrabold truncate">
              {project.title}
            </h2>
            <p className="mt-3 text-sm text-red-100">
              This action is <span className="font-bold underline">NOT</span>{" "}
              reversible. All screenshots and associated data will be
              permanently removed.
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-4">
          <button
            onClick={() => setShowDeletePop(false)}
            className="
    group relative overflow-hidden
    inline-flex items-center gap-2 px-5 py-2 rounded-xl
    bg-gradient-to-r from-emerald-400 to-green-500
    text-white font-semibold
    shadow-md
    transition-all duration-300
    hover:scale-105
    hover:brightness-110
    hover:shadow-[0_0_25px_rgba(52,211,153,0.9)]
  "
          >
            {/* Angelic glow */}
            <div
              className="
      pointer-events-none absolute inset-0
      opacity-0 group-hover:opacity-100
      transition-opacity duration-300
      bg-gradient-to-r from-white/20 via-emerald-200/30 to-white/20
      animate-pulse
    "
            />

            {/* Halo emoji */}
            <span className="relative z-10 text-lg transition-transform group-hover:scale-110">
              😇
            </span>

            <span className="relative z-10">Cancel</span>
          </button>

          <button
            onClick={confirm}
            className="
    group relative overflow-hidden
    inline-flex items-center gap-3 px-4 py-2 rounded-xl
    bg-gradient-to-r from-red-600 to-rose-700
    text-white font-bold shadow-lg
    transition-all duration-300
    hover:brightness-125
    hover:animate-pulse
    hover:drop-shadow-[0_0_18px_rgba(239,68,68,0.95)]
  "
          >
            {/* Skull overlay */}
            <div
              className="
      pointer-events-none absolute inset-0
      flex items-center justify-center
      text-2xl opacity-0
      transition-opacity duration-300
      group-hover:opacity-100
    "
            >
              ☠️ ☠️ ☠️
            </div>

            {/* Content */}
            <span className="relative z-10 text-sm group-hover:opacity-0 transition-opacity">
              Yes, delete
            </span>

            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="relative z-10 h-4 w-4 group-hover:opacity-0 transition-opacity"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="mt-4 text-xs text-green-200">
          <strong className="text-green-100">Tip:</strong> If you’re unsure,
          consider archiving the project instead of deleting it permanently.
        </div>
      </div>
    </div>
  );
}
