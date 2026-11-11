import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom, forkJoin } from 'rxjs';
import { BankApi } from '../api/generated/bank-api';
import {
  AccountResponse,
  BudgetPeriodResponse,
  DashboardViewResponse,
  EnvelopeResponse,
  HouseholdResponse,
} from '../api/generated/models';
import { errorMessage } from '../errors/message';
@Injectable({ providedIn: 'root' })
export class HouseholdStore {
  private request = 0;
  readonly api = inject(BankApi);
  readonly households = signal<HouseholdResponse[]>([]);
  readonly householdId = signal('');
  readonly accounts = signal<AccountResponse[]>([]);
  readonly envelopes = signal<EnvelopeResponse[]>([]);
  readonly periods = signal<BudgetPeriodResponse[]>([]);
  readonly periodId = signal('');
  readonly dashboard = signal<DashboardViewResponse | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly revision = signal(0);
  readonly period = computed(() => this.periods().find((p) => p.id === this.periodId()));
  async loadHouseholds() {
    this.households.set(await firstValueFrom(this.api.listHouseholds()));
    const current =
      this.households().find((h) => h.id === this.householdId()) || this.households()[0];
    if (current) await this.select(current.id);
  }
  async select(id: string) {
    this.householdId.set(id);
    this.periodId.set('');
    await this.refresh();
  }
  async refresh() {
    const id = this.householdId();
    if (!id) return;
    const request = ++this.request;
    this.loading.set(true);
    this.error.set('');
    this.dashboard.set(null);
    this.accounts.set([]);
    this.envelopes.set([]);
    this.periods.set([]);
    try {
      const data = await firstValueFrom(
        forkJoin({
          accounts: this.api.listAccounts(id),
          envelopes: this.api.listEnvelopes(id),
          periods: this.api.listBudgetPeriods(id),
          dashboard: this.api.getDashboard(id),
        }),
      );
      if (request !== this.request || id !== this.householdId()) return;
      this.accounts.set(data.accounts);
      this.envelopes.set(
        [...data.envelopes].sort((a, b) =>
          a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }),
        ),
      );
      const periods = [...data.periods].sort((a, b) => b.startDate.localeCompare(a.startDate));
      this.periods.set(periods);
      this.dashboard.set(data.dashboard);
      if (!periods.some((p) => p.id === this.periodId()))
        this.periodId.set(periods.find((p) => p.status === 'OPEN')?.id || periods[0]?.id || '');
      this.revision.update((v) => v + 1);
    } catch (e) {
      if (request === this.request) this.error.set(errorMessage(e));
    } finally {
      if (request === this.request) this.loading.set(false);
    }
  }
  clear() {
    this.request++;
    this.loading.set(false);
    this.householdId.set('');
    this.households.set([]);
    this.dashboard.set(null);
    this.accounts.set([]);
    this.envelopes.set([]);
    this.periods.set([]);
    this.periodId.set('');
  }
}
