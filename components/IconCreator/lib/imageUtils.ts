/**
 * IconCreator — Image utility functions
 *
 * Canvas helpers for loading, exporting, and downloading images.
 */

// ─── Image Loading ───────────────────────────────────────────────────────────

/**
 * Read a File as a data URL string.
 */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Load a data URL into an HTMLImageElement.
 */
export function loadImageElement(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to decode image'));
    img.src = dataUrl;
  });
}

// ─── Canvas Exports ──────────────────────────────────────────────────────────

/**
 * Export a canvas to a PNG Blob.
 */
export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error('Canvas export failed'));
        resolve(blob);
      },
      'image/png',
    );
  });
}

// ─── Download Helpers ────────────────────────────────────────────────────────

/**
 * Trigger a browser download for a Blob.
 */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();

  // Cleanup
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

/**
 * Strip the file extension and return just the name.
 */
export function stripExtension(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, '');
}
