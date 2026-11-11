import { ModalViewport } from './modal-viewport';
import { Icon } from '../components/icon/icon';
import { Component, Type, inject, DestroyRef, HostListener } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { OperationSafety } from '../../core/config/operation-safety';
import { ModalState, ModalResult } from './modal-state';
export interface ModalData {
  title: string;
  component: Type<unknown>;
  inputs?: Record<string, unknown>;
  framed?: boolean;
}
@Component({
  host: { '[class.framed]': 'data.framed' },
  hostDirectives: [ModalViewport],
  imports: [Icon, NgComponentOutlet],
  providers: [ModalState],
  templateUrl: './modal-shell.html',
  styleUrl: './modal-shell.scss',
})
export class ModalShell {
  readonly data = inject<ModalData>(MAT_DIALOG_DATA);
  readonly state = inject(ModalState);
  readonly safety = inject(OperationSafety);
  readonly ref = inject(MatDialogRef<ModalShell>);
  constructor() {
    this.state.requestClose = (result) => this.close(result);
    this.ref
      .backdropClick()
      .pipe(takeUntilDestroyed(inject(DestroyRef)))
      .subscribe(() => this.close());
  }
  @HostListener('keydown.escape', ['$event']) escape(event: Event) {
    event.stopPropagation();
    this.close();
  }
  close(result?: ModalResult) {
    if (!this.state.busy() && !this.safety.locked()) this.ref.close(result);
  }
}
