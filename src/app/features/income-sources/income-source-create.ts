import { Icon } from '../../shared/components/icon/icon';
import { ModalState } from '../../shared/dialogs/modal-state';
import { Component, inject, signal } from '@angular/core';

import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { HouseholdStore } from '../../core/config/household-store';

import { errorMessage } from '../../core/errors/message';
import { validAmount } from '../../shared/utils/money';
@Component({
  imports: [Icon, ReactiveFormsModule],
  templateUrl: './income-source-create.html',
  styleUrl: './income-source-create.scss',
})
export class IncomeSourceCreate {
  readonly modal = inject(ModalState, { optional: true });
  readonly s = inject(HouseholdStore);
  readonly error = signal('');
  readonly busy = signal(false);
  readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', Validators.required],
    accountId: ['', Validators.required],
    type: ['PAYROLL' as 'PAYROLL' | 'TRANSFER' | 'TANDA' | 'OTHER'],
    expectedAmount: [
      '',
      [(c: AbstractControl) => (!c.value || validAmount(c.value, true) ? null : { amount: true })],
    ],
  });
  async create() {
    if (this.form.invalid || this.busy() || !this.s.householdId()) return;
    this.modal?.busy.set(true);
    this.busy.set(true);
    const v = this.form.getRawValue();
    try {
      await firstValueFrom(
        this.s.api.createIncomeSource(this.s.householdId(), {
          ...v,
          expectedAmount: v.expectedAmount ? Number(v.expectedAmount) : null,
        }),
      );
      this.form.reset();
      this.s.revision.update((v) => v + 1);
      this.modal?.complete('Fuente de ingreso creada correctamente.');
    } catch (e) {
      this.error.set(errorMessage(e));
    } finally {
      this.modal?.busy.set(false);
      this.busy.set(false);
    }
  }
}
