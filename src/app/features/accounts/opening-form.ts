import { CurrencyPipe } from '@angular/common';
import { MoneyInput } from '../../shared/directives/money-input';
import { Icon } from '../../shared/components/icon/icon';
import { Component, input, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';

import { FinancialCommand } from '../movements/financial-command';
import { validAmount } from '../../shared/utils/money';
@Component({
  selector: 'app-opening-form',
  imports: [CurrencyPipe, MoneyInput, Icon, ReactiveFormsModule],
  providers: [FinancialCommand],
  templateUrl: './opening-form.html',
  styleUrl: './opening-form.scss',
})
export class OpeningForm {
  readonly embedded = input(false);
  readonly c = inject(FinancialCommand);
  readonly s = this.c.store;

  readonly form = inject(FormBuilder).nonNullable.group({
    accountId: ['', Validators.required],
    amount: ['', [Validators.required, (c) => (validAmount(c.value) ? null : { amount: true })]],
    description: [''],
  });
  review() {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    const id = this.s.householdId();
    const body = { ...v, amount: Number(v.amount) };
    this.c.review((key) => this.s.api.registerOpeningBalance(id, body, key));
  }
}
