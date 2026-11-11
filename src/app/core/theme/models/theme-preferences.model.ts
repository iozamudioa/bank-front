import { ThemeMode } from './theme-mode.type';
export interface ThemePreferences {
  readonly paletteId: string;
  readonly mode: ThemeMode;
}
export const THEME_STORAGE_KEY = 'bank.theme.preferences.v1';
export const DEFAULT_THEME_PREFERENCES: ThemePreferences = { paletteId: 'calcite', mode: 'system' };
