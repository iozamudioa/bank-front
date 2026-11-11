import { Icon } from '../../shared/components/icon/icon';
import { ModalState } from '../../shared/dialogs/modal-state';
import { Component, inject, signal } from '@angular/core';

import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';

import { firstValueFrom } from 'rxjs';
import { HouseholdStore } from '../../core/config/household-store';
import { errorMessage } from '../../core/errors/message';
@Component({
  imports: [Icon, ReactiveFormsModule],
  templateUrl: './account-create.html',
  styleUrl: './account-create.scss',
})
export class AccountCreate {
  readonly modal = inject(ModalState, { optional: true });
  readonly s = inject(HouseholdStore);
  readonly fb = inject(FormBuilder);
  readonly error = signal('');
  readonly busy = signal(false);
  readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    type: ['PHYSICAL' as 'PHYSICAL' | 'DIGITAL', Validators.required],
  });
  async create() {
    if (this.form.invalid || this.busy() || !this.s.householdId()) return;
    this.modal?.busy.set(true);
    this.busy.set(true);
    this.error.set('');
    try {
      await firstValueFrom(this.s.api.createAccount(this.s.householdId(), this.form.getRawValue()));
      this.form.controls.name.reset();
      await this.s.refresh();
      this.modal?.complete('Cuenta creada correctamente.');
    } catch (e) {
      this.error.set(errorMessage(e));
    } finally {
      this.modal?.busy.set(false);
      this.busy.set(false);
    }
  }
}
