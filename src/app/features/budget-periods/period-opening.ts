import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom, forkJoin, catchError } from 'rxjs';
import { BudgetPeriodResponse, CreatePeriodRequest } from '../../core/api/generated/models';
import { HouseholdStore } from '../../core/config/household-store';
import { errorMessage } from '../../core/errors/message';
class InvalidBudgetTemplate extends Error {
  constructor() {
    super(
      'No puedes abrir una quincena sin un presupuesto habitual configurado. En Presupuesto y quincenas, guarda el plan de tus sobres con algún importe mayor a $0.00 antes de continuar.',
    );
  }
}
interface PendingPeriod {
  householdId: string;
  request: CreatePeriodRequest;
}
@Injectable()
export class PeriodOpening {
  private readonly store = inject(HouseholdStore);
  readonly phase = signal<'idle' | 'checking' | 'closing' | 'opening'>('idle');
  readonly busy = computed(() => this.phase() !== 'idle');
  readonly error = signal('');
  readonly confirmation = signal<readonly BudgetPeriodResponse[] | null>(null);
  private pending: PendingPeriod | null = null;
  private async check(householdId: string) {
    const { periods, template } = await firstValueFrom(
      forkJoin({
        periods: this.store.api.listBudgetPeriods(householdId),
        template: this.store.api.getBudgetTemplate(householdId).pipe(
          catchError((error) => {
            if (error instanceof HttpErrorResponse && error.status === 404)
              throw new InvalidBudgetTemplate();
            throw error;
          }),
        ),
      }),
    );
    return periods;
  }
  private overlaps(periods: BudgetPeriodResponse[], request: CreatePeriodRequest) {
    return periods.some((p) => request.startDate <= p.endDate && request.endDate >= p.startDate);
  }
  private async open(pending: PendingPeriod) {
    this.phase.set('opening');
    const created = await firstValueFrom(
      this.store.api.createBudgetPeriod(pending.householdId, pending.request),
    );
    await this.store.refresh();
    this.store.periodId.set(created.id);
    return created.id;
  }
  cancel() {
    if (this.busy()) return;
    this.confirmation.set(null);
    this.pending = null;
    this.error.set('');
  }
  async prepare(request: CreatePeriodRequest): Promise<string | undefined> {
    if (
      this.busy() ||
      this.confirmation() ||
      !this.store.householdId() ||
      request.endDate < request.startDate
    )
      return;
    this.phase.set('checking');
    this.error.set('');
    this.pending = null;
    const pending = { householdId: this.store.householdId(), request: { ...request, open: true } };
    try {
      const periods = await this.check(pending.householdId);
      if (this.overlaps(periods, request)) {
        this.error.set(
          'Las fechas se traslapan con una quincena existente. Revisa el periodo antes de continuar.',
        );
        return;
      }
      const open = periods.filter((p) => p.status === 'OPEN');
      if (open.length) {
        this.pending = pending;
        this.confirmation.set(open);
        return;
      }
      return await this.open(pending);
    } catch (error) {
      this.error.set(error instanceof InvalidBudgetTemplate ? error.message : errorMessage(error));
      await this.store.refresh();
    } finally {
      this.phase.set('idle');
    }
    return undefined;
  }
  async confirm(): Promise<string | undefined> {
    const pending = this.pending,
      approved = this.confirmation();
    if (this.busy() || !pending || !approved) return;
    this.phase.set('checking');
    this.error.set('');
    let closed = 0,
      creating = false;
    try {
      const periods = await this.check(pending.householdId);
      if (this.overlaps(periods, pending.request)) {
        this.error.set(
          'Las fechas se traslapan con una quincena existente. No se cerró ninguna quincena.',
        );
        this.confirmation.set(null);
        this.pending = null;
        return;
      }
      const open = periods.filter((p) => p.status === 'OPEN');
      if (open.some((p) => !approved.some((previous) => previous.id === p.id))) {
        this.confirmation.set(open);
        this.error.set('Cambió la lista de quincenas abiertas. Revisa y confirma nuevamente.');
        return;
      }
      this.phase.set('closing');
      for (const period of open) {
        await firstValueFrom(this.store.api.closeBudgetPeriod(pending.householdId, period.id));
        closed++;
      }
      creating = true;
      const id = await this.open(pending);
      this.confirmation.set(null);
      this.pending = null;
      return id;
    } catch (error) {
      const context =
        closed > 0
          ? (closed === 1
              ? 'Se cerró la quincena anterior. '
              : 'Se cerraron ' + closed + ' quincenas. ') +
            (creating
              ? 'No se pudo confirmar la apertura de la nueva. '
              : 'No se pudo completar el cierre de las demás. ')
          : 'No se pudo completar el cambio de quincena. ';
      this.error.set(
        error instanceof InvalidBudgetTemplate
          ? error.message + ' No se cerró ninguna quincena.'
          : context +
              errorMessage(error) +
              ' Revisa el estado de las quincenas antes de reintentar.',
      );
      this.confirmation.set(null);
      this.pending = null;
      await this.store.refresh();
    } finally {
      this.phase.set('idle');
    }
    return undefined;
  }
}
