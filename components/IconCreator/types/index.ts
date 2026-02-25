/**
 * IconCreator — Shared type definitions
 * All types used across the Icon Creator feature.
 */

/** Supported processing status states */
export type ProcessingStatus =
  | 'idle'        // No file loaded
  | 'loading'     // File is being read
  | 'ready'       // Image loaded, ready to process
  | 'processing'  // Background removal in progress
  | 'preview'     // Showing result for confirmation
  | 'generating'  // Generating ICO file
  | 'done'        // All outputs ready for download
  | 'error';      // Something went wrong

/** Full processing pipeline state */
export interface ProcessingState {
  status: ProcessingStatus;
  originalDataUrl: string | null;
  processedDataUrl: string | null;
  processedBlob: Blob | null;
  icoBlob: Blob | null;
  fileName: string;
  error: string | null;
  tolerance: number;
}

/** RGBA pixel color */
export interface PixelColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

/** Tab identifiers */
export type TabId = 'about' | 'convert';

/** Accepted file MIME types */
export const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;
export type AcceptedType = (typeof ACCEPTED_TYPES)[number];
