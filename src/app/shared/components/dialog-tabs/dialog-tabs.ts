import {
  Component,
  ElementRef,
  effect,
  input,
  output,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';
import { Icon } from '../icon/icon';
import { IconName } from '../../../core/icons/icon-names';

export interface DialogTab<T extends string> {
  readonly id: T;
  readonly label: string;
  readonly icon: IconName;
}

@Component({
  selector: 'app-dialog-tabs',
  imports: [Icon],
  templateUrl: './dialog-tabs.html',
  styleUrl: './dialog-tabs.scss',
})
export class DialogTabs<T extends string> {
  readonly items = input.required<readonly DialogTab<T>[]>();
  readonly selected = input.required<T>();
  readonly disabled = input(false);
  readonly idPrefix = input('movement');
  readonly label = input('Tipo de movimiento');
  readonly selectedChange = output<T>();
  readonly canScrollBack = signal(false);
  readonly canScrollForward = signal(false);
  private readonly viewport = viewChild<ElementRef<HTMLElement>>('tabsViewport');
  private readonly tabs = viewChildren<ElementRef<HTMLButtonElement>>('actionTab');

  constructor() {
    effect((onCleanup) => {
      const viewport = this.viewport()?.nativeElement;
      const tabs = this.tabs();
      if (!viewport) return;
      const measure = () => {
        this.revealSelected();
        this.updateScroll();
      };
      const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
      observer?.observe(viewport);
      tabs.forEach((tab) => observer?.observe(tab.nativeElement));
      window.addEventListener('resize', measure);
      measure();
      onCleanup(() => {
        observer?.disconnect();
        window.removeEventListener('resize', measure);
      });
    });
  }
  private revealSelected() {
    const viewport = this.viewport()?.nativeElement;
    const tab = this.tabs().find(
      (tab) => tab.nativeElement.id === this.idPrefix() + '-tab-' + this.selected(),
    )?.nativeElement;
    if (!viewport || !tab) return;
    const bounds = viewport.getBoundingClientRect(),
      active = tab.getBoundingClientRect();
    // Scroll only the tab strip, never the dialog or page.
    if (active.left < bounds.left) viewport.scrollLeft += active.left - bounds.left;
    else if (active.right > bounds.right) viewport.scrollLeft += active.right - bounds.right;
  }
  updateScroll() {
    const viewport = this.viewport()?.nativeElement;
    if (!viewport) return;
    this.canScrollBack.set(viewport.scrollLeft > 1);
    this.canScrollForward.set(
      viewport.scrollWidth - viewport.clientWidth - viewport.scrollLeft > 1,
    );
  }
  scroll(direction: -1 | 1) {
    const viewport = this.viewport()?.nativeElement;
    if (!viewport) return;
    viewport.scrollBy({
      left: direction * Math.max(160, viewport.clientWidth * 0.75),
      behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
    });
  }
  select(id: T) {
    if (!this.disabled()) this.selectedChange.emit(id);
  }
  onKey(event: KeyboardEvent, index: number) {
    const items = this.items();
    let next: number;
    switch (event.key) {
      case 'ArrowRight':
        next = (index + 1) % items.length;
        break;
      case 'ArrowLeft':
        next = (index - 1 + items.length) % items.length;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = items.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    if (this.disabled()) return;
    this.select(items[next].id);
    this.tabs()[next]?.nativeElement.focus();
  }
}
