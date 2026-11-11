import { CurrencyPipe } from '@angular/common';
import { MoneyInput } from '../../shared/directives/money-input';
import { Icon } from '../../shared/components/icon/icon';
import { Component, input, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';

import { FinancialCommand } from '../movements/financial-command';
import { validAmount } from '../../shared/utils/money';
@Component({
  selector: 'app-envelope-transfer-form',
  imports: [CurrencyPipe, MoneyInput, Icon, ReactiveFormsModule],
  providers: [FinancialCommand],
  templateUrl: './envelope-transfer-form.html',
  styleUrl: './envelope-transfer-form.scss',
})
export class EnvelopeTransferForm {
  readonly embedded = input(false);
  readonly correctionMode = input(false);
  readonly reviewAction = input<(() => void) | undefined>();
  readonly c = inject(FinancialCommand);
  readonly s = this.c.store;

  readonly form = inject(FormBuilder).nonNullable.group({
    fromEnvelopeId: ['', Validators.required],
    toEnvelopeId: ['', Validators.required],
    amount: [
      '',
      [
        Validators.required,
        (c) => (validAmount(c.value, this.correctionMode()) ? null : { amount: true }),
      ],
    ],
    description: [''],
  });
  review() {
    const reviewAction = this.reviewAction();
    if (reviewAction) {
      reviewAction();
      return;
    }
    if (this.form.invalid || this.s.period()?.status !== 'OPEN') return;
    const v = this.form.getRawValue();
    if (v.fromEnvelopeId === v.toEnvelopeId) {
      this.c.message.set('Selecciona un origen y destino diferentes.');
      return;
    }
    const id = this.s.householdId();
    const body = { ...v, amount: Number(v.amount), periodId: this.s.periodId() };
    this.c.review((key) => this.s.api.transferEnvelopes(id, body, key));
  }
}
