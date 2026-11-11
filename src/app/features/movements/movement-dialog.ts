import { MovementAction } from './models/movement-action';
import { MovementFooter } from './movement-footer';
import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { DialogTabs } from '../../shared/components/dialog-tabs/dialog-tabs';
import { OperationSafety } from '../../core/config/operation-safety';
import { HouseholdStore } from '../../core/config/household-store';
import { EnvelopeTransferForm } from '../transfers/envelope-transfer-form';
import { IncomeForm } from '../income/income-form';
import { AllocationForm } from '../allocations/allocation-form';
import { TransferForm } from '../transfers/transfer-form';
import { ReallocationForm } from '../transfers/reallocation-form';
import { ReleaseForm } from '../allocations/release-form';
import { OpeningForm } from '../accounts/opening-form';

const MOVEMENT_ACTIONS = [
  { id: 'allocate', icon: 'savings', label: 'Apartar dinero' },
  { id: 'income', icon: 'payments', label: 'Registrar ingreso' },
  { id: 'reallocate', icon: 'swap_horiz', label: 'Mover entre sobres' },
  { id: 'transfer', icon: 'account_balance', label: 'Transferir entre cuentas' },
  { id: 'envelopeTransfer', icon: 'mail', label: 'Transferir sobres entre cuentas' },
  { id: 'release', icon: 'undo', label: 'Liberar reserva' },
  { id: 'opening', icon: 'account_balance_wallet', label: 'Saldo inicial' },
] as const;

@Component({
  imports: [
    MovementFooter,
    DialogTabs,
    EnvelopeTransferForm,
    IncomeForm,
    AllocationForm,
    TransferForm,
    ReallocationForm,
    ReleaseForm,
    OpeningForm,
  ],
  templateUrl: './movement-dialog.html',
  styleUrl: './movement-dialog.scss',
})
export class MovementDialog {
  readonly safety = inject(OperationSafety);
  readonly s = inject(HouseholdStore);
  readonly actions = MOVEMENT_ACTIONS;
  readonly action = signal<MovementAction>('allocate');
  readonly visited = signal<readonly MovementAction[]>(['allocate']);
  private readonly income = viewChild(IncomeForm);
  private readonly allocation = viewChild(AllocationForm);
  private readonly reallocation = viewChild(ReallocationForm);
  private readonly transfer = viewChild(TransferForm);
  private readonly envelopeTransfer = viewChild(EnvelopeTransferForm);
  private readonly release = viewChild(ReleaseForm);
  private readonly opening = viewChild(OpeningForm);
  readonly activeForm = computed(
    () =>
      ({
        income: this.income(),
        allocate: this.allocation(),
        reallocate: this.reallocation(),
        transfer: this.transfer(),
        envelopeTransfer: this.envelopeTransfer(),
        release: this.release(),
        opening: this.opening(),
      })[this.action()],
  );
  readonly activeLabel = computed(
    () => this.actions.find((item) => item.id === this.action())!.label,
  );
  constructor() {
    if (this.s.period()?.status !== 'OPEN') {
      const open = this.s.periods().find((p) => p.status === 'OPEN');
      if (open) this.s.periodId.set(open.id);
    }
  }
  select(action: MovementAction) {
    if (this.safety.locked()) return;
    this.action.set(action);
    if (!this.visited().includes(action)) this.visited.update((items) => [...items, action]);
  }
}
