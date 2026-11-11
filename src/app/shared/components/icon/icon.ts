import { Component, input } from '@angular/core';
import { IconName } from '../../../core/icons/icon-names';
export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'hero';
@Component({
  selector: 'app-icon',
  templateUrl: './icon.html',
  styleUrl: './icon.scss',
  host: { 'aria-hidden': 'true', '[attr.data-size]': 'size()', '[class.filled]': 'filled()' },
})
export class Icon {
  readonly name = input.required<IconName>();
  readonly size = input<IconSize>('md');
  readonly filled = input(false);
}
