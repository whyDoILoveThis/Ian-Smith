/* ─────────────────────────────────────────────────────────────
   TattooUploader – Drag-and-drop / file-picker upload zone
   ───────────────────────────────────────────────────────────── */
"use client";

import React, { useCallback, useMemo } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { Upload, ImageIcon, X, AlertCircle } from "lucide-react";
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_MB,
} from "../lib/constants";
import type { ProcessingState, UploadedImage } from "../types";

interface Props {
  image: UploadedImage | null;
  processing: ProcessingState;
  onUpload: (file: File) => void;
  onProcess: () => void;
  onReset: () => void;
}

export default function TattooUploader({
  image,
  processing,
  onUpload,
  onProcess,
  onReset,
}: Props) {
  const isBusy =
    processing.step !== "idle" &&
    processing.step !== "complete" &&
    processing.step !== "error";

  // ── Dropzone ───────────────────────────────────────────────

  const onDrop = useCallback(
    (accepted: File[], rejected: FileRejection[]) => {
      if (rejected.length) return; // validation errors already shown by dropzone
      if (accepted.length) onUpload(accepted[0]);
    },
    [onUpload],
  );

  const accept = useMemo(() => ACCEPTED_IMAGE_TYPES, []);

  const { getRootProps, getInputProps, isDragActive, fileRejections } =
    useDropzone({
      onDrop,
      accept,
      maxSize: MAX_FILE_SIZE_BYTES,
      maxFiles: 1,
      disabled: isBusy,
      multiple: false,
    });

  // ── Rejection messages ─────────────────────────────────────

  const rejectionMsg = fileRejections.length
    ? fileRejections[0].errors.map((e) => e.message).join(". ")
    : null;

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4">
      {/* ── Drop zone ─────────────────────────────────────── */}
      {!image && (
        <div
          {...getRootProps()}
          className={`
            relative flex flex-col items-center justify-center gap-3
            rounded-xl border-2 border-dashed p-10 text-center
            transition-colors duration-200 cursor-pointer
            ${
              isDragActive
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/30 hover:border-primary/60 hover:bg-muted/40"
            }
            ${isBusy ? "pointer-events-none opacity-50" : ""}
          `}
        >
          <input {...getInputProps()} />
          <Upload className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">
            {isDragActive
              ? "Drop image here…"
              : "Drag & drop a tattoo photo, or click to select"}
          </p>
          <p className="text-xs text-muted-foreground">
            JPG, PNG or WebP &middot; max {MAX_FILE_SIZE_MB} MB
          </p>
        </div>
      )}

      {/* ── Rejection error ───────────────────────────────── */}
      {rejectionMsg && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{rejectionMsg}</span>
        </div>
      )}

      {/* ── Processing error ──────────────────────────────── */}
      {processing.step === "error" && processing.error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{processing.error}</span>
        </div>
      )}

      {/* ── Preview ───────────────────────────────────────── */}
      {image && (
        <div className="relative overflow-hidden rounded-xl border border-border bg-muted/30">
          <div className="flex items-center justify-between border-b border-border px-4 py-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ImageIcon className="h-4 w-4" />
              <span className="truncate max-w-[200px]">{image.file.name}</span>
              <span className="text-xs">
                {image.width} × {image.height}
              </span>
            </div>
            <button
              onClick={onReset}
              disabled={isBusy}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
              aria-label="Remove image"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image.preview}
            alt="Uploaded tattoo preview"
            className="mx-auto max-h-[400px] object-contain p-4"
          />
        </div>
      )}

      {/* ── Action button ─────────────────────────────────── */}
      {image && (
        <button
          onClick={onProcess}
          disabled={isBusy}
          className={`
            w-full rounded-lg px-6 py-3 text-sm font-semibold transition-all
            ${
              isBusy
                ? "cursor-not-allowed bg-muted text-muted-foreground"
                : "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98]"
            }
          `}
        >
          {isBusy ? "Processing…" : "Generate Stencil"}
        </button>
      )}
    </div>
  );
}
