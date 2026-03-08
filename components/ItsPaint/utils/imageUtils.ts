export type ExportFormat = 'png' | 'jpeg' | 'webp' | 'ico' | 'bmp';

const MIME: Record<ExportFormat, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  ico: 'image/x-icon',
  bmp: 'image/bmp',
};

const EXT: Record<ExportFormat, string> = {
  png: 'png',
  jpeg: 'jpg',
  webp: 'webp',
  ico: 'ico',
  bmp: 'bmp',
};

/** Export canvas as data URL */
export function canvasToDataURL(canvas: HTMLCanvasElement, format: ExportFormat = 'png', quality = 0.92): string {
  return canvas.toDataURL(MIME[format] ?? `image/${format}`, quality);
}

/** Export canvas as Blob for downloading */
export function canvasToBlob(canvas: HTMLCanvasElement, format: ExportFormat = 'png', quality = 0.92): Promise<Blob> {
  // ICO requires special binary encoding
  if (format === 'ico') return createIcoBlob(canvas);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to create blob'));
      },
      MIME[format] ?? `image/${format}`,
      quality
    );
  });
}

/** Resize canvas to a square of the given size and return PNG blob bytes */
function resizeToPng(canvas: HTMLCanvasElement, size: number): Promise<Uint8Array> {
  const tmp = document.createElement('canvas');
  tmp.width = size;
  tmp.height = size;
  tmp.getContext('2d')!.drawImage(canvas, 0, 0, size, size);
  return new Promise((resolve, reject) => {
    tmp.toBlob(
      (blob) => {
        if (!blob) { reject(new Error('Failed to create PNG')); return; }
        blob.arrayBuffer().then((buf) => resolve(new Uint8Array(buf)));
      },
      'image/png'
    );
  });
}

/** Build a multi-size ICO file (16×16, 32×32, 48×48, 256×256) */
function createIcoBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  const sizes = [16, 32, 48, 256];
  return Promise.all(sizes.map((s) => resizeToPng(canvas, s))).then((pngDataArr) => {
    const count = pngDataArr.length;
    const headerSize = 6;
    const entrySize = 16;
    const dirSize = headerSize + entrySize * count;
    const totalPng = pngDataArr.reduce((sum, d) => sum + d.length, 0);
    const ico = new ArrayBuffer(dirSize + totalPng);
    const view = new DataView(ico);

    // ICO header
    view.setUint16(0, 0, true);        // reserved
    view.setUint16(2, 1, true);        // type: ICO
    view.setUint16(4, count, true);    // number of images

    let dataOffset = dirSize;
    for (let i = 0; i < count; i++) {
      const s = sizes[i];
      const pngData = pngDataArr[i];
      const off = headerSize + entrySize * i;
      view.setUint8(off, s >= 256 ? 0 : s);      // width
      view.setUint8(off + 1, s >= 256 ? 0 : s);  // height
      view.setUint8(off + 2, 0);                  // palette
      view.setUint8(off + 3, 0);                  // reserved
      view.setUint16(off + 4, 1, true);           // color planes
      view.setUint16(off + 6, 32, true);          // bits per pixel
      view.setUint32(off + 8, pngData.length, true);  // data size
      view.setUint32(off + 12, dataOffset, true);     // data offset
      new Uint8Array(ico, dataOffset).set(pngData);
      dataOffset += pngData.length;
    }

    return new Blob([ico], { type: 'image/x-icon' });
  });
}

/** Download a canvas as an image file */
export async function downloadCanvas(
  canvas: HTMLCanvasElement,
  fileName: string,
  format: ExportFormat = 'png'
): Promise<void> {
  const blob = await canvasToBlob(canvas, format);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fileName}.${EXT[format] ?? format}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Load an image from a File object onto a canvas */
export function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}

/** Load image from clipboard */
export async function loadImageFromClipboard(): Promise<HTMLImageElement | null> {
  try {
    const items = await navigator.clipboard.read();
    for (const item of items) {
      for (const type of item.types) {
        if (type.startsWith('image/')) {
          const blob = await item.getType(type);
          const url = URL.createObjectURL(blob);
          return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
              URL.revokeObjectURL(url);
              resolve(img);
            };
            img.onerror = () => {
              URL.revokeObjectURL(url);
              resolve(null);
            };
            img.src = url;
          });
        }
      }
    }
  } catch {
    // Clipboard API not available or denied
  }
  return null;
}

/** Copy canvas content to clipboard */
export async function copyCanvasToClipboard(canvas: HTMLCanvasElement): Promise<boolean> {
  try {
    const blob = await canvasToBlob(canvas, 'png');
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob }),
    ]);
    return true;
  } catch {
    return false;
  }
}
