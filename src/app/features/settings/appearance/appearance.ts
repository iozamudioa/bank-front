import { Component, inject } from '@angular/core';
import { Theme } from '../../../core/theme/theme';
import { PaletteSelector } from '../../../shared/components/palette-selector/palette-selector';
import { ThemeModeSelector } from '../../../shared/components/theme-mode-selector/theme-mode-selector';
@Component({
  selector: 'app-appearance',
  imports: [PaletteSelector, ThemeModeSelector],
  templateUrl: './appearance.html',
  styleUrl: './appearance.scss',
})
export class Appearance {
  readonly theme = inject(Theme);
}
