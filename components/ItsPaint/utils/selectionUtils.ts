import { RGBAColor, SelectionBounds, SelectionData } from '../types/types';
import { colorDistance, getPixelColor } from './colorUtils';

/** Create an empty selection mask */
export function createEmptyMask(width: number, height: number): Uint8Array {
  return new Uint8Array(width * height);
}

/** Create a full (select-all) mask */
export function createFullMask(width: number, height: number): Uint8Array {
  const mask = new Uint8Array(width * height);
  mask.fill(255);
  return mask;
}

/** Invert a selection mask */
export function invertMask(mask: Uint8Array): Uint8Array {
  const result = new Uint8Array(mask.length);
  for (let i = 0; i < mask.length; i++) {
    result[i] = mask[i] === 0 ? 255 : 0;
  }
  return result;
}

/** Get bounding box of a selection mask */
export function getMaskBounds(mask: Uint8Array, width: number, height: number): SelectionBounds {
  let minX = width, minY = height, maxX = 0, maxY = 0;
  let hasSelection = false;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (mask[y * width + x] > 0) {
        hasSelection = true;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (!hasSelection) return { x: 0, y: 0, width: 0, height: 0 };
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

/** Create rectangular selection mask */
export function createRectSelection(
  canvasWidth: number,
  canvasHeight: number,
  x: number,
  y: number,
  w: number,
  h: number
): SelectionData {
  const mask = createEmptyMask(canvasWidth, canvasHeight);
  const sx = Math.max(0, Math.min(x, x + w));
  const sy = Math.max(0, Math.min(y, y + h));
  const ex = Math.min(canvasWidth, Math.max(x, x + w));
  const ey = Math.min(canvasHeight, Math.max(y, y + h));

  for (let py = sy; py < ey; py++) {
    for (let px = sx; px < ex; px++) {
      mask[py * canvasWidth + px] = 255;
    }
  }

  return { mask, bounds: { x: sx, y: sy, width: ex - sx, height: ey - sy } };
}

/** Create elliptical selection mask */
export function createEllipseSelection(
  canvasWidth: number,
  canvasHeight: number,
  cx: number,
  cy: number,
  rx: number,
  ry: number
): SelectionData {
  const mask = createEmptyMask(canvasWidth, canvasHeight);
  const absRx = Math.abs(rx);
  const absRy = Math.abs(ry);
  const left = Math.max(0, Math.floor(cx - absRx));
  const right = Math.min(canvasWidth - 1, Math.ceil(cx + absRx));
  const top = Math.max(0, Math.floor(cy - absRy));
  const bottom = Math.min(canvasHeight - 1, Math.ceil(cy + absRy));

  for (let py = top; py <= bottom; py++) {
    for (let px = left; px <= right; px++) {
      const dx = (px - cx) / absRx;
      const dy = (py - cy) / absRy;
      if (dx * dx + dy * dy <= 1) {
        mask[py * canvasWidth + px] = 255;
      }
    }
  }

  return { mask, bounds: getMaskBounds(mask, canvasWidth, canvasHeight) };
}

/** Create lasso (polygon) selection from a set of points */
export function createLassoSelection(
  canvasWidth: number,
  canvasHeight: number,
  points: Array<{ x: number; y: number }>
): SelectionData {
  const mask = createEmptyMask(canvasWidth, canvasHeight);
  if (points.length < 3) return { mask, bounds: { x: 0, y: 0, width: 0, height: 0 } };

  // Point-in-polygon using ray casting
  for (let y = 0; y < canvasHeight; y++) {
    for (let x = 0; x < canvasWidth; x++) {
      let inside = false;
      for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const xi = points[i].x, yi = points[i].y;
        const xj = points[j].x, yj = points[j].y;
        if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
          inside = !inside;
        }
      }
      if (inside) mask[y * canvasWidth + x] = 255;
    }
  }

  return { mask, bounds: getMaskBounds(mask, canvasWidth, canvasHeight) };
}

/** Magic Wand selection - flood fill based selection */
export function magicWandSelection(
  imageData: ImageData,
  startX: number,
  startY: number,
  tolerance: number,
  contiguous: boolean
): SelectionData {
  const { width, height } = imageData;
  const mask = createEmptyMask(width, height);
  const targetColor = getPixelColor(imageData, startX, startY);

  if (contiguous) {
    // Flood fill approach
    const stack: Array<[number, number]> = [[startX, startY]];
    const visited = new Uint8Array(width * height);

    while (stack.length > 0) {
      const [x, y] = stack.pop()!;
      const idx = y * width + x;

      if (x < 0 || x >= width || y < 0 || y >= height) continue;
      if (visited[idx]) continue;
      visited[idx] = 1;

      const pixelColor = getPixelColor(imageData, x, y);
      if (colorDistance(targetColor, pixelColor) <= tolerance) {
        mask[idx] = 255;
        stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
      }
    }
  } else {
    // Global selection - select all pixels matching within tolerance
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const pixelColor = getPixelColor(imageData, x, y);
        if (colorDistance(targetColor, pixelColor) <= tolerance) {
          mask[y * width + x] = 255;
        }
      }
    }
  }

  return { mask, bounds: getMaskBounds(mask, width, height) };
}

/** Flood fill pixels on a canvas with a color */
export function floodFill(
  imageData: ImageData,
  startX: number,
  startY: number,
  fillColor: RGBAColor,
  tolerance: number,
  selectionMask: Uint8Array | null
): ImageData {
  const { width, height } = imageData;
  const data = new Uint8ClampedArray(imageData.data);
  const result = new ImageData(data, width, height);
  const targetColor = getPixelColor(imageData, startX, startY);
  const visited = new Uint8Array(width * height);
  const stack: Array<[number, number]> = [[startX, startY]];

  while (stack.length > 0) {
    const [x, y] = stack.pop()!;
    const idx = y * width + x;

    if (x < 0 || x >= width || y < 0 || y >= height) continue;
    if (visited[idx]) continue;
    if (selectionMask && selectionMask[idx] === 0) continue;
    visited[idx] = 1;

    const pixelColor = getPixelColor(imageData, x, y);
    if (colorDistance(targetColor, pixelColor) <= tolerance) {
      const i = idx * 4;
      data[i] = fillColor.r;
      data[i + 1] = fillColor.g;
      data[i + 2] = fillColor.b;
      data[i + 3] = Math.round(fillColor.a * 255);
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
  }

  return result;
}

/** Apply selection mask to an operation (zero out pixels outside selection) */
export function applySelectionToImageData(imageData: ImageData, mask: Uint8Array): void {
  for (let i = 0; i < mask.length; i++) {
    if (mask[i] === 0) {
      const idx = i * 4;
      imageData.data[idx + 3] = 0;
    }
  }
}

/** Delete (clear to transparent) all selected pixels */
export function deleteSelection(
  canvas: HTMLCanvasElement,
  mask: Uint8Array
): void {
  const ctx = canvas.getContext('2d')!;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < mask.length; i++) {
    if (mask[i] > 0) {
      const idx = i * 4;
      imageData.data[idx] = 0;
      imageData.data[idx + 1] = 0;
      imageData.data[idx + 2] = 0;
      imageData.data[idx + 3] = 0;
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

/** Draw marching ants animation on a selection */
export function drawMarchingAnts(
  ctx: CanvasRenderingContext2D,
  mask: Uint8Array,
  width: number,
  height: number,
  offset: number,
  zoom: number
): void {
  // Build edge path from mask
  ctx.save();
  ctx.setLineDash([4 / zoom, 4 / zoom]);
  ctx.lineDashOffset = -offset;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1 / zoom;

  // Draw border pixels
  ctx.beginPath();
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (mask[y * width + x] === 0) continue;
      // Check if this pixel is on the edge of the selection
      const isEdge =
        x === 0 || y === 0 || x === width - 1 || y === height - 1 ||
        mask[y * width + (x - 1)] === 0 ||
        mask[y * width + (x + 1)] === 0 ||
        mask[(y - 1) * width + x] === 0 ||
        mask[(y + 1) * width + x] === 0;

      if (isEdge) {
        // Draw segments for each exposed edge
        if (x === 0 || mask[y * width + (x - 1)] === 0) {
          ctx.moveTo(x, y);
          ctx.lineTo(x, y + 1);
        }
        if (x === width - 1 || mask[y * width + (x + 1)] === 0) {
          ctx.moveTo(x + 1, y);
          ctx.lineTo(x + 1, y + 1);
        }
        if (y === 0 || mask[(y - 1) * width + x] === 0) {
          ctx.moveTo(x, y);
          ctx.lineTo(x + 1, y);
        }
        if (y === height - 1 || mask[(y + 1) * width + x] === 0) {
          ctx.moveTo(x, y + 1);
          ctx.lineTo(x + 1, y + 1);
        }
      }
    }
  }
  ctx.stroke();

  // Draw white offset pass
  ctx.lineDashOffset = -offset + 4 / zoom;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();

  ctx.restore();
}
