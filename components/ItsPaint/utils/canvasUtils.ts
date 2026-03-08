import { CHECKER_SIZE } from '../lib/constants';

/** Create an offscreen canvas with given dimensions */
export function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

/** Copy contents of one canvas to another */
export function copyCanvas(source: HTMLCanvasElement, target: HTMLCanvasElement): void {
  target.width = source.width;
  target.height = source.height;
  const ctx = target.getContext('2d')!;
  ctx.clearRect(0, 0, target.width, target.height);
  ctx.drawImage(source, 0, 0);
}

/** Clone a canvas completely */
export function cloneCanvas(source: HTMLCanvasElement): HTMLCanvasElement {
  const clone = createCanvas(source.width, source.height);
  clone.getContext('2d')!.drawImage(source, 0, 0);
  return clone;
}

/** Get ImageData from a canvas */
export function getImageData(canvas: HTMLCanvasElement): ImageData {
  return canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height);
}

/** Put ImageData onto a canvas */
export function putImageData(canvas: HTMLCanvasElement, data: ImageData): void {
  canvas.width = data.width;
  canvas.height = data.height;
  canvas.getContext('2d')!.putImageData(data, 0, 0);
}

/** Clear a canvas to fully transparent */
export function clearCanvas(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

/** Fill a canvas with a solid color */
export function fillCanvas(canvas: HTMLCanvasElement, color: string): void {
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

/** Draw the transparency checkerboard pattern */
export function drawCheckerboard(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  zoom: number
): void {
  const size = CHECKER_SIZE;
  const cols = Math.ceil(width / size);
  const rows = Math.ceil(height / size);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      ctx.fillStyle = (row + col) % 2 === 0 ? '#ffffff' : '#cccccc';
      ctx.fillRect(col * size, row * size, size, size);
    }
  }
}

/** Resize canvas content (nearest-neighbor for pixel art, or smooth) */
export function resizeCanvas(
  source: HTMLCanvasElement,
  newWidth: number,
  newHeight: number,
  smooth = true
): HTMLCanvasElement {
  const result = createCanvas(newWidth, newHeight);
  const ctx = result.getContext('2d')!;
  ctx.imageSmoothingEnabled = smooth;
  ctx.drawImage(source, 0, 0, newWidth, newHeight);
  return result;
}

/** Crop a canvas to given bounds */
export function cropCanvas(
  source: HTMLCanvasElement,
  x: number,
  y: number,
  w: number,
  h: number
): HTMLCanvasElement {
  const result = createCanvas(w, h);
  const ctx = result.getContext('2d')!;
  ctx.drawImage(source, x, y, w, h, 0, 0, w, h);
  return result;
}

/** Rotate canvas by 90, 180, or 270 degrees */
export function rotateCanvas(source: HTMLCanvasElement, degrees: 90 | 180 | 270): HTMLCanvasElement {
  const sw = source.width;
  const sh = source.height;
  const isOrthogonal = degrees === 90 || degrees === 270;
  const dw = isOrthogonal ? sh : sw;
  const dh = isOrthogonal ? sw : sh;
  const result = createCanvas(dw, dh);
  const ctx = result.getContext('2d')!;
  ctx.translate(dw / 2, dh / 2);
  ctx.rotate((degrees * Math.PI) / 180);
  ctx.drawImage(source, -sw / 2, -sh / 2);
  return result;
}

/** Flip canvas horizontally or vertically */
export function flipCanvas(
  source: HTMLCanvasElement,
  direction: 'horizontal' | 'vertical'
): HTMLCanvasElement {
  const result = createCanvas(source.width, source.height);
  const ctx = result.getContext('2d')!;
  if (direction === 'horizontal') {
    ctx.translate(source.width, 0);
    ctx.scale(-1, 1);
  } else {
    ctx.translate(0, source.height);
    ctx.scale(1, -1);
  }
  ctx.drawImage(source, 0, 0);
  return result;
}

/** Draw a brush stamp at (x, y) on context */
export function drawBrushStamp(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  hardness: number,
  color: string,
  compositeOp: GlobalCompositeOperation = 'source-over'
): void {
  ctx.save();
  ctx.globalCompositeOperation = compositeOp;

  if (hardness >= 95) {
    // Hard brush
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, size / 2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Soft brush with radial gradient
    const radius = size / 2;
    const innerRadius = radius * (hardness / 100);
    const gradient = ctx.createRadialGradient(x, y, innerRadius, x, y, radius);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(x - radius, y - radius, size, size);
  }

  ctx.restore();
}

/** Interpolate points between two positions for smooth brush strokes */
export function interpolatePoints(
  x0: number, y0: number,
  x1: number, y1: number,
  spacing: number
): Array<{ x: number; y: number }> {
  const points: Array<{ x: number; y: number }> = [];
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const steps = Math.max(1, Math.floor(dist / spacing));

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    points.push({ x: x0 + dx * t, y: y0 + dy * t });
  }

  return points;
}

/** Composite multiple layer canvases into a single output canvas */
export function compositeLayers(
  layers: Array<{
    canvas: HTMLCanvasElement;
    visible: boolean;
    opacity: number;
    blendMode: string;
  }>,
  outputCtx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  outputCtx.clearRect(0, 0, width, height);

  for (const layer of layers) {
    if (!layer.visible || layer.opacity <= 0) continue;

    outputCtx.save();
    outputCtx.globalAlpha = layer.opacity;
    outputCtx.globalCompositeOperation = layer.blendMode as GlobalCompositeOperation;
    outputCtx.drawImage(layer.canvas, 0, 0);
    outputCtx.restore();
  }
}
