import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { HouseholdStore } from '../../core/config/household-store';
import { MoneyInput } from '../../shared/directives/money-input';
import { PeriodPlanForm } from './period-plan-form';
@Component({
  selector: 'app-period-plan-fields',
  imports: [ReactiveFormsModule, MoneyInput],
  templateUrl: './period-plan-fields.html',
  styleUrl: './period-plan-fields.scss',
})
export class PeriodPlanFields {
  readonly form = input.required<PeriodPlanForm>();
  readonly optional = input(false);
  readonly fixedPeriodId = input('');
  readonly s = inject(HouseholdStore);
  readonly open = computed(() => this.s.periods().filter((period) => period.status === 'OPEN'));
  private readonly selectedId = signal('');
  readonly selected = computed(() =>
    this.s.periods().find((period) => period.id === this.selectedId()),
  );
  readonly unavailableSelection = computed(
    () => !!this.selectedId() && !this.open().some((period) => period.id === this.selectedId()),
  );
  constructor() {
    effect(() => {
      const control = this.form().controls.periodId;
      const period = this.selected();
      if (period && period.status !== 'OPEN' && !control.hasError('closedPeriod')) {
        control.setErrors({ ...control.errors, closedPeriod: true });
      } else if (period?.status === 'OPEN' && control.hasError('closedPeriod')) {
        const { closedPeriod: _closed, ...otherErrors } = control.errors!;
        control.setErrors(Object.keys(otherErrors).length ? otherErrors : null);
      }
    });
    effect((onCleanup) => {
      const control = this.form().controls.periodId;
      this.selectedId.set(control.value);
      const subscription = control.valueChanges.subscribe((value) => this.selectedId.set(value));
      onCleanup(() => subscription.unsubscribe());
    });
    effect(() => {
      const control = this.form().controls.periodId;
      const periods = this.open();
      if (!control.value && control.pristine && periods.length === 1)
        control.setValue(periods[0].id);
    });
  }
}
