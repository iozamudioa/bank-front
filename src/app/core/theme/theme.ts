import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal, DestroyRef } from '@angular/core';
import { THEME_PALETTES } from './catalog/theme-palettes.catalog';
import { ThemeMode, EffectiveThemeMode, THEME_MODES } from './models/theme-mode.type';
import { ThemeStorageService } from './services/theme-storage.service';
import { applyTheme } from './utils/apply-theme.util';
export type { ThemeMode } from './models/theme-mode.type';
@Injectable({ providedIn: 'root' })
export class Theme {
  private readonly document = inject(DOCUMENT);
  private readonly storage = inject(ThemeStorageService);
  private readonly preferencesState = signal({
    ...this.storage.read(),
    mode: 'system' as ThemeMode,
  });
  readonly preferences = this.preferencesState.asReadonly();
  readonly mode = computed(() => this.preferences().mode);
  readonly paletteId = computed(() => this.preferences().paletteId);
  readonly palettes = THEME_PALETTES;
  readonly palette = computed(
    () => THEME_PALETTES.find((p) => p.id === this.paletteId()) || THEME_PALETTES[0],
  );
  private readonly media = this.document.defaultView?.matchMedia?.('(prefers-color-scheme: dark)');
  private readonly systemDark = signal(this.media?.matches ?? false);
  readonly effectiveMode = computed<EffectiveThemeMode>(() => {
    const mode = this.mode();
    return mode === 'system' ? (this.systemDark() ? 'dark' : 'light') : mode;
  });
  readonly modeLabel = computed(
    () => THEME_MODES.find((option) => option.id === this.effectiveMode())!.label,
  );
  private readonly changed = (event: MediaQueryListEvent) => {
    this.systemDark.set(event.matches);
    this.update({ mode: 'system' });
  };
  constructor() {
    this.media?.addEventListener('change', this.changed);
    inject(DestroyRef).onDestroy(() => this.media?.removeEventListener('change', this.changed));
    this.apply();
  }
  setPalette(paletteId: string) {
    if (!THEME_PALETTES.some((p) => p.id === paletteId)) return;
    this.update({ paletteId });
  }
  setMode(mode: ThemeMode) {
    if (mode !== 'light' && mode !== 'dark' && mode !== 'system') return;
    this.update({ mode });
  }
  getAvailablePalettes() {
    return this.palettes;
  }
  cycle() {
    this.setMode(this.effectiveMode() === 'dark' ? 'light' : 'dark');
  }
  private update(value: Partial<{ paletteId: string; mode: ThemeMode }>) {
    this.preferencesState.update((p) => ({ ...p, ...value }));
    this.storage.write(this.preferences());
    this.apply();
  }
  private apply() {
    applyTheme(this.document, this.preferences(), this.systemDark());
  }
}
