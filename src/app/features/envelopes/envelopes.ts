import { OperationSafety } from '../../core/config/operation-safety';
import { Icon } from '../../shared/components/icon/icon';
import { Component, computed, inject } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HouseholdStore } from '../../core/config/household-store';
import { ModalService } from '../../shared/dialogs/modal.service';
@Component({
  selector: 'app-envelopes',
  imports: [Icon, CurrencyPipe, RouterLink],
  templateUrl: './envelopes.html',
  styleUrl: './envelopes.scss',
})
export class Envelopes {
  readonly s = inject(HouseholdStore);
  readonly modals = inject(ModalService);
  readonly safety = inject(OperationSafety);
  readonly hasOpenPeriod = computed(() => this.s.periods().some((p) => p.status === 'OPEN'));
  account(id: string) {
    return this.s.accounts().find((a) => a.id === id);
  }
}
