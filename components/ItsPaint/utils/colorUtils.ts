import { HSLColor, RGBAColor } from '../types/types';

export function rgbaToHex(c: RGBAColor): string {
  const r = c.r.toString(16).padStart(2, '0');
  const g = c.g.toString(16).padStart(2, '0');
  const b = c.b.toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}

export function hexToRgba(hex: string, alpha = 1): RGBAColor {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
    a: alpha,
  };
}

export function rgbaToString(c: RGBAColor): string {
  return `rgba(${c.r},${c.g},${c.b},${c.a})`;
}

export function rgbaToHsl(c: RGBAColor): HSLColor {
  const r = c.r / 255;
  const g = c.g / 255;
  const b = c.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }

  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export function hslToRgba(c: HSLColor, a = 1): RGBAColor {
  const s = c.s / 100;
  const l = c.l / 100;
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const h = c.h / 360;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255), a };
}

export function colorDistance(a: RGBAColor, b: RGBAColor): number {
  return Math.sqrt(
    (a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2 + ((a.a - b.a) * 255) ** 2
  );
}

export function colorsEqual(a: RGBAColor, b: RGBAColor): boolean {
  return a.r === b.r && a.g === b.g && a.b === b.b && a.a === b.a;
}

export function blendColors(base: RGBAColor, top: RGBAColor, opacity: number): RGBAColor {
  const a = top.a * opacity;
  const invA = 1 - a;
  return {
    r: Math.round(top.r * a + base.r * invA),
    g: Math.round(top.g * a + base.g * invA),
    b: Math.round(top.b * a + base.b * invA),
    a: Math.min(1, a + base.a * invA),
  };
}

/** Get pixel color at (x, y) from ImageData */
export function getPixelColor(data: ImageData, x: number, y: number): RGBAColor {
  const i = (y * data.width + x) * 4;
  return {
    r: data.data[i],
    g: data.data[i + 1],
    b: data.data[i + 2],
    a: data.data[i + 3] / 255,
  };
}

/** Set pixel color at (x,y) in ImageData */
export function setPixelColor(data: ImageData, x: number, y: number, c: RGBAColor): void {
  const i = (y * data.width + x) * 4;
  data.data[i] = c.r;
  data.data[i + 1] = c.g;
  data.data[i + 2] = c.b;
  data.data[i + 3] = Math.round(c.a * 255);
}
