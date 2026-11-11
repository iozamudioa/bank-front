import Decimal from 'decimal.js';
import { DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ModalState } from '../../shared/dialogs/modal-state';
import { Connectivity } from '../../core/config/connectivity';
import { MoneyInput } from '../../shared/directives/money-input';
import { Icon } from '../../shared/components/icon/icon';
import { Component, effect, inject, signal, input, untracked } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormArray,
  FormControl,
  FormGroup,
  Validators,
} from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { HouseholdStore } from '../../core/config/household-store';
import { BudgetLineResponse } from '../../core/api/generated/models';
import { errorMessage } from '../../core/errors/message';
import { validAmount } from '../../shared/utils/money';
@Component({
  selector: 'app-budget-editor',
  imports: [Icon, ReactiveFormsModule, MoneyInput],
  templateUrl: './budget-editor.html',
  styleUrl: './budget-editor.scss',
})
export class BudgetEditor {
  readonly embedded = input(false);
  readonly modal = inject(ModalState, { optional: true });
  readonly connection = inject(Connectivity);
  readonly loaded = signal(false);
  readonly s = inject(HouseholdStore);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly saved = signal(false);
  readonly isNew = signal(false);
  readonly rows = new FormArray<
    FormGroup<{ envelopeId: FormControl<string>; amount: FormControl<string> }>
  >([]);
  readonly form = inject(FormBuilder).nonNullable.group({
    expectedIncome: [
      '0',
      [Validators.required, (c) => (validAmount(c.value, true) ? null : { amount: true })],
    ],
    allocations: this.rows,
  });
  constructor() {
    this.rows.valueChanges
      .pipe(takeUntilDestroyed(inject(DestroyRef)))
      .subscribe(() => this.calculateExpected());
    effect(() => {
      const id = this.s.householdId();
      if (id)
        untracked(() => {
          this.rows.clear();
          void this.load(id);
        });
    });
    effect(() => {
      const envelopes = this.s.envelopes();
      untracked(() => {
        for (const e of envelopes)
          if (!this.rows.controls.some((r) => r.controls.envelopeId.value === e.id))
            this.add(e.id, e.habitualAmount ?? 0);
      });
    });
  }
  private add(id: string, amount: number) {
    this.rows.push(
      new FormGroup({
        envelopeId: new FormControl(id, { nonNullable: true }),
        amount: new FormControl(String(amount), {
          nonNullable: true,
          validators: [(c) => (validAmount(c.value, true) ? null : { amount: true })],
        }),
      }),
    );
  }
  private calculateExpected() {
    const amounts = this.rows.controls.map((row) => row.controls.amount);
    const total = amounts.some((control) => control.invalid)
      ? ''
      : amounts.reduce((sum, control) => sum.plus(control.value), new Decimal(0)).toFixed(2);
    this.form.controls.expectedIncome.setValue(total, { emitEvent: false });
  }
  private populate(lines: BudgetLineResponse[]) {
    this.rows.clear();
    for (const e of this.s.envelopes())
      this.add(e.id, lines.find((l) => l.envelopeId === e.id)?.amount ?? e.habitualAmount ?? 0);
  }
  async load(id: string) {
    if (!id || this.busy()) return;
    this.loaded.set(false);
    this.error.set('');
    this.saved.set(false);
    this.busy.set(true);
    try {
      const t = await firstValueFrom(this.s.api.getBudgetTemplate(id));
      if (id !== this.s.householdId()) return;
      this.populate(t.lines);
      this.isNew.set(false);
      this.loaded.set(true);
    } catch (e) {
      if (id !== this.s.householdId()) return;
      if (e instanceof HttpErrorResponse && e.status === 404) {
        this.populate([]);
        this.isNew.set(true);
        this.loaded.set(true);
      } else this.error.set(errorMessage(e));
    } finally {
      this.busy.set(false);
    }
  }
  async save() {
    this.calculateExpected();
    if (
      this.form.invalid ||
      this.busy() ||
      !this.loaded() ||
      !this.s.householdId() ||
      !this.connection.online()
    )
      return;
    this.busy.set(true);
    this.modal?.busy.set(true);
    this.saved.set(false);
    this.error.set('');
    const v = this.form.getRawValue();
    try {
      await firstValueFrom(
        this.s.api.saveBudgetTemplate(this.s.householdId(), {
          expectedIncome: Number(v.expectedIncome),
          allocations: v.allocations.map((l) => ({
            envelopeId: l.envelopeId,
            amount: Number(l.amount),
          })),
        }),
      );
      this.saved.set(true);
      this.isNew.set(false);
      this.modal?.complete('Presupuesto habitual guardado correctamente.');
    } catch (e) {
      this.error.set(errorMessage(e));
    } finally {
      this.modal?.busy.set(false);
      this.busy.set(false);
    }
  }
  name(id: string) {
    return this.s.envelopes().find((e) => e.id === id)?.name || id;
  }
}
