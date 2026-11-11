import { Icon } from '../../shared/components/icon/icon';
import { ModalService } from '../../shared/dialogs/modal.service';
import { StatusLabel } from '../../shared/pipes/status-label';
import { Component, computed, inject } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { HouseholdStore } from '../../core/config/household-store';
@Component({
  selector: 'app-periods',
  imports: [Icon, StatusLabel, CurrencyPipe],
  templateUrl: './periods.html',
  styleUrl: './periods.scss',
})
export class Periods {
  readonly modals = inject(ModalService);
  readonly s = inject(HouseholdStore);
  readonly fundingPeriod = computed(() =>
    this.s.period()?.status === 'OPEN'
      ? this.s.period()
      : this.s.periods().find((period) => period.status === 'OPEN'),
  );
  fund() {
    const period = this.fundingPeriod();
    if (period && !this.s.loading() && !this.s.error()) void this.modals.periodSetup(period.id);
  }
  name(id: string) {
    return this.s.envelopes().find((e) => e.id === id)?.name || id;
  }
}
