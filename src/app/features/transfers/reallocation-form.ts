import { MoneyInput } from '../../shared/directives/money-input';
import { CurrencyPipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { Icon } from '../../shared/components/icon/icon';
import { Component, input, inject, computed } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';

import { FinancialCommand } from '../movements/financial-command';
import { validAmount } from '../../shared/utils/money';
@Component({
  selector: 'app-reallocation-form',
  imports: [MoneyInput, Icon, ReactiveFormsModule, CurrencyPipe],
  providers: [FinancialCommand],
  templateUrl: './reallocation-form.html',
  styleUrl: './reallocation-form.scss',
})
export class ReallocationForm {
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
  private readonly sourceId = toSignal(this.form.controls.fromEnvelopeId.valueChanges, {
    initialValue: this.form.controls.fromEnvelopeId.value,
  });
  private readonly destinationId = toSignal(this.form.controls.toEnvelopeId.valueChanges, {
    initialValue: this.form.controls.toEnvelopeId.value,
  });
  readonly source = computed(() => this.s.envelopes().find((item) => item.id === this.sourceId()));
  readonly destination = computed(() =>
    this.s.envelopes().find((item) => item.id === this.destinationId()),
  );
  readonly balancesAvailable = computed(
    () => this.c.connection.online() && !this.s.loading() && !this.s.error(),
  );
  readonly unavailableMessage = computed(() =>
    !this.c.connection.online()
      ? 'Conéctate para consultar el saldo.'
      : this.s.loading()
        ? 'Consultando saldo…'
        : 'Saldo no disponible.',
  );
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
    this.c.review((key) => this.s.api.reallocateEnvelopes(id, body, key));
  }
}
