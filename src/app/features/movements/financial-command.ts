import { ModalState } from '../../shared/dialogs/modal-state';
import { createIdempotencyKey } from '../../shared/utils/idempotency-key';
import { OperationSafety } from '../../core/config/operation-safety';
import { Injectable, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { HouseholdStore } from '../../core/config/household-store';
import { Connectivity } from '../../core/config/connectivity';
import { errorMessage } from '../../core/errors/message';
@Injectable()
export class FinancialCommand {
  readonly modal = inject(ModalState, { optional: true });
  readonly safety = inject(OperationSafety);
  readonly store = inject(HouseholdStore);
  readonly connection = inject(Connectivity);
  readonly busy = signal(false);
  readonly message = signal('');
  successMessage = 'Movimiento registrado correctamente.';
  readonly uncertain = signal(false);
  readonly reviewing = signal(false);
  private pending: ((key: string) => Observable<unknown>) | null = null;
  private key = '';
  review(call: (key: string) => Observable<unknown>) {
    if (this.safety.locked() || this.busy() || this.uncertain() || !this.connection.online())
      return;
    const key = createIdempotencyKey();
    this.safety.locked.set(true);
    this.pending = call;
    this.key = key;
    this.reviewing.set(true);
    this.message.set('');
  }
  cancel() {
    if (!this.uncertain() && !this.busy()) {
      this.safety.locked.set(false);
      this.pending = null;
      this.reviewing.set(false);
    }
  }
  async confirm() {
    if (this.busy() || !this.pending || !this.connection.online()) return;
    this.busy.set(true);
    this.modal?.busy.set(true);
    try {
      await firstValueFrom(this.pending(this.key));
      this.pending = null;
      this.reviewing.set(false);
      this.uncertain.set(false);
      await this.store.refresh();
      this.safety.locked.set(false);
      if (this.modal) this.modal.complete(this.successMessage);
      else this.message.set(this.successMessage);
    } catch (e) {
      this.message.set(errorMessage(e));
      if (
        e instanceof HttpErrorResponse &&
        (e.status === 0 || e.status === 409 || e.status >= 500)
      ) {
        this.uncertain.set(true);
        if (e.status === 409) await this.store.refresh();
      } else {
        this.safety.locked.set(false);
        this.pending = null;
        this.reviewing.set(false);
        this.uncertain.set(false);
        await this.store.refresh();
      }
    } finally {
      this.modal?.busy.set(false);
      this.busy.set(false);
    }
  }
}
