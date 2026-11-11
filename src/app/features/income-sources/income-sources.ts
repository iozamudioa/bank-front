import { Icon } from '../../shared/components/icon/icon';
import { ModalService } from '../../shared/dialogs/modal.service';
import { Component, inject, signal, effect } from '@angular/core';
import { CurrencyPipe } from '@angular/common';

import { firstValueFrom } from 'rxjs';
import { HouseholdStore } from '../../core/config/household-store';
import { IncomeSourceResponse } from '../../core/api/generated/models';
import { errorMessage } from '../../core/errors/message';

@Component({
  selector: 'app-income-sources',
  imports: [Icon, CurrencyPipe],
  templateUrl: './income-sources.html',
  styleUrl: './income-sources.scss',
})
export class IncomeSources {
  readonly modals = inject(ModalService);
  readonly s = inject(HouseholdStore);
  readonly rows = signal<IncomeSourceResponse[]>([]);
  readonly error = signal('');
  readonly busy = signal(false);
  constructor() {
    effect(() => {
      const id = this.s.householdId();
      this.s.revision();
      if (id) void this.load();
    });
  }
  async load() {
    try {
      this.rows.set(await firstValueFrom(this.s.api.listIncomeSources(this.s.householdId())));
    } catch (e) {
      this.error.set(errorMessage(e));
    }
  }
}
