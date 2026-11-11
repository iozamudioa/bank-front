import { Icon } from '../icon/icon';
import { Component, input, output } from '@angular/core';
import { ThemeMode, THEME_MODES } from '../../../core/theme/models/theme-mode.type';
@Component({
  imports: [Icon],
  selector: 'app-theme-mode-selector',
  templateUrl: './theme-mode-selector.html',
  styleUrl: './theme-mode-selector.scss',
})
export class ThemeModeSelector {
  readonly mode = input.required<ThemeMode>();
  readonly selected = output<ThemeMode>();
  readonly modes = THEME_MODES;
}
