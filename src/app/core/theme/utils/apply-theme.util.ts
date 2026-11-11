import { THEME_PALETTES } from '../catalog/theme-palettes.catalog';
import { ThemePreferences } from '../models/theme-preferences.model';
import { ThemeTokens } from '../models/theme-palette.model';
import { EffectiveThemeMode } from '../models/theme-mode.type';
export function tokenStyles(tokens: ThemeTokens): Record<string, string> {
  return Object.fromEntries(Object.entries(tokens).map(([key, value]) => ['--bank-' + key, value]));
}
export function applyTheme(
  document: Document,
  preferences: ThemePreferences,
  systemDark: boolean,
): EffectiveThemeMode {
  const mode = preferences.mode === 'system' ? (systemDark ? 'dark' : 'light') : preferences.mode;
  const palette = THEME_PALETTES.find((p) => p.id === preferences.paletteId) || THEME_PALETTES[0];
  const tokens = mode === 'dark' ? palette.darkTokens : palette.lightTokens;
  const root = document.documentElement;
  root.dataset['theme'] = mode;
  root.dataset['palette'] = palette.id;
  root.style.colorScheme = mode;
  for (const [key, value] of Object.entries(tokenStyles(tokens)))
    root.style.setProperty(key, value);
  let browserColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!browserColor) {
    browserColor = document.createElement('meta');
    browserColor.name = 'theme-color';
    document.head.append(browserColor);
  }
  browserColor.content = tokens.surface;
  return mode;
}
