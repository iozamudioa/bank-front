import { Icon } from '../../shared/components/icon/icon';
import { Component, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HouseholdStore } from '../../core/config/household-store';
import { OperationSafety } from '../../core/config/operation-safety';
import { Onboarding } from './onboarding';
import { Members } from '../members/members';
import { Accounts } from '../accounts/accounts';
import { IncomeSources } from '../income-sources/income-sources';
import { Envelopes } from '../envelopes/envelopes';
import { Periods } from '../budget-periods/periods';
import { OpeningForm } from '../accounts/opening-form';
@Component({
  imports: [
    Icon,
    RouterLink,
    Onboarding,
    Members,
    Accounts,
    IncomeSources,
    Envelopes,
    Periods,
    OpeningForm,
  ],
  templateUrl: './setup-wizard.html',
  styleUrl: './setup-wizard.scss',
})
export class SetupWizard {
  readonly s = inject(HouseholdStore);
  readonly safety = inject(OperationSafety);
  readonly hasOpenPeriod = computed(() => this.s.periods().some((p) => p.status === 'OPEN'));
  readonly step = signal(0);
  readonly steps = [
    'Integrantes',
    'Cuentas',
    'Fuentes de ingreso',
    'Sobres',
    'Plan y quincena',
    'Saldos iniciales',
  ];
  previous() {
    this.step.update((v) => Math.max(0, v - 1));
  }
  next() {
    this.step.update((v) => Math.min(this.steps.length - 1, v + 1));
  }
}
