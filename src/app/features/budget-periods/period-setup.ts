import { CurrencyPipe } from '@angular/common';
import { Component, computed, effect, inject, input, signal, viewChild } from '@angular/core';
import Decimal from 'decimal.js';
import { HouseholdStore } from '../../core/config/household-store';
import { OperationSafety } from '../../core/config/operation-safety';
import { EnvelopeResponse } from '../../core/api/generated/models';
import { ModalState } from '../../shared/dialogs/modal-state';
import { ToastService } from '../../shared/notifications/toast.service';
import { Icon } from '../../shared/components/icon/icon';
import { IncomeForm } from '../income/income-form';
import { TransferForm } from '../transfers/transfer-form';
import { AllocationForm } from '../allocations/allocation-form';
import { EnvelopeCreate } from '../envelopes/envelope-create';
import { DialogTabs } from '../../shared/components/dialog-tabs/dialog-tabs';
import { MovementFooter } from '../movements/movement-footer';

type SetupStep = 'income' | 'transfer' | 'allocate' | 'summary';
type EnvelopeDecision = 'allocated' | 'skipped';

@Component({
  imports: [
    CurrencyPipe,
    Icon,
    IncomeForm,
    TransferForm,
    AllocationForm,
    EnvelopeCreate,
    MovementFooter,
    DialogTabs,
  ],
  providers: [ModalState],
  templateUrl: './period-setup.html',
  styleUrl: './period-setup.scss',
})
export class PeriodSetup {
  readonly periodId = input.required<string>();
  readonly s = inject(HouseholdStore);
  readonly safety = inject(OperationSafety);
  readonly modal = inject(ModalState);
  private readonly parentModal = inject(ModalState, { skipSelf: true });
  private readonly toasts = inject(ToastService);
  private readonly householdId = this.s.householdId();
  readonly step = signal<SetupStep>('income');
  readonly steps = [
    { id: 'income', icon: 'payments', label: 'Registrar ingreso' },
    { id: 'transfer', icon: 'account_balance', label: 'Transferir entre cuentas' },
    { id: 'allocate', icon: 'savings', label: 'Apartar dinero' },
    { id: 'summary', icon: 'check_circle', label: 'Revisión' },
  ] as const;
  readonly creatingEnvelope = signal(false);
  readonly envelopes = signal<EnvelopeResponse[]>([]);
  readonly decisions = signal<Record<string, EnvelopeDecision>>({});
  readonly currentId = signal('');
  readonly period = computed(() => this.s.periods().find((p) => p.id === this.periodId()));
  readonly ready = computed(
    () =>
      this.s.householdId() === this.householdId &&
      !this.s.loading() &&
      !this.s.error() &&
      this.period()?.status === 'OPEN',
  );
  readonly blocked = computed(() => this.modal.busy() || this.safety.locked());
  readonly current = computed(() => this.envelopes().find((e) => e.id === this.currentId()));
  readonly currentIndex = computed(
    () => this.envelopes().findIndex((e) => e.id === this.currentId()) + 1,
  );
  readonly processed = computed(
    () => this.envelopes().filter((e) => this.decisions()[e.id]).length,
  );
  readonly income = viewChild(IncomeForm);
  readonly transfer = viewChild(TransferForm);
  readonly allocation = viewChild(AllocationForm);
  readonly activeForm = computed(() => {
    switch (this.step()) {
      case 'income':
        return this.income();
      case 'transfer':
        return this.transfer();
      case 'allocate':
        return this.creatingEnvelope() ? undefined : this.allocation();
      default:
        return undefined;
    }
  });
  readonly operation = computed(() =>
    this.step() === 'income' ? 'income' : this.step() === 'transfer' ? 'transfer' : 'allocate',
  );
  readonly operationLabel = computed(() =>
    this.step() === 'income'
      ? 'Registrar ingreso'
      : this.step() === 'transfer'
        ? 'Transferir entre cuentas'
        : 'Apartar dinero',
  );

  constructor() {
    // Child forms report success to the guide, while the shell still guards closing.
    this.modal.requestClose = (result) => {
      if (!result?.successMessage) return;
      this.toasts.success(result.successMessage);
      if (this.creatingEnvelope()) {
        this.creatingEnvelope.set(false);
      } else if (this.step() === 'allocate') {
        this.advance('allocated');
      } else {
        this.activeForm()?.form.reset();
      }
    };
    effect(() => this.parentModal.busy.set(this.modal.busy()));
    effect(() => {
      if (!this.ready()) return;
      this.s.periodId.set(this.periodId());
      const accounts = this.s.accounts();
      this.envelopes.set(
        this.s
          .envelopes()
          .filter((e) => e.active && accounts.some((a) => a.id === e.accountId && a.active)),
      );
    });
  }

  planned(id: string): number | null {
    return this.period()?.lines.find((line) => line.envelopeId === id)?.amount ?? null;
  }
  remaining(id: string): number {
    const envelope = this.envelopes().find((e) => e.id === id);
    return Decimal.max(
      0,
      new Decimal(this.planned(id) ?? 0).minus(envelope?.balance ?? 0),
    ).toNumber();
  }
  accountName(id: string) {
    return this.s.accounts().find((account) => account.id === id)?.name ?? '';
  }
  go(step: SetupStep) {
    if (!this.ready() || this.blocked() || this.creatingEnvelope()) return;
    this.step.set(step);
    if (step === 'allocate') {
      const next = this.envelopes().find((e) => !this.decisions()[e.id]);
      this.currentId.set(next?.id ?? '');
    }
  }
  skipEnvelope() {
    if (!this.ready() || this.blocked() || this.creatingEnvelope()) return;
    this.advance('skipped');
  }
  private advance(decision: EnvelopeDecision) {
    const id = this.currentId();
    if (!id) return;
    this.decisions.update((values) => ({ ...values, [id]: decision }));
    const next = this.envelopes().find((e) => !this.decisions()[e.id]);
    this.currentId.set(next?.id ?? '');
    if (!next) this.step.set('summary');
  }
  revisit(id: string) {
    if (!this.ready() || this.blocked()) return;
    this.step.set('allocate');
    this.currentId.set(id);
  }
  newEnvelope() {
    if (!this.ready() || this.blocked()) return;
    this.step.set('allocate');
    this.creatingEnvelope.set(true);
  }
  envelopeSaved(id: string) {
    this.currentId.set(id);
    this.step.set('allocate');
  }
  cancelNewEnvelope() {
    if (!this.blocked()) this.creatingEnvelope.set(false);
  }
  finish() {
    if (!this.blocked()) this.parentModal.complete('Carga y distribución de saldos finalizada.');
  }
}
