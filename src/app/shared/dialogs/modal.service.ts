import { ToastService } from '../notifications/toast.service';
import type { ModalResult } from './modal-state';
import { Injectable, Type, inject, Injector, signal } from '@angular/core';
import { take } from 'rxjs';
import { OperationSafety } from '../../core/config/operation-safety';
@Injectable({ providedIn: 'root' })
export class ModalService {
  readonly error = signal('');
  private readonly injector = inject(Injector);
  private readonly toasts = inject(ToastService);
  private readonly safety = inject(OperationSafety);
  async open(
    title: string,
    load: () => Promise<Type<unknown>>,
    inputs: Record<string, unknown> = {},
    wide = false,
    framed = false,
  ) {
    if (this.safety.locked() || this.safety.modalOpen()) return;
    this.safety.modalOpen.set(true);
    try {
      this.error.set('');
      const [{ MatDialog }, { ModalShell }, component] = await Promise.all([
        import('@angular/material/dialog'),
        import('./modal-shell'),
        load(),
      ]);
      const ref = this.injector.get(MatDialog).open(ModalShell, {
        data: { title, component, inputs, framed },
        width: wide ? '1050px' : '640px',
        maxWidth: 'calc(100vw - 24px)',
        maxHeight: '94dvh',
        disableClose: true,
        role: 'dialog',
        ariaModal: true,
        closeOnNavigation: false,
        ariaLabelledBy: 'bank-modal-title',
        autoFocus: 'first-tabbable',
        restoreFocus: true,
        panelClass: 'bank-modal',
      });
      ref
        .afterClosed()
        .pipe(take(1))
        .subscribe((result: ModalResult | undefined) => {
          this.safety.modalOpen.set(false);
          if (result?.successMessage) this.toasts.success(result.successMessage);
          if (result?.periodSetupId) void this.periodSetup(result.periodSetupId);
        });
    } catch {
      this.safety.modalOpen.set(false);
      this.error.set('No se pudo abrir el formulario. Intenta nuevamente.');
    }
  }
  expense(envelopeId = '') {
    return this.open(
      'Registrar gasto',
      () => import('../../features/expenses/expense-page').then((m) => m.ExpensePage),
      { envelopeId },
      true,
    );
  }
  movement() {
    return this.open(
      'Nuevo movimiento',
      () => import('../../features/movements/movement-dialog').then((m) => m.MovementDialog),
      {},
      true,
      true,
    );
  }
  reverseMovement(movementId: string) {
    return this.open(
      'Revertir movimiento',
      () => import('../../features/movements/reverse-form').then((m) => m.ReverseForm),
      { movementId },
    );
  }
  editMovement(movementId: string) {
    return this.open(
      'Editar movimiento',
      () => import('../../features/movements/movement-edit').then((m) => m.MovementEdit),
      { movementId },
      true,
      true,
    );
  }
  household() {
    return this.open('Crear hogar', () =>
      import('../../features/onboarding/household-create').then((m) => m.HouseholdCreate),
    );
  }
  account() {
    return this.open('Crear cuenta', () =>
      import('../../features/accounts/account-create').then((m) => m.AccountCreate),
    );
  }
  envelope() {
    return this.open('Crear sobre', () =>
      import('../../features/envelopes/envelope-create').then((m) => m.EnvelopeCreate),
    );
  }
  habitualPlan(envelopeId: string) {
    return this.open(
      'Plan habitual del sobre',
      () => import('../../features/envelopes/habitual-plan').then((m) => m.HabitualPlan),
      { envelopeId },
    );
  }
  envelopePlan(envelopeId: string) {
    return this.open(
      'Plan de quincena',
      () =>
        import('../../features/envelopes/envelope-plan-dialog').then((m) => m.EnvelopePlanDialog),
      { envelopeId },
    );
  }
  period() {
    return this.open('Abrir quincena', () =>
      import('../../features/budget-periods/period-create').then((m) => m.PeriodCreate),
    );
  }
  periodSetup(periodId: string) {
    return this.open(
      'Cargar y distribuir saldos',
      () => import('../../features/budget-periods/period-setup').then((m) => m.PeriodSetup),
      { periodId },
      true,
      true,
    );
  }
  budget() {
    return this.open(
      'Tu presupuesto habitual',
      () => import('../../features/budgets/budget-editor').then((m) => m.BudgetEditor),
      { embedded: true },
    );
  }
  periodClose(periodId: string) {
    return this.open(
      'Cerrar quincena',
      () => import('../../features/budget-periods/period-close').then((m) => m.PeriodClose),
      { periodId },
    );
  }
  member() {
    return this.open('Agregar integrante', () =>
      import('../../features/members/member-create').then((m) => m.MemberCreate),
    );
  }
  incomeSource() {
    return this.open('Crear fuente de ingreso', () =>
      import('../../features/income-sources/income-source-create').then(
        (m) => m.IncomeSourceCreate,
      ),
    );
  }
}
