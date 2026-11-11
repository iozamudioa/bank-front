import { Injectable, signal } from '@angular/core';
export interface ModalResult {
  successMessage: string;
  periodSetupId?: string;
}
@Injectable()
export class ModalState {
  readonly busy = signal(false);
  requestClose: (result?: ModalResult) => void = () => {};
  complete(message = 'Operación completada correctamente.', periodSetupId?: string) {
    this.busy.set(false);
    this.requestClose(
      periodSetupId ? { successMessage: message, periodSetupId } : { successMessage: message },
    );
  }
}
