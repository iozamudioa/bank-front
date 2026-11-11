import { Icon } from '../../shared/components/icon/icon';
import { StatusLabel } from '../../shared/pipes/status-label';
import { ModalService } from '../../shared/dialogs/modal.service';
import { Component, inject, signal, effect } from '@angular/core';

import { firstValueFrom } from 'rxjs';
import { HouseholdStore } from '../../core/config/household-store';
import { HouseholdMemberResponse } from '../../core/api/generated/models';
import { errorMessage } from '../../core/errors/message';
@Component({
  selector: 'app-members',
  imports: [Icon, StatusLabel],
  templateUrl: './members.html',
  styleUrl: './members.scss',
})
export class Members {
  readonly modals = inject(ModalService);
  readonly s = inject(HouseholdStore);
  readonly rows = signal<HouseholdMemberResponse[]>([]);
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
      this.rows.set(await firstValueFrom(this.s.api.listHouseholdMembers(this.s.householdId())));
    } catch (e) {
      this.error.set(errorMessage(e));
    }
  }
}
