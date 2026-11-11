import { DestroyRef, Injectable, inject, signal } from '@angular/core';
export interface SuccessToast {
  id: number;
  message: string;
}
@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly messages = signal<readonly SuccessToast[]>([]);
  private sequence = 0;
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();
  constructor() {
    inject(DestroyRef).onDestroy(() => this.timers.forEach((timer) => clearTimeout(timer)));
  }
  success(message: string) {
    if (this.messages().length >= 3) this.dismiss(this.messages()[0].id);
    const id = ++this.sequence;
    this.messages.update((items) => [...items, { id, message }]);
    this.timers.set(
      id,
      setTimeout(() => this.dismiss(id), 6000),
    );
  }
  dismiss(id: number) {
    clearTimeout(this.timers.get(id));
    this.timers.delete(id);
    this.messages.update((items) => items.filter((item) => item.id !== id));
  }
}
