import { Component, input, output } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { DonorOptionResponse } from '../../core/api/generated/models';
@Component({
  selector: 'app-funding-selector',
  imports: [CurrencyPipe],
  templateUrl: './funding-selector.html',
  styleUrl: './funding-selector.scss',
})
export class FundingSelector {
  readonly donors = input.required<DonorOptionResponse[]>();
  readonly disabled = input(false);
  readonly amounts = input.required<ReadonlyMap<string, number>>();
  readonly changed = output<{ id: string; value: string }>();
}
