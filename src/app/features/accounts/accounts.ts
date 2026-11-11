import { Icon } from '../../shared/components/icon/icon';
import { Component, inject } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HouseholdStore } from '../../core/config/household-store';
import { ModalService } from '../../shared/dialogs/modal.service';
@Component({
  selector: 'app-accounts',
  imports: [Icon, CurrencyPipe, RouterLink],
  templateUrl: './accounts.html',
  styleUrl: './accounts.scss',
})
export class Accounts {
  readonly s = inject(HouseholdStore);
  readonly modals = inject(ModalService);
}
