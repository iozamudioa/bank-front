import { Component, computed, inject, input, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { HouseholdStore } from '../../core/config/household-store';
import { Connectivity } from '../../core/config/connectivity';
import { errorMessage } from '../../core/errors/message';
import { ModalState } from '../../shared/dialogs/modal-state';
import { Icon } from '../../shared/components/icon/icon';

@Component({
  imports: [Icon],
  templateUrl: './period-close.html',
})
export class PeriodClose {
  readonly periodId = input.required<string>();
  readonly s = inject(HouseholdStore);
  readonly modal = inject(ModalState);
  readonly connection = inject(Connectivity);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly period = computed(() =>
    this.s.periods().find((period) => period.id === this.periodId()),
  );
  async confirm() {
    if (
      this.busy() ||
      !this.s.householdId() ||
      this.period()?.status !== 'OPEN' ||
      !this.connection.online()
    )
      return;
    const householdId = this.s.householdId(),
      periodId = this.periodId();
    this.busy.set(true);
    this.modal.busy.set(true);
    this.error.set('');
    try {
      await firstValueFrom(this.s.api.closeBudgetPeriod(householdId, periodId));
      await this.s.refresh();
      this.modal.complete('Quincena cerrada correctamente.');
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.busy.set(false);
      this.modal.busy.set(false);
    }
  }
}
