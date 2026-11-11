import { Icon } from '../../shared/components/icon/icon';
import { ModalState } from '../../shared/dialogs/modal-state';
import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { HouseholdStore } from '../../core/config/household-store';

import { errorMessage } from '../../core/errors/message';
@Component({
  imports: [Icon, ReactiveFormsModule],
  templateUrl: './member-create.html',
  styleUrl: './member-create.scss',
})
export class MemberCreate {
  readonly modal = inject(ModalState, { optional: true });
  readonly s = inject(HouseholdStore);
  readonly error = signal('');
  readonly busy = signal(false);
  readonly form = inject(FormBuilder).nonNullable.group({
    username: ['', Validators.required],
    displayName: ['', Validators.required],
    role: ['EDITOR' as 'EDITOR' | 'VIEWER'],
  });
  async create() {
    if (this.form.invalid || this.busy() || !this.s.householdId()) return;
    this.modal?.busy.set(true);
    this.busy.set(true);
    try {
      await firstValueFrom(
        this.s.api.addHouseholdMember(this.s.householdId(), this.form.getRawValue()),
      );
      this.form.reset();
      this.s.revision.update((v) => v + 1);
      this.modal?.complete('Integrante agregado correctamente.');
    } catch (e) {
      this.error.set(errorMessage(e));
    } finally {
      this.modal?.busy.set(false);
      this.busy.set(false);
    }
  }
}
