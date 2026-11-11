import {
  Component,
  effect,
  ElementRef,
  HostListener,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Icon } from '../icon/icon';
import { ModalService } from '../../dialogs/modal.service';
import { OperationSafety } from '../../../core/config/operation-safety';
import { HouseholdStore } from '../../../core/config/household-store';

@Component({
  selector: 'app-mobile-quick-actions',
  imports: [Icon],
  templateUrl: './mobile-quick-actions.html',
  styleUrl: './mobile-quick-actions.scss',
})
export class MobileQuickActions {
  readonly modals = inject(ModalService);
  readonly safety = inject(OperationSafety);
  readonly store = inject(HouseholdStore);
  readonly expanded = signal(false);
  private readonly toggle = viewChild<ElementRef<HTMLButtonElement>>('toggle');
  constructor() {
    effect(() => {
      if (this.safety.modalOpen() || this.safety.locked()) this.expanded.set(false);
    });
  }
  close() {
    this.expanded.set(false);
    this.toggle()?.nativeElement.focus();
  }
  @HostListener('document:keydown.escape')
  escape() {
    if (this.expanded()) this.close();
  }
  open(action: 'movement' | 'expense') {
    if (this.safety.modalOpen() || this.safety.locked() || !this.store.householdId()) return;
    this.close();
    void this.modals[action]();
  }
}
