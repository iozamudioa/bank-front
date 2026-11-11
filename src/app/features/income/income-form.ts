import { CurrencyPipe } from '@angular/common';
import { MoneyInput } from '../../shared/directives/money-input';
import { Icon } from '../../shared/components/icon/icon';
import { Component, input, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { IncomeSourceResponse } from '../../core/api/generated/models';
import { FinancialCommand } from '../movements/financial-command';
import { validAmount } from '../../shared/utils/money';
@Component({
  selector: 'app-income-form',
  imports: [CurrencyPipe, MoneyInput, Icon, ReactiveFormsModule],
  providers: [FinancialCommand],
  templateUrl: './income-form.html',
  styleUrl: './income-form.scss',
})
export class IncomeForm {
  readonly embedded = input(false);
  readonly correctionMode = input(false);
  readonly reviewAction = input<(() => void) | undefined>();
  readonly periodId = input('');
  readonly c = inject(FinancialCommand);
  readonly s = this.c.store;
  readonly sources = signal<IncomeSourceResponse[]>([]);
  constructor() {
    if (this.s.householdId())
      firstValueFrom(this.s.api.listIncomeSources(this.s.householdId()))
        .then((v) => this.sources.set(v))
        .catch(() => this.c.message.set('No se pudieron consultar las fuentes.'));
  }
  readonly form = inject(FormBuilder).nonNullable.group({
    accountId: ['', Validators.required],
    incomeSourceId: [''],
    amount: [
      '',
      [
        Validators.required,
        (c) => (validAmount(c.value, this.correctionMode()) ? null : { amount: true }),
      ],
    ],
    description: [''],
  });
  hasSelectedSource() {
    return this.sources().some((source) => source.id === this.form.controls.incomeSourceId.value);
  }
  review() {
    const reviewAction = this.reviewAction();
    if (reviewAction) {
      reviewAction();
      return;
    }
    if (
      this.form.invalid ||
      this.s.period()?.status !== 'OPEN' ||
      (this.periodId() && this.s.periodId() !== this.periodId())
    )
      return;
    const v = this.form.getRawValue();
    const id = this.s.householdId();
    const body = {
      ...v,
      incomeSourceId: v.incomeSourceId || null,
      amount: Number(v.amount),
      periodId: this.s.periodId(),
    };
    this.c.review((key) => this.s.api.registerIncome(id, body, key));
  }
}
