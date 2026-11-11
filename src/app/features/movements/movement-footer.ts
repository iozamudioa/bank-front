import { MovementAction } from './models/movement-action';
import { projectMovement } from './movement-projection';
import { Component, computed, effect, input, signal, untracked } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { Icon } from '../../shared/components/icon/icon';
import { MovementFormView } from './models/movement-form-view';
@Component({
  selector: 'app-movement-footer',
  imports: [CurrencyPipe, Icon],
  templateUrl: './movement-footer.html',
  styleUrl: './movement-footer.scss',
})
export class MovementFooter {
  readonly controller = input.required<MovementFormView>();
  readonly operation = input.required<MovementAction>();
  readonly label = input.required<string>();
  readonly requiresPeriod = input(true);
  readonly enabled = input(true);
  readonly projection = computed(() => {
    const active = this.controller();
    if (!active.c.reviewing()) return [];
    // Freeze the estimate at review, including during an uncertain retry.
    return untracked(() => {
      const s = active.c.store;
      return projectMovement(this.operation(), active.form.getRawValue(), {
        accounts: s.loading() || s.error() ? [] : s.accounts(),
        envelopes: s.loading() || s.error() ? [] : s.envelopes(),
        dashboard: s.loading() || s.error() ? null : s.dashboard(),
      });
    });
  });
  absolute(value: number) {
    return Math.abs(value);
  }
  private readonly invalid = signal(true);
  readonly reviewDisabled = computed(() => {
    const active = this.controller(),
      c = active.c;
    return (
      !this.enabled() ||
      this.invalid() ||
      c.busy() ||
      c.reviewing() ||
      !c.store.householdId() ||
      !c.connection.online() ||
      (this.requiresPeriod() && c.store.period()?.status !== 'OPEN')
    );
  });
  constructor() {
    effect((onCleanup) => {
      const form = this.controller().form;
      this.invalid.set(form.invalid);
      const subscription = form.statusChanges.subscribe(() => this.invalid.set(form.invalid));
      onCleanup(() => subscription.unsubscribe());
    });
  }
  review() {
    this.controller().form.markAllAsTouched();
    if (!this.reviewDisabled()) this.controller().review();
  }
  amount() {
    return Number(this.controller().form.getRawValue()['amount']);
  }
}
