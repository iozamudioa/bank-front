import { Injectable, signal, inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
@Injectable({ providedIn: 'root' })
export class OperationSafety {
  readonly locked = signal(false);
  readonly modalOpen = signal(false);
  constructor() {
    window.addEventListener('beforeunload', (e) => {
      if (this.locked()) {
        e.preventDefault();
        e.returnValue = '';
      }
    });
  }
}
export const operationGuard: CanDeactivateFn<unknown> = () =>
  !inject(OperationSafety).locked() && !inject(OperationSafety).modalOpen();
