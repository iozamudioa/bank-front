import { Component, inject } from '@angular/core';
import { ModalService } from '../../shared/dialogs/modal.service';
@Component({
  selector: 'app-onboarding',
  templateUrl: './onboarding.html',
  styleUrl: './onboarding.scss',
})
export class Onboarding {
  readonly modals = inject(ModalService);
}
