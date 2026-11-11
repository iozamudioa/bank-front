import { Icon } from '../../shared/components/icon/icon';
import { Component, inject, input, signal, effect, untracked } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { FinancialCommand } from './financial-command';
import { MovementResponse } from '../../core/api/generated/models';
import { errorMessage } from '../../core/errors/message';
import { movementLocation, movementTitle } from './movement-location';
@Component({
  selector: 'app-reverse-form',
  imports: [Icon, ReactiveFormsModule, CurrencyPipe],
  providers: [FinancialCommand],
  templateUrl: './reverse-form.html',
  styleUrl: './reverse-form.scss',
})
export class ReverseForm {
  readonly movementId = input.required<string>();
  readonly c = inject(FinancialCommand);
  readonly s = this.c.store;
  readonly original = signal<MovementResponse | null>(null);
  readonly loading = signal(false);
  private loadedId = '';
  readonly form = inject(FormBuilder).nonNullable.group({
    periodId: ['', Validators.required],
    reason: ['', [Validators.required, (c) => (c.value?.trim() ? null : { required: true })]],
  });
  constructor() {
    this.c.successMessage = 'Movimiento revertido correctamente.';
    effect(() => {
      const id = this.movementId();
      if (id && id !== this.loadedId) {
        this.loadedId = id;
        untracked(() => {
          void this.load();
        });
      }
    });
  }
  async load() {
    this.loading.set(true);
    this.c.message.set('');
    try {
      const m = await firstValueFrom(
        this.s.api.getMovement(this.s.householdId(), this.movementId()),
      );
      if (
        m.householdId !== this.s.householdId() ||
        m.status !== 'POSTED' ||
        m.type === 'REVERSAL'
      ) {
        this.c.message.set('Este movimiento ya no se puede revertir.');
        return;
      }
      this.original.set(m);
      const open = this.s.periods().filter((p) => p.status === 'OPEN');
      this.form.controls.periodId.setValue(
        open.find((p) => p.id === this.s.periodId())?.id ?? open[0]?.id ?? '',
      );
    } catch (error) {
      this.c.message.set(errorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }
  title() {
    const m = this.original();
    return m ? movementTitle(m) : '';
  }
  location() {
    const m = this.original();
    return m ? movementLocation(m, this.s.accounts(), this.s.envelopes()) : '';
  }
  review() {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.loading() || !this.original() || !this.c.connection.online())
      return;
    const { periodId, reason } = this.form.getRawValue();
    if (!this.s.periods().some((p) => p.id === periodId && p.status === 'OPEN')) return;
    const id = this.s.householdId(),
      movement = this.original()!.id,
      body = { periodId, reason: reason.trim() };
    this.c.review((key) => this.s.api.reverseMovement(id, movement, body, key));
  }
}
