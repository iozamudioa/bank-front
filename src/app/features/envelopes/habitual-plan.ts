import { Component, effect, inject, input, signal, untracked } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import Decimal from 'decimal.js';
import { HouseholdStore } from '../../core/config/household-store';
import { Connectivity } from '../../core/config/connectivity';
import { ModalState } from '../../shared/dialogs/modal-state';
import { MoneyInput } from '../../shared/directives/money-input';
import { validAmount } from '../../shared/utils/money';
import { errorMessage } from '../../core/errors/message';
@Component({ imports: [ReactiveFormsModule, MoneyInput], templateUrl: './habitual-plan.html' })
export class HabitualPlan {
  readonly envelopeId = input.required<string>();
  readonly s = inject(HouseholdStore);
  readonly modal = inject(ModalState);
  readonly connection = inject(Connectivity);
  readonly amount = new FormControl('', {
    nonNullable: true,
    validators: [
      Validators.required,
      (c) => (validAmount(c.value, true) ? null : { amount: true }),
    ],
  });
  readonly busy = signal(false);
  readonly error = signal('');
  private initialized = false;
  constructor() {
    effect(() => {
      const envelope = this.s.envelopes().find((e) => e.id === this.envelopeId());
      if (envelope && !this.initialized) {
        this.initialized = true;
        untracked(() =>
          this.amount.setValue(
            envelope.habitualAmount == null ? '' : new Decimal(envelope.habitualAmount).toFixed(2),
          ),
        );
      }
    });
  }
  async save() {
    this.amount.markAsTouched();
    if (this.amount.invalid || this.busy() || !this.connection.online()) return;
    this.busy.set(true);
    this.modal.busy.set(true);
    this.error.set('');
    try {
      await firstValueFrom(
        this.s.api.upsertTemplateBudgetLine(this.s.householdId(), this.envelopeId(), {
          amount: Number(this.amount.value),
        }),
      );
      await this.s.refresh();
      this.modal.complete('Plan habitual guardado correctamente.');
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.busy.set(false);
      this.modal.busy.set(false);
    }
  }
}
