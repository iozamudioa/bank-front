import { Injectable, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { HouseholdStore } from '../../core/config/household-store';
import { BudgetPeriodResponse } from '../../core/api/generated/models';
import { errorMessage } from '../../core/errors/message';
import { validAmount } from '../../shared/utils/money';

class PlanError extends Error {}
export function periodPlanError(error: unknown): string {
  if (error instanceof PlanError) return error.message;
  if (error instanceof HttpErrorResponse) {
    if (error.status === 400) return 'Revisa el importe y que el sobre y su cuenta estén activos.';
    if (error.status === 404) return 'No se encontró la quincena o el sobre en este hogar.';
    if (error.status === 409)
      return 'El plan cambió. Revisa la quincena e intenta guardar de nuevo.';
    if (error.status >= 500)
      return 'No se pudo confirmar el guardado del plan. Puedes reintentar guardarlo.';
  }
  return errorMessage(error);
}
@Injectable({ providedIn: 'root' })
export class PeriodPlanWriter {
  private readonly s = inject(HouseholdStore);
  private remember(householdId: string, period: BudgetPeriodResponse) {
    if (this.s.householdId() !== householdId) return;
    this.s.periods.update((periods) => {
      const next = periods.some((p) => p.id === period.id)
        ? periods.map((p) => (p.id === period.id ? period : p))
        : [...periods, period];
      return next.sort((a, b) => b.startDate.localeCompare(a.startDate));
    });
  }
  private async read(householdId: string, periodId: string) {
    const period = await firstValueFrom(this.s.api.getBudgetPeriod(householdId, periodId));
    this.remember(householdId, period);
    return period;
  }
  async save(householdId: string, periodId: string, envelopeId: string, amount: string) {
    if (!periodId || !envelopeId || !validAmount(amount, true))
      throw new PlanError('Revisa la quincena y el importe planeado.');
    const current = await this.read(householdId, periodId);
    if (current.status !== 'OPEN')
      throw new PlanError(
        'La quincena ya no está abierta. Elige una abierta para guardar el plan.',
      );
    try {
      const period = await firstValueFrom(
        this.s.api.upsertPeriodBudgetLine(householdId, periodId, envelopeId, {
          amount: Number(amount),
        }),
      );
      this.remember(householdId, period);
      return period;
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 409) {
        // Consult the authoritative state; retry remains an explicit user action.
        let updated: BudgetPeriodResponse | undefined;
        try {
          updated = await this.read(householdId, periodId);
        } catch {
          /* Preserve the original conflict. */
        }
        if (updated && updated.status !== 'OPEN')
          throw new PlanError(
            'La quincena se cerró antes de guardar. Elige otra abierta para guardar el plan.',
          );
      }
      throw error;
    }
  }
}
