import { DateRangeSelector } from '../../shared/components/date-range-selector/date-range-selector';
import { DateRangeValue, isDateRange } from '../../shared/utils/date-range';
import { Icon } from '../../shared/components/icon/icon';
import { ModalState } from '../../shared/dialogs/modal-state';
import { Component, computed, effect, ElementRef, inject, viewChild } from '@angular/core';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { HouseholdStore } from '../../core/config/household-store';
import { PeriodOpening } from './period-opening';
@Component({
  imports: [Icon, ReactiveFormsModule, DateRangeSelector],
  providers: [PeriodOpening],
  templateUrl: './period-create.html',
  styleUrl: './period-create.scss',
})
export class PeriodCreate {
  readonly modal = inject(ModalState, { optional: true });
  readonly s = inject(HouseholdStore);
  readonly flow = inject(PeriodOpening);
  readonly busy = this.flow.busy;
  readonly error = this.flow.error;
  private readonly declineButton = viewChild<ElementRef<HTMLButtonElement>>('declineButton');
  readonly busyLabel = computed(
    () =>
      ({
        idle: 'Confirmar nueva quincena',
        checking: 'Verificando quincenas…',
        closing: 'Cerrando quincena anterior…',
        opening: 'Abriendo nueva quincena…',
      })[this.flow.phase()],
  );
  readonly form = new FormGroup({
    range: new FormControl<DateRangeValue | null>(null, [
      Validators.required,
      (control) => (!control.value || isDateRange(control.value) ? null : { dateRange: true }),
    ]),
  });
  constructor() {
    effect(() => {
      if (this.busy() || this.flow.confirmation())
        this.form.controls.range.disable({ emitEvent: false });
      else this.form.controls.range.enable({ emitEvent: false });
    });
    effect(() => {
      const confirmation = this.flow.confirmation();
      const button = this.declineButton();
      if (confirmation && button) queueMicrotask(() => button.nativeElement.focus());
    });
  }
  async create() {
    const range = this.form.controls.range.value;
    if (
      this.form.invalid ||
      this.busy() ||
      this.flow.confirmation() ||
      !this.s.householdId() ||
      !isDateRange(range)
    )
      return;
    await this.perform(() => this.flow.prepare({ ...range, open: true }));
  }
  async confirm() {
    if (!this.busy()) await this.perform(() => this.flow.confirm());
  }
  private async perform(action: () => Promise<string | undefined>) {
    if (this.busy()) return;
    this.modal?.busy.set(true);
    try {
      const id = await action();
      if (id) this.modal?.complete('Quincena abierta correctamente.', id);
    } finally {
      this.modal?.busy.set(false);
    }
  }
}
