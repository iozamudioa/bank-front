import { Component, computed, input } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { MovementResponse } from '../../core/api/generated/models';
import { movementDirection } from './movement-direction';
@Component({
  selector: 'app-movement-amount',
  imports: [CurrencyPipe],
  templateUrl: './movement-amount.html',
  styleUrl: './movement-amount.scss',
})
export class MovementAmount {
  readonly movement = input.required<MovementResponse>();
  readonly direction = computed(() => movementDirection(this.movement()));
}
