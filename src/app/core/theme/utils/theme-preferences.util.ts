import { THEME_PALETTES } from '../catalog/theme-palettes.catalog';
import {
  ThemePreferences,
  DEFAULT_THEME_PREFERENCES,
  THEME_STORAGE_KEY,
} from '../models/theme-preferences.model';
export interface ThemeStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
export function normalizePreferences(value: unknown): ThemePreferences {
  if (!value || typeof value !== 'object') return { ...DEFAULT_THEME_PREFERENCES };
  const candidate = value as Record<string, unknown>;
  return {
    paletteId: THEME_PALETTES.some((p) => p.id === candidate['paletteId'])
      ? String(candidate['paletteId'])
      : DEFAULT_THEME_PREFERENCES.paletteId,
    mode:
      candidate['mode'] === 'light' ||
      candidate['mode'] === 'dark' ||
      candidate['mode'] === 'system'
        ? candidate['mode']
        : DEFAULT_THEME_PREFERENCES.mode,
  };
}
export function readPreferences(storage: ThemeStorage | null): ThemePreferences {
  try {
    const raw = storage?.getItem(THEME_STORAGE_KEY);
    if (raw) return normalizePreferences(JSON.parse(raw));
    const legacy = storage?.getItem('bank-theme');
    return normalizePreferences({
      paletteId: DEFAULT_THEME_PREFERENCES.paletteId,
      mode: legacy === 'auto' ? 'system' : legacy,
    });
  } catch {
    return { ...DEFAULT_THEME_PREFERENCES };
  }
}
export function writePreferences(
  storage: ThemeStorage | null,
  preferences: ThemePreferences,
): void {
  try {
    storage?.setItem(THEME_STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    /* Appearance still works when storage is blocked. */
  }
}
export function browserThemeStorage(): ThemeStorage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
