import type { IconName } from '../../icons/icon-names';
export type ThemeMode = 'light' | 'dark' | 'system';
export type EffectiveThemeMode = Exclude<ThemeMode, 'system'>;
export const THEME_MODES: readonly { id: ThemeMode; label: string; icon: IconName }[] = [
  { id: 'light', label: 'Claro', icon: 'light_mode' },
  { id: 'dark', label: 'Oscuro', icon: 'dark_mode' },
];
