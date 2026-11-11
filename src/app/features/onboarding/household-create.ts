import { Icon } from '../../shared/components/icon/icon';
import { ModalState } from '../../shared/dialogs/modal-state';
import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { HouseholdStore } from '../../core/config/household-store';
import { errorMessage } from '../../core/errors/message';
@Component({
  imports: [Icon, ReactiveFormsModule],
  templateUrl: './household-create.html',
  styleUrl: './household-create.scss',
})
export class HouseholdCreate {
  readonly modal = inject(ModalState, { optional: true });
  readonly s = inject(HouseholdStore);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', Validators.required],
    displayName: ['', Validators.required],
  });
  async create() {
    if (this.form.invalid || this.busy()) return;
    this.modal?.busy.set(true);
    this.busy.set(true);
    try {
      await firstValueFrom(this.s.api.createHousehold(this.form.getRawValue()));
      await this.s.loadHouseholds();
      this.modal?.complete('Hogar creado correctamente.');
    } catch (e) {
      this.error.set(errorMessage(e));
    } finally {
      this.modal?.busy.set(false);
      this.busy.set(false);
    }
  }
}
