import { MovementRow } from '../movements/movement-row';
import { Icon } from '../../shared/components/icon/icon';
import { Component, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { HouseholdStore } from '../../core/config/household-store';
import { MovementResponse } from '../../core/api/generated/models';
import { errorMessage } from '../../core/errors/message';
@Component({
  selector: 'app-recent-activity',
  imports: [MovementRow, Icon, RouterLink],
  templateUrl: './recent-activity.html',
  styleUrl: './recent-activity.scss',
})
export class RecentActivity {
  readonly s = inject(HouseholdStore);
  readonly rows = signal<MovementResponse[]>([]);
  readonly error = signal('');
  readonly busy = signal(false);
  private request = 0;
  constructor() {
    effect(() => {
      const id = this.s.householdId();
      this.s.revision();
      if (id) void this.load(id);
    });
  }
  async load(id: string) {
    const request = ++this.request;
    this.busy.set(true);
    this.error.set('');
    this.rows.set([]);
    try {
      const rows = await firstValueFrom(this.s.api.listMovements(id, { page: '0', size: '5' }));
      if (request === this.request) this.rows.set(rows);
    } catch (e) {
      if (request === this.request) this.error.set(errorMessage(e));
    } finally {
      if (request === this.request) this.busy.set(false);
    }
  }
}
