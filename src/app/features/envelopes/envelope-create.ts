import { HttpErrorResponse } from '@angular/common/http';
import { OperationSafety } from '../../core/config/operation-safety';
import { createIdempotencyKey } from '../../shared/utils/idempotency-key';
import { validAmount } from '../../shared/utils/money';
import { MoneyInput } from '../../shared/directives/money-input';
import { Icon } from '../../shared/components/icon/icon';
import { ModalState } from '../../shared/dialogs/modal-state';
import { Component, inject, signal, input, output, effect } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { HouseholdStore } from '../../core/config/household-store';
import { Connectivity } from '../../core/config/connectivity';
import { EnvelopeResponse } from '../../core/api/generated/models';
import { errorMessage } from '../../core/errors/message';
import { PeriodPlanFields } from './period-plan-fields';
import { periodPlanForm } from './period-plan-form';
import { PeriodPlanWriter, periodPlanError } from './period-plan-writer';
@Component({
  selector: 'app-envelope-create',
  imports: [Icon, ReactiveFormsModule, PeriodPlanFields, MoneyInput],
  templateUrl: './envelope-create.html',
  styleUrl: './envelope-create.scss',
})
export class EnvelopeCreate {
  readonly planPeriodId = input('');
  readonly saved = output<string>();
  constructor() {
    effect(() => {
      const id = this.planPeriodId();
      if (id) {
        this.form.controls.plan.controls.periodId.setValue(id);
        this.form.controls.plan.controls.amount.addValidators(Validators.required);
        this.form.controls.plan.controls.amount.updateValueAndValidity();
      }
    });
  }
  readonly modal = inject(ModalState, { optional: true });
  readonly s = inject(HouseholdStore);
  readonly connection = inject(Connectivity);
  private readonly writer = inject(PeriodPlanWriter);
  readonly safety = inject(OperationSafety);
  readonly uncertain = signal(false);
  private pending: {
    body: {
      name: string;
      accountId: string;
      type: 'SPENDING' | 'SAVINGS' | 'GOAL';
      category: string;
      habitualAmount: number;
    };
    key: string;
  } | null = null;
  readonly error = signal('');
  readonly busy = signal(false);
  readonly createdEnvelope = signal<EnvelopeResponse | null>(null);
  private createdHousehold = '';
  readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', Validators.required],
    accountId: ['', Validators.required],
    category: [''],
    type: ['SPENDING' as 'SPENDING' | 'SAVINGS' | 'GOAL', Validators.required],
    habitualAmount: [
      '0.00',
      [
        Validators.required,
        (control) => (validAmount(control.value, true) ? null : { amount: true }),
      ],
    ],
    plan: periodPlanForm(),
  });
  async create() {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.busy() || !this.s.householdId() || !this.connection.online())
      return;
    const householdId = this.s.householdId();
    if (
      this.planPeriodId() &&
      this.form.controls.plan.controls.periodId.value !== this.planPeriodId()
    )
      return;
    if (this.createdEnvelope() && this.createdHousehold !== householdId) {
      this.error.set(
        'El sobre creado pertenece a otro hogar. Regresa a ese hogar para guardar su plan.',
      );
      return;
    }
    this.modal?.busy.set(true);
    this.busy.set(true);
    this.error.set('');
    const { plan, habitualAmount, ...fields } = this.form.getRawValue();
    const body = { ...fields, habitualAmount: Number(habitualAmount) };
    try {
      if (!this.createdEnvelope()) {
        this.pending ??= { body, key: createIdempotencyKey() };
        const created = await firstValueFrom(
          this.s.api.createEnvelope(householdId, this.pending.body, this.pending.key),
        );
        this.pending = null;
        this.uncertain.set(false);
        this.safety.locked.set(false);
        this.createdHousehold = householdId;
        this.createdEnvelope.set(created);
        if (plan.amount !== '') {
          this.form.controls.plan.controls.amount.addValidators(Validators.required);
          this.form.controls.plan.controls.amount.updateValueAndValidity();
        }
      }
      if (plan.amount !== '') {
        await this.writer.save(householdId, plan.periodId, this.createdEnvelope()!.id, plan.amount);
      }
      await this.s.refresh();
      if (plan.amount !== '') this.s.periodId.set(plan.periodId);
      this.form.controls.name.reset();
      this.form.controls.plan.controls.amount.removeValidators(Validators.required);
      this.form.controls.plan.controls.amount.reset('');
      const savedId = this.createdEnvelope()!.id;
      this.createdEnvelope.set(null);
      this.createdHousehold = '';
      this.saved.emit(savedId);
      this.modal?.complete(
        plan.amount !== ''
          ? 'Sobre creado y plan de quincena guardado.'
          : 'Sobre creado correctamente.',
      );
    } catch (error) {
      if (
        !this.createdEnvelope() &&
        error instanceof HttpErrorResponse &&
        (error.status === 0 || error.status === 409 || error.status >= 500)
      ) {
        this.uncertain.set(true);
        this.safety.locked.set(true);
      } else if (!this.createdEnvelope()) this.pending = null;
      const created = this.createdEnvelope();
      if (created) {
        this.error.set(
          'El sobre «' +
            created.name +
            '» ya se creó, pero no se pudo guardar su plan. ' +
            periodPlanError(error),
        );
        await this.s.refresh();
      } else this.error.set(errorMessage(error));
    } finally {
      this.modal?.busy.set(false);
      this.busy.set(false);
    }
  }
}
