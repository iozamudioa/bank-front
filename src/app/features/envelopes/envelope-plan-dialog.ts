import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import Decimal from 'decimal.js';
import { HouseholdStore } from '../../core/config/household-store';
import { Connectivity } from '../../core/config/connectivity';
import { ModalState } from '../../shared/dialogs/modal-state';
import { Icon } from '../../shared/components/icon/icon';
import { PeriodPlanFields } from './period-plan-fields';
import { periodPlanForm } from './period-plan-form';
import { PeriodPlanWriter, periodPlanError } from './period-plan-writer';
@Component({
  imports: [ReactiveFormsModule, PeriodPlanFields, Icon],
  templateUrl: './envelope-plan-dialog.html',
  styleUrl: './envelope-plan-dialog.scss',
})
export class EnvelopePlanDialog {
  readonly envelopeId = input.required<string>();
  readonly s = inject(HouseholdStore);
  readonly connection = inject(Connectivity);
  readonly modal = inject(ModalState);
  private readonly writer = inject(PeriodPlanWriter);
  readonly envelope = computed(() => this.s.envelopes().find((e) => e.id === this.envelopeId()));
  readonly form = periodPlanForm(true);
  readonly busy = signal(false);
  readonly error = signal('');
  private readonly periodId = toSignal(this.form.controls.periodId.valueChanges, {
    initialValue: '',
  });
  private initializedFor = '';
  constructor() {
    effect(() => {
      const id = this.periodId(),
        envelopeId = this.envelopeId();
      const period = this.s.periods().find((p) => p.id === id);
      const key = id + ':' + envelopeId;
      if (period && this.initializedFor !== key) {
        this.initializedFor = key;
        this.form.controls.amount.setValue(
          new Decimal(
            period.lines.find((line) => line.envelopeId === envelopeId)?.amount ?? 0,
          ).toFixed(2),
        );
      }
    });
  }
  async save() {
    this.form.markAllAsTouched();
    if (
      this.form.invalid ||
      this.busy() ||
      !this.connection.online() ||
      !this.s.householdId() ||
      !this.envelope()?.active
    )
      return;
    const householdId = this.s.householdId(),
      envelopeId = this.envelopeId(),
      value = this.form.getRawValue();
    this.busy.set(true);
    this.modal.busy.set(true);
    this.error.set('');
    try {
      await this.writer.save(householdId, value.periodId, envelopeId, value.amount);
      await this.s.refresh();
      this.s.periodId.set(value.periodId);
      this.modal.complete('Plan de quincena guardado correctamente.');
    } catch (error) {
      this.error.set(periodPlanError(error));
    } finally {
      this.busy.set(false);
      this.modal.busy.set(false);
    }
  }
}
