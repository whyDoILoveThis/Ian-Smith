/**
 * IconCreator — ICO File Generator
 *
 * Builds a valid .ico file from a source canvas.
 * Each icon size is stored as an embedded PNG inside the ICO container.
 *
 * ICO Format:
 *   [Header 6B] [DirEntry 16B × N] [PNG data × N]
 *
 * Supports Windows Vista+ (PNG-encoded icons).
 */

import { ICO_SIZES } from './constants';

// ─── Canvas Resize Helper ────────────────────────────────────────────────────

/**
 * Resize a canvas to target dimensions using high-quality interpolation.
 */
function resizeCanvas(source: HTMLCanvasElement, size: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, size, size);

  return canvas;
}

/**
 * Convert a canvas to a PNG ArrayBuffer.
 */
function canvasToPngBuffer(canvas: HTMLCanvasElement): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error('Failed to export canvas as PNG'));
        blob.arrayBuffer().then(resolve).catch(reject);
      },
      'image/png',
    );
  });
}

// ─── ICO Builder ─────────────────────────────────────────────────────────────

/**
 * Generate a multi-size .ico file from a transparent PNG canvas.
 *
 * @param sourceCanvas - The processed canvas with transparent background
 * @returns A Blob containing the .ico file
 */
export async function generateIco(sourceCanvas: HTMLCanvasElement): Promise<Blob> {
  // Generate PNG buffers for each target size
  const pngBuffers: ArrayBuffer[] = [];

  for (const size of ICO_SIZES) {
    const resized = resizeCanvas(sourceCanvas, size);
    const buffer = await canvasToPngBuffer(resized);
    pngBuffers.push(buffer);
  }

  // ── Calculate offsets ──
  const HEADER_SIZE = 6;
  const DIR_ENTRY_SIZE = 16;
  const dirTotalSize = DIR_ENTRY_SIZE * ICO_SIZES.length;
  const dataStartOffset = HEADER_SIZE + dirTotalSize;

  // Total file size
  const totalDataSize = pngBuffers.reduce((sum, buf) => sum + buf.byteLength, 0);
  const totalSize = dataStartOffset + totalDataSize;

  // ── Build binary ──
  const ico = new ArrayBuffer(totalSize);
  const view = new DataView(ico);
  const bytes = new Uint8Array(ico);

  // ICO Header
  view.setUint16(0, 0, true);                // Reserved — must be 0
  view.setUint16(2, 1, true);                // Type — 1 = ICO
  view.setUint16(4, ICO_SIZES.length, true); // Image count

  // Directory entries + image data
  let currentDataOffset = dataStartOffset;

  for (let i = 0; i < ICO_SIZES.length; i++) {
    const size = ICO_SIZES[i];
    const entryOffset = HEADER_SIZE + i * DIR_ENTRY_SIZE;
    const pngSize = pngBuffers[i].byteLength;

    // Directory entry (16 bytes)
    view.setUint8(entryOffset + 0, size === 256 ? 0 : size);  // Width  (0 = 256)
    view.setUint8(entryOffset + 1, size === 256 ? 0 : size);  // Height (0 = 256)
    view.setUint8(entryOffset + 2, 0);                         // Color palette count
    view.setUint8(entryOffset + 3, 0);                         // Reserved
    view.setUint16(entryOffset + 4, 1, true);                  // Color planes
    view.setUint16(entryOffset + 6, 32, true);                 // Bits per pixel
    view.setUint32(entryOffset + 8, pngSize, true);            // Image data size
    view.setUint32(entryOffset + 12, currentDataOffset, true); // Offset to image data

    // Copy PNG data
    bytes.set(new Uint8Array(pngBuffers[i]), currentDataOffset);
    currentDataOffset += pngSize;
  }

  return new Blob([ico], { type: 'image/x-icon' });
}
