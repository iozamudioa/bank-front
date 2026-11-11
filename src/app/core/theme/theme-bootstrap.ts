import { applyTheme } from './utils/apply-theme.util';
import { browserThemeStorage, readPreferences } from './utils/theme-preferences.util';
applyTheme(
  document,
  { ...readPreferences(browserThemeStorage()), mode: 'system' },
  window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false,
);
