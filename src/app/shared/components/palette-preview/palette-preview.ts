import { Icon } from '../icon/icon';
import { Component, input, computed } from '@angular/core';
import { NgStyle } from '@angular/common';
import { ThemePalette } from '../../../core/theme/models/theme-palette.model';
import { EffectiveThemeMode } from '../../../core/theme/models/theme-mode.type';
import { tokenStyles } from '../../../core/theme/utils/apply-theme.util';
@Component({
  selector: 'app-palette-preview',
  imports: [Icon, NgStyle],
  templateUrl: './palette-preview.html',
  styleUrl: './palette-preview.scss',
})
export class PalettePreview {
  readonly palette = input.required<ThemePalette>();
  readonly mode = input.required<EffectiveThemeMode>();
  readonly styles = computed(() =>
    tokenStyles(this.mode() === 'dark' ? this.palette().darkTokens : this.palette().lightTokens),
  );
}
