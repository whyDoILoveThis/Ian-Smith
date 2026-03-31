/* ─────────────────────────────────────────────────────────────
   /tattoo-stencil – Tattoo Stencil Creator page
   ───────────────────────────────────────────────────────────── */
"use client";

import React, { useCallback, useState, lazy, Suspense } from "react";
import { useTattooStencil } from "@/components/TattooStencilCreator/hooks/useTattooStencil";
import TattooUploader from "@/components/TattooStencilCreator/components/TattooUploader";
import StencilPreview from "@/components/TattooStencilCreator/components/StencilPreview";
import ProcessingStatus from "@/components/TattooStencilCreator/components/ProcessingStatus";
import StencilOptions from "@/components/TattooStencilCreator/components/StencilOptions";
import RegionEditor from "@/components/TattooStencilCreator/components/RegionEditor";
import type { RegionEditorResult } from "@/components/TattooStencilCreator/types";
import Nav from "@/components/main/Nav";
import Footer from "@/components/main/Footer";

const MeshEditor = lazy(
  () => import("@/components/TattooStencilCreator/MeshEditor/MeshEditor"),
);
const TattooUnwrap = lazy(
  () => import("@/components/TattooStencilCreator/ai-fixer/TattooUnwrap"),
);

type EditorMode = "pipeline" | "sculpt" | "unwrap";

const TABS: { id: EditorMode; label: string; icon: string }[] = [
  { id: "pipeline", label: "Pipeline", icon: "⚙️" },
  { id: "sculpt", label: "3D Sculpt", icon: "🧊" },
  { id: "unwrap", label: "AI Unwrap", icon: "🧠" },
];

export default function TattooStencilPage() {
  const [editorMode, setEditorMode] = useState<EditorMode>("pipeline");

  const {
    image,
    processing,
    result,
    options,
    setOptions,
    regionResult,
    awaitingRegions,
    handleUpload,
    processImage,
    confirmRegionsAndProcess,
    reset,
  } = useTattooStencil();

  const isBusy =
    processing.step !== "idle" &&
    processing.step !== "complete" &&
    processing.step !== "error" &&
    processing.step !== "awaiting-regions";

  /** User confirmed regions → proceed to API. */
  const handleRegionConfirm = useCallback(
    (result: RegionEditorResult) => confirmRegionsAndProcess(result),
    [confirmRegionsAndProcess],
  );

  /** User chose to skip → proceed without. */
  const handleRegionSkip = useCallback(
    () => confirmRegionsAndProcess(null),
    [confirmRegionsAndProcess],
  );

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <Nav />
      {/* ── Header ────────────────────────────────────────── */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Tattoo Stencil Creator
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Upload a photo of a tattoo on an arm or leg and receive a
          high-contrast, print-ready stencil in PNG&nbsp;and&nbsp;SVG.
        </p>
      </div>

      {/* ── Mode Tabs ─────────────────────────────────────── */}
      <div className="mb-6 flex items-center justify-center">
        <div className="inline-flex rounded-xl bg-zinc-800/80 p-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setEditorMode(tab.id)}
              className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                editorMode === tab.id
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <span className="text-base">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── SCULPT MODE ───────────────────────────────────── */}
      {editorMode === "sculpt" ? (
        <Suspense
          fallback={
            <div className="flex h-[500px] items-center justify-center rounded-xl border border-dashed border-zinc-700 bg-zinc-900/50 text-sm text-zinc-500">
              Loading 3D Editor&hellip;
            </div>
          }
        >
          <MeshEditor />
        </Suspense>
      ) : editorMode === "unwrap" ? (
        /* ── AI UNWRAP MODE ──────────────────────────────────── */
        <Suspense
          fallback={
            <div className="flex h-[500px] items-center justify-center rounded-xl border border-dashed border-zinc-700 bg-zinc-900/50 text-sm text-zinc-500">
              Loading AI Unwrap&hellip;
            </div>
          }
        >
          <TattooUnwrap />
        </Suspense>
      ) : (
        /* ── PIPELINE MODE (existing) ───────────────────────── */
        <div className="grid gap-8 lg:grid-cols-2">
          {/* LEFT – Upload & Options / Boundary selector */}
          <div className="flex flex-col gap-6">
            {/* Show region editor when awaiting user input */}
            {awaitingRegions && image ? (
              <RegionEditor
                imageSrc={image.preview}
                imageWidth={image.width}
                imageHeight={image.height}
                onConfirm={handleRegionConfirm}
                onSkip={handleRegionSkip}
                initialRegions={regionResult}
              />
            ) : (
              <>
                <TattooUploader
                  image={image}
                  processing={processing}
                  onUpload={handleUpload}
                  onProcess={processImage}
                  onReset={reset}
                />

                {image && !isBusy && (
                  <StencilOptions
                    options={options}
                    onChange={setOptions}
                    disabled={isBusy}
                  />
                )}
              </>
            )}

            <ProcessingStatus processing={processing} />
          </div>

          {/* RIGHT – Result */}
          <div className="flex flex-col gap-6">
            {result ? (
              <StencilPreview result={result} />
            ) : (
              <EmptyResultPlaceholder />
            )}
          </div>
        </div>
      )}
      <Footer />
    </section>
  );
}

// ── Placeholder shown before processing ──────────────────────

function EmptyResultPlaceholder() {
  return (
    <div className="flex h-full min-h-[300px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/10 p-8 text-center">
      <div className="rounded-full bg-muted/60 p-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-8 w-8 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128m0 0a15.998 15.998 0 0 0 3.388-1.62m-5.043-.025a15.994 15.994 0 0 1 1.622-3.395m3.42 3.42a15.995 15.995 0 0 0 4.764-4.648l3.876-5.814a1.151 1.151 0 0 0-1.597-1.597L14.146 6.32a15.996 15.996 0 0 0-4.649 4.763m3.42 3.42a6.776 6.776 0 0 0-3.42-3.42"
          />
        </svg>
      </div>
      <p className="text-sm font-medium text-muted-foreground">
        Your stencil will appear here
      </p>
      <p className="max-w-xs text-xs text-muted-foreground/70">
        Upload a tattoo photo on the left, adjust options, then hit
        &ldquo;Generate Stencil&rdquo;.
      </p>
    </div>
  );
}
