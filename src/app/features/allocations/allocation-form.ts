import { MoneyInput } from '../../shared/directives/money-input';
import { CurrencyPipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { Icon } from '../../shared/components/icon/icon';
import { Component, input, inject, computed, effect, untracked } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';

import { FinancialCommand } from '../movements/financial-command';
import { validAmount } from '../../shared/utils/money';
import Decimal from 'decimal.js';
@Component({
  selector: 'app-allocation-form',
  imports: [MoneyInput, Icon, ReactiveFormsModule, CurrencyPipe],
  providers: [FinancialCommand],
  templateUrl: './allocation-form.html',
  styleUrl: './allocation-form.scss',
})
export class AllocationForm {
  readonly embedded = input(false);
  readonly correctionMode = input(false);
  readonly prefillPlan = input(true);
  readonly reviewAction = input<(() => void) | undefined>();
  readonly periodId = input('');
  readonly fixedEnvelopeId = input('');
  private planContext = '';
  private planInitialized = false;
  constructor() {
    effect(() => {
      const id = this.fixedEnvelopeId();
      if (!id) return;
      const periodId = this.periodId() || this.s.periodId();
      const period = this.s.periods().find((period) => period.id === periodId);
      const loading = this.s.loading();
      const pending = this.c.reviewing() || this.c.busy();
      untracked(() => {
        const context = periodId + ':' + id;
        if (this.planContext !== context) {
          if (this.planContext) this.form.controls.amount.reset('');
          this.planContext = context;
          this.planInitialized = false;
        }
        if (this.form.controls.envelopeId.value !== id) this.form.controls.envelopeId.setValue(id);
        if (this.planInitialized || !period || loading || pending) return;
        const amount = this.form.controls.amount;
        if (amount.dirty || amount.value !== '') {
          this.planInitialized = true;
          return;
        }
        // Wait for an authoritative plan line, preserving any manual amount.
        if (!period.lines.some((line) => line.envelopeId === id)) return;
        this.fillPlannedAmount();
        this.planInitialized = true;
      });
    });
  }
  readonly c = inject(FinancialCommand);
  readonly s = this.c.store;

  readonly form = inject(FormBuilder).nonNullable.group({
    envelopeId: ['', Validators.required],
    amount: [
      '',
      [
        Validators.required,
        (c) => (validAmount(c.value, this.correctionMode()) ? null : { amount: true }),
      ],
    ],
    description: [''],
  });
  private readonly selectedEnvelopeId = toSignal(this.form.controls.envelopeId.valueChanges, {
    initialValue: this.form.controls.envelopeId.value,
  });
  readonly selectedAccount = computed(() => {
    const envelope = this.s.envelopes().find((item) => item.id === this.selectedEnvelopeId());
    return this.s.dashboard()?.accounts.find((account) => account.id === envelope?.accountId);
  });
  readonly availableAmount = computed(() =>
    this.selectedEnvelopeId()
      ? (this.selectedAccount()?.free ?? null)
      : (this.s.dashboard()?.free ?? null),
  );
  readonly balanceCaption = computed(() => {
    if (!this.selectedEnvelopeId())
      return 'Total sin asignar del hogar. Elige un sobre para ver el dinero libre de su cuenta.';
    const account = this.selectedAccount();
    return account
      ? account.name + ' · ' + (account.type === 'PHYSICAL' ? 'Físico' : 'Digital')
      : 'No se pudo consultar el saldo libre de la cuenta de este sobre.';
  });
  readonly showBalance = computed(
    () =>
      this.c.connection.online() &&
      !this.s.loading() &&
      !this.s.error() &&
      this.availableAmount() !== null,
  );
  fillPlannedAmount() {
    if (!this.prefillPlan()) return;
    const envelopeId = this.form.controls.envelopeId.value;
    const period = this.periodId()
      ? this.s.periods().find((period) => period.id === this.periodId())
      : this.s.period();
    const planned = period?.lines.find((line) => line.envelopeId === envelopeId);
    this.form.controls.amount.setValue(planned ? new Decimal(planned.amount).toFixed(2) : '');
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
    const body = { ...v, amount: Number(v.amount), periodId: this.s.periodId() };
    this.c.review((key) => this.s.api.allocateMoney(id, body, key));
  }
}
