import {
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import Decimal from 'decimal.js';
import {
  CorrectionPreviewResponse,
  MovementResponse,
  MovementReplacementRequest,
  BalanceEffectResponse,
} from '../../core/api/generated/models';
import { ModalState } from '../../shared/dialogs/modal-state';
import { Icon } from '../../shared/components/icon/icon';
import { MoneyInput } from '../../shared/directives/money-input';
import { errorMessage } from '../../core/errors/message';
import { validAmount } from '../../shared/utils/money';
import { FinancialCommand } from './financial-command';
import { IncomeForm } from '../income/income-form';
import { AllocationForm } from '../allocations/allocation-form';
import { ReleaseForm } from '../allocations/release-form';
import { TransferForm } from '../transfers/transfer-form';
import { ReallocationForm } from '../transfers/reallocation-form';
import { EnvelopeTransferForm } from '../transfers/envelope-transfer-form';
import {
  buildReplacement,
  CorrectionDataError,
  CORRECTION_LABELS,
  originalReplacement,
  replacementFields,
} from './movement-correction';

interface EffectRow extends BalanceEffectResponse {
  key: string;
  name: string;
  scope: string;
}

@Component({
  imports: [
    CurrencyPipe,
    DatePipe,
    ReactiveFormsModule,
    Icon,
    MoneyInput,
    IncomeForm,
    AllocationForm,
    ReleaseForm,
    TransferForm,
    ReallocationForm,
    EnvelopeTransferForm,
  ],
  providers: [FinancialCommand],
  templateUrl: './movement-edit.html',
  styleUrl: './movement-edit.scss',
})
export class MovementEdit {
  readonly movementId = input.required<string>();
  readonly c = inject(FinancialCommand);
  readonly s = this.c.store;
  readonly modal = inject(ModalState);
  private readonly fb = inject(FormBuilder).nonNullable;
  readonly original = signal<MovementResponse | null>(null);
  readonly seed = signal<MovementReplacementRequest | null>(null);
  readonly loading = signal(false);
  readonly previewBusy = signal(false);
  readonly effects = signal<EffectRow[]>([]);
  readonly labels = CORRECTION_LABELS;
  readonly meta = this.fb.group({
    periodId: ['', Validators.required],
    reason: [
      '',
      [Validators.required, (control) => (control.value?.trim() ? null : { required: true })],
    ],
  });
  readonly expenseForm = this.fb.group({
    origin: ['envelope'],
    accountId: [''],
    targetEnvelopeId: [''],
    amount: [
      '',
      [
        Validators.required,
        (control) => (validAmount(control.value, true) ? null : { amount: true }),
      ],
    ],
    description: [''],
  });
  readonly funding = new FormArray<ReturnType<MovementEdit['fundingRow']>>([]);
  readonly income = viewChild(IncomeForm);
  readonly allocation = viewChild(AllocationForm);
  readonly release = viewChild(ReleaseForm);
  readonly transfer = viewChild(TransferForm);
  readonly reallocation = viewChild(ReallocationForm);
  readonly envelopeTransfer = viewChild(EnvelopeTransferForm);
  readonly activeForm = computed(() => {
    switch (this.seed()?.type) {
      case 'INCOME':
        return this.income();
      case 'ALLOCATE':
        return this.allocation();
      case 'RELEASE':
        return this.release();
      case 'TRANSFER':
        return this.transfer();
      case 'REALLOCATE':
        return this.reallocation();
      case 'ENVELOPE_TRANSFER':
        return this.envelopeTransfer();
      default:
        return undefined;
    }
  });
  readonly locked = computed(
    () => this.loading() || this.previewBusy() || this.c.busy() || this.c.reviewing(),
  );
  readonly openPeriods = computed(() =>
    this.s.periods().filter((period) => period.status === 'OPEN'),
  );
  readonly expense = computed(() => this.original()?.type === 'EXPENSE');
  readonly requestReview = () => {
    void this.review();
  };
  private readonly initialized = new WeakSet<object>();
  private loadedId = '';

  constructor() {
    this.c.successMessage = 'Movimiento actualizado correctamente.';
    effect(() => {
      const id = this.movementId();
      if (id && id !== this.loadedId) {
        this.loadedId = id;
        untracked(() => {
          void this.load(id);
        });
      }
    });
    effect(() => {
      const form = this.activeForm();
      const seed = this.seed();
      if (!form || !seed || this.initialized.has(form)) return;
      this.initialized.add(form);
      untracked(() => form.form.patchValue(replacementFields(seed)));
    });
  }
  private fundingRow(envelopeId = '', amount = '') {
    return this.fb.group({
      envelopeId: [envelopeId, Validators.required],
      amount: [
        amount,
        [
          Validators.required,
          (control) => (validAmount(control.value, true) ? null : { amount: true }),
        ],
      ],
    });
  }
  zeroExpense() {
    const value = this.expenseForm.controls.amount.value;
    return validAmount(value, true) && new Decimal(value).isZero();
  }
  addFunding() {
    if (this.locked()) return;
    this.funding.push(this.fundingRow(this.expenseForm.controls.targetEnvelopeId.value));
  }
  removeFunding(index: number) {
    if (!this.locked()) this.funding.removeAt(index);
  }
  async load(id = this.movementId()) {
    if (this.loading()) return;
    this.loading.set(true);
    this.c.message.set('');
    try {
      const movement = await firstValueFrom(this.s.api.getMovement(this.s.householdId(), id));
      if (movement.householdId !== this.s.householdId() || movement.id !== id)
        throw new CorrectionDataError('El movimiento no está disponible en este hogar.');
      const seed = originalReplacement(movement);
      this.original.set(movement);
      this.seed.set(seed);
      const open = this.s.periods().filter((period) => period.status === 'OPEN');
      this.meta.controls.periodId.setValue(
        open.find((period) => period.id === movement.periodId)?.id ??
          open.find((period) => period.id === this.s.periodId())?.id ??
          open[0]?.id ??
          '',
      );
      this.expenseForm.patchValue({
        ...replacementFields(seed),
        origin: seed.type === 'ACCOUNT_EXPENSE' ? 'account' : 'envelope',
      });
      this.funding.clear();
      if (seed.type === 'EXPENSE') {
        const sources = seed.fundingSources?.filter((source) => source !== null) ?? [
          { envelopeId: seed.targetEnvelopeId, amount: seed.amount },
        ];
        for (const source of sources)
          this.funding.push(
            this.fundingRow(source.envelopeId, new Decimal(source.amount).toFixed(2)),
          );
      }
    } catch (error) {
      this.c.message.set(
        error instanceof CorrectionDataError ? error.message : errorMessage(error),
      );
    } finally {
      this.loading.set(false);
    }
  }
  private snapshot(preview: CorrectionPreviewResponse, originalId: string) {
    if (
      preview.originalId !== originalId ||
      !Array.isArray(preview.accountEffects) ||
      !Array.isArray(preview.envelopeEffects)
    )
      throw new CorrectionDataError(
        'No se pudo consultar el resultado de la corrección. Intenta revisar de nuevo.',
      );
    const rows: EffectRow[] = [];
    for (const [scope, effects] of [
      ['Cuenta', preview.accountEffects],
      ['Sobre', preview.envelopeEffects],
    ] as const) {
      for (const effect of effects) {
        if (
          !effect.entityId ||
          ![effect.before, effect.change, effect.after].every(Number.isFinite)
        )
          throw new CorrectionDataError('La revisión no contiene saldos válidos.');
        const name =
          scope === 'Cuenta'
            ? this.s.accounts().find((account) => account.id === effect.entityId)?.name
            : this.s.envelopes().find((envelope) => envelope.id === effect.entityId)?.name;
        rows.push({
          ...effect,
          key: scope + ':' + effect.entityId,
          scope,
          name: name ?? effect.entityId,
        });
      }
    }
    return rows;
  }
  async review() {
    if (
      this.locked() ||
      !this.seed() ||
      !this.original() ||
      !this.c.connection.online() ||
      this.c.safety.locked()
    )
      return;
    this.meta.markAllAsTouched();
    const active = this.activeForm();
    const form = this.expense() ? this.expenseForm : active?.form;
    form?.markAllAsTouched();
    this.funding.markAllAsTouched();
    if (this.meta.invalid || !form || form.invalid) return;
    const periodId = this.meta.controls.periodId.value;
    if (!this.s.periods().some((period) => period.id === periodId && period.status === 'OPEN')) {
      this.c.message.set('Selecciona una quincena abierta para registrar la corrección.');
      return;
    }
    try {
      const fields: Record<string, string> = form.getRawValue();
      const kind = this.expense()
        ? fields['origin'] === 'account'
          ? 'ACCOUNT_EXPENSE'
          : 'EXPENSE'
        : this.seed()!.type;
      const sources = this.zeroExpense()
        ? []
        : this.funding.controls.map((row) => ({
            envelopeId: row.controls.envelopeId.value,
            amount: Number(row.controls.amount.value),
          }));
      const replacement = buildReplacement(kind, fields, sources);
      const body = structuredClone({
        periodId,
        reason: this.meta.controls.reason.value.trim(),
        replacement,
      });
      const originalId = this.original()!.id,
        householdId = this.s.householdId();
      this.previewBusy.set(true);
      this.modal.busy.set(true);
      this.c.message.set('');
      const response = await firstValueFrom(
        this.s.api.previewMovementCorrection(householdId, originalId, body),
      );
      const rows = this.snapshot(response, originalId);
      this.c.review((key) => this.s.api.correctMovement(householdId, originalId, body, key));
      if (this.c.reviewing()) this.effects.set(rows);
    } catch (error) {
      this.c.message.set(
        error instanceof CorrectionDataError ? error.message : errorMessage(error),
      );
    } finally {
      this.previewBusy.set(false);
      this.modal.busy.set(false);
    }
  }

  cancel() {
    this.c.cancel();
    if (!this.c.reviewing()) this.effects.set([]);
  }
  absolute(value: number) {
    return Math.abs(value);
  }
}
