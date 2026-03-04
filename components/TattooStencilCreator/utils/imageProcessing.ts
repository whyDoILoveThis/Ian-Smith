/* ─────────────────────────────────────────────────────────────
   Client-side image helpers
   Validation · compression · base64 · download
   ───────────────────────────────────────────────────────────── */

import {
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_MB,
  ACCEPTED_IMAGE_TYPES,
  MIN_IMAGE_DIMENSION,
  MAX_IMAGE_DIMENSION,
  PROCESSING_MAX_DIMENSION,
} from '../lib/constants';

// ── Validation ───────────────────────────────────────────────

export function validateImageFile(file: File): string | null {
  const accepted = Object.keys(ACCEPTED_IMAGE_TYPES);
  if (!accepted.includes(file.type)) {
    const exts = Object.values(ACCEPTED_IMAGE_TYPES).flat().join(', ');
    return `Unsupported file type. Accepted formats: ${exts}`;
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `File is too large (max ${MAX_FILE_SIZE_MB} MB).`;
  }
  return null;
}

export function validateImageDimensions(w: number, h: number): string | null {
  if (w < MIN_IMAGE_DIMENSION || h < MIN_IMAGE_DIMENSION) {
    return `Image is too small. Each side must be at least ${MIN_IMAGE_DIMENSION}px.`;
  }
  if (w > MAX_IMAGE_DIMENSION || h > MAX_IMAGE_DIMENSION) {
    return `Image is too large. Each side must be at most ${MAX_IMAGE_DIMENSION}px.`;
  }
  return null;
}

// ── Image loading ────────────────────────────────────────────

export function loadImageDimensions(
  file: File,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image.'));
    };
    img.src = URL.createObjectURL(file);
  });
}

export function createImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image element.'));
    };
    img.src = URL.createObjectURL(file);
  });
}

// ── Base64 / compression ─────────────────────────────────────

export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]); // strip data-url prefix
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Resize the image on a canvas and return a base64 string
 * suitable for upload. Uses JPEG at quality 0.85 to keep
 * the JSON payload small (~300-600 KB instead of 4-5 MB PNG).
 * Sharp on the server parses JPEG fine.
 */
export async function compressImageForUpload(
  file: File,
  maxDimension = PROCESSING_MAX_DIMENSION,
): Promise<string> {
  const img = await createImageElement(file);
  let { naturalWidth: w, naturalHeight: h } = img;

  if (w > maxDimension || h > maxDimension) {
    const scale = maxDimension / Math.max(w, h);
    w = Math.round(w * scale);
    h = Math.round(h * scale);
  }

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context unavailable.');

  // White background so JPEG doesn't get transparent-to-black artifacts
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  URL.revokeObjectURL(img.src);

  const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
  return dataUrl.split(',')[1];
}

// ── Download helpers ─────────────────────────────────────────

export function base64ToBlob(
  base64: string,
  mime = 'image/png',
): Blob {
  const bytes = atob(base64);
  const buf = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) buf[i] = bytes.charCodeAt(i);
  return new Blob([buf], { type: mime });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadPng(base64: string, filename = 'tattoo-stencil.png'): void {
  downloadBlob(base64ToBlob(base64, 'image/png'), filename);
}

export function downloadSvg(svgContent: string, filename = 'tattoo-stencil.svg'): void {
  downloadBlob(new Blob([svgContent], { type: 'image/svg+xml' }), filename);
}
