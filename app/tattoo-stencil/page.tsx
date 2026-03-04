/* ─────────────────────────────────────────────────────────────
   /tattoo-stencil – Tattoo Stencil Creator page
   ───────────────────────────────────────────────────────────── */
'use client';

import React, { useCallback } from 'react';
import { useTattooStencil } from '@/components/TattooStencilCreator/hooks/useTattooStencil';
import TattooUploader from '@/components/TattooStencilCreator/components/TattooUploader';
import StencilPreview from '@/components/TattooStencilCreator/components/StencilPreview';
import ProcessingStatus from '@/components/TattooStencilCreator/components/ProcessingStatus';
import StencilOptions from '@/components/TattooStencilCreator/components/StencilOptions';
import BoundarySelector from '@/components/TattooStencilCreator/components/BoundarySelector';
import type { WrapBoundary } from '@/components/TattooStencilCreator/types';

export default function TattooStencilPage() {
  const {
    image,
    processing,
    result,
    options,
    setOptions,
    wrapBoundary,
    awaitingBoundary,
    handleUpload,
    processImage,
    confirmBoundaryAndProcess,
    reset,
  } = useTattooStencil();

  const isBusy =
    processing.step !== 'idle' &&
    processing.step !== 'complete' &&
    processing.step !== 'error' &&
    processing.step !== 'awaiting-boundary';

  /** User confirmed boundary → proceed to API. */
  const handleBoundaryConfirm = useCallback(
    (boundary: WrapBoundary) => confirmBoundaryAndProcess(boundary),
    [confirmBoundaryAndProcess],
  );

  /** User chose to skip boundary → proceed without. */
  const handleBoundarySkip = useCallback(
    () => confirmBoundaryAndProcess(null),
    [confirmBoundaryAndProcess],
  );

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
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

      {/* ── Two-column layout (stacks on mobile) ──────────── */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* LEFT – Upload & Options / Boundary selector */}
        <div className="flex flex-col gap-6">
          {/* Show boundary selector when awaiting user input */}
          {awaitingBoundary && image ? (
            <BoundarySelector
              imageSrc={image.preview}
              imageWidth={image.width}
              imageHeight={image.height}
              onConfirm={handleBoundaryConfirm}
              onSkip={handleBoundarySkip}
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
            <StencilPreview result={result} wrapBoundary={wrapBoundary} />
          ) : (
            <EmptyResultPlaceholder />
          )}
        </div>
      </div>
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
