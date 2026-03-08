import { STORAGE_KEYS } from '../lib/constants';
import { RGBAColor } from '../types/types';

/** Save palette to localStorage */
export function savePalette(palette: RGBAColor[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.palette, JSON.stringify(palette));
  } catch { /* quota exceeded or unavailable */ }
}

/** Load palette from localStorage */
export function loadPalette(): RGBAColor[] | null {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.palette);
    if (data) return JSON.parse(data);
  } catch { /* parse error */ }
  return null;
}

export interface UserPreferences {
  defaultWidth: number;
  defaultHeight: number;
  showGrid: boolean;
  theme: 'dark' | 'light';
}

const DEFAULT_PREFS: UserPreferences = {
  defaultWidth: 800,
  defaultHeight: 600,
  showGrid: false,
  theme: 'dark',
};

/** Save user preferences */
export function savePreferences(prefs: Partial<UserPreferences>): void {
  try {
    const existing = loadPreferences();
    localStorage.setItem(STORAGE_KEYS.preferences, JSON.stringify({ ...existing, ...prefs }));
  } catch { /* storage unavailable */ }
}

/** Load user preferences */
export function loadPreferences(): UserPreferences {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.preferences);
    if (data) return { ...DEFAULT_PREFS, ...JSON.parse(data) };
  } catch { /* parse error */ }
  return { ...DEFAULT_PREFS };
}

/** Autosave canvas data as base64 for crash recovery */
export function autosaveCanvas(dataUrl: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.autosave, dataUrl);
  } catch { /* quota exceeded */ }
}

/** Load autosaved canvas data */
export function loadAutosave(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.autosave);
  } catch { /* unavailable */ }
  return null;
}

/** Clear autosave */
export function clearAutosave(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.autosave);
  } catch { /* unavailable */ }
}
