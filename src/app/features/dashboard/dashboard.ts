import { OperationSafety } from '../../core/config/operation-safety';
import Decimal from 'decimal.js';
import { Icon } from '../../shared/components/icon/icon';
import { ModalService } from '../../shared/dialogs/modal.service';
import { RecentActivity } from './recent-activity';
import { Component, computed, inject, effect } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { HouseholdStore } from '../../core/config/household-store';
import { sum } from '../../shared/utils/money';
import { Onboarding } from '../onboarding/onboarding';
@Component({
  imports: [Icon, CurrencyPipe, RouterLink, Onboarding, RecentActivity],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  private readonly router = inject(Router);
  constructor() {
    effect(() => {
      if (
        !this.store.loading() &&
        !this.store.error() &&
        !this.store.periods().some((period) => period.status === 'OPEN') &&
        !this.safety.modalOpen() &&
        !this.safety.locked()
      )
        void this.router.navigateByUrl('/setup', { replaceUrl: true });
    });
  }
  readonly modals = inject(ModalService);
  readonly safety = inject(OperationSafety);
  readonly store = inject(HouseholdStore);
  readonly envelopePlans = computed(() => {
    const period = this.store.period();
    return this.store
      .envelopes()
      .slice(0, 5)
      .map((envelope) => {
        const line = period?.lines.find((line) => line.envelopeId === envelope.id);
        const planned = line && line.amount > 0 ? line.amount : 0;
        const available = Math.max(0, envelope.balance);
        return {
          ...envelope,
          planned,
          progress: planned
            ? Math.min(100, new Decimal(available).div(planned).times(100).toNumber())
            : 0,
          planMarker:
            planned && available > planned
              ? new Decimal(planned).div(available).times(100).toNumber()
              : 100,
          cappedBalance: Math.min(available, planned),
          extra: planned ? Decimal.max(0, new Decimal(available).minus(planned)).toNumber() : 0,
        };
      });
  });
  readonly physical = computed(() =>
    sum(
      this.store
        .dashboard()
        ?.accounts.filter((a) => a.type === 'PHYSICAL')
        .map((a) => a.total) || [],
    ),
  );
  readonly digital = computed(() =>
    sum(
      this.store
        .dashboard()
        ?.accounts.filter((a) => a.type === 'DIGITAL')
        .map((a) => a.total) || [],
    ),
  );
}
