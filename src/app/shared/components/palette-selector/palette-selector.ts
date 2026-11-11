import { Icon } from '../icon/icon';
import { Component, input, output } from '@angular/core';
import { ThemePalette } from '../../../core/theme/models/theme-palette.model';
import { EffectiveThemeMode } from '../../../core/theme/models/theme-mode.type';
import { PalettePreview } from '../palette-preview/palette-preview';
@Component({
  selector: 'app-palette-selector',
  imports: [Icon, PalettePreview],
  templateUrl: './palette-selector.html',
  styleUrl: './palette-selector.scss',
})
export class PaletteSelector {
  readonly palettes = input.required<readonly ThemePalette[]>();
  readonly selectedId = input.required<string>();
  readonly mode = input.required<EffectiveThemeMode>();
  readonly selected = output<string>();
}
