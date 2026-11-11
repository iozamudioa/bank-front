import { MovementRow } from './movement-row';
import { Icon } from '../../shared/components/icon/icon';
import { ModalService } from '../../shared/dialogs/modal.service';
import { OperationSafety } from '../../core/config/operation-safety';
import { Component, inject, signal, effect } from '@angular/core';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { HouseholdStore } from '../../core/config/household-store';
import { MovementResponse } from '../../core/api/generated/models';
import { errorMessage } from '../../core/errors/message';
@Component({
  imports: [MovementRow, Icon, ReactiveFormsModule],
  templateUrl: './movements.html',
  styleUrl: './movements.scss',
})
export class Movements {
  readonly modals = inject(ModalService);
  readonly safety = inject(OperationSafety);
  readonly s = inject(HouseholdStore);
  readonly rows = signal<MovementResponse[]>([]);
  readonly error = signal('');
  readonly busy = signal(false);
  readonly page = signal(0);

  readonly route = inject(ActivatedRoute);
  private request = 0;
  readonly form = inject(FormBuilder).nonNullable.group({
    periodId: [''],
    accountId: [this.route.snapshot.queryParamMap.get('accountId') || ''],
    envelopeId: [this.route.snapshot.queryParamMap.get('envelopeId') || ''],
  });
  constructor() {
    effect(() => {
      this.s.revision();
      if (this.safety.locked()) return;
      if (this.s.householdId()) void this.load(0);
    });
  }
  async load(page: number) {
    const request = ++this.request;
    this.busy.set(true);
    this.error.set('');
    this.rows.set([]);
    const query: Record<string, string> = { page: String(page), size: '25' };
    for (const [k, v] of Object.entries(this.form.getRawValue())) if (v) query[k] = v;
    try {
      const data = await firstValueFrom(this.s.api.listMovements(this.s.householdId(), query));
      if (request === this.request) {
        this.rows.set(data);
        this.page.set(page);
      }
    } catch (e) {
      if (request === this.request) this.error.set(errorMessage(e));
    } finally {
      if (request === this.request) this.busy.set(false);
    }
  }
}
