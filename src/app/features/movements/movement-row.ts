import { Component, computed, inject, input, effect, signal } from '@angular/core';
import { IconName } from '../../core/icons/icon-names';
import { DatePipe } from '@angular/common';
import { MovementResponse } from '../../core/api/generated/models';
import { HouseholdStore } from '../../core/config/household-store';
import { OperationSafety } from '../../core/config/operation-safety';
import { ModalService } from '../../shared/dialogs/modal.service';
import { Icon } from '../../shared/components/icon/icon';
import { MovementAmount } from './movement-amount';
import { canCorrect } from './movement-correction';
import { movementLocation, movementTitle } from './movement-location';
@Component({
  selector: 'app-movement-row',
  imports: [DatePipe, Icon, MovementAmount],
  templateUrl: './movement-row.html',
  styleUrl: './movement-row.scss',
})
export class MovementRow {
  readonly movement = input.required<MovementResponse>();
  readonly related = input<readonly MovementResponse[]>([]);
  private readonly fetchedOriginal = signal<MovementResponse | null>(null);
  readonly original = computed(
    () => this.related().find((m) => m.id === this.movement().reversalOf) ?? this.fetchedOriginal(),
  );
  readonly s = inject(HouseholdStore);
  readonly safety = inject(OperationSafety);
  readonly modals = inject(ModalService);
  readonly title = computed(() =>
    movementTitle(
      this.movement(),
      this.original(),
      movementLocation(this.original() ?? this.movement(), this.s.accounts(), this.s.envelopes()),
    ),
  );
  readonly description = computed(() => this.movement().description?.trim() || '—');
  readonly icon = computed<IconName>(
    () =>
      (
        ({
          REVERSAL: 'undo',
          EXPENSE: 'receipt_long',
          ALLOCATE: 'savings',
          INCOME: 'payments',
          TRANSFER: 'account_balance',
          REALLOCATE: 'swap_horiz',
          ENVELOPE_TRANSFER: 'mail',
          RELEASE: 'arrow_outward',
          OPENING_BALANCE: 'account_balance_wallet',
        }) as const
      )[this.movement().type],
  );
  constructor() {
    effect((onCleanup) => {
      const m = this.movement();
      const household = this.s.householdId();
      this.fetchedOriginal.set(null);
      if (
        m.type !== 'REVERSAL' ||
        !m.reversalOf ||
        !household ||
        this.related().some((row) => row.id === m.reversalOf)
      )
        return;
      const subscription = this.s.api.getMovement(household, m.reversalOf).subscribe({
        next: (original) => {
          if (original.id === m.reversalOf && original.householdId === household)
            this.fetchedOriginal.set(original);
        },
        error: () => {
          /* Keep the reversal visible when its original cannot be read. */
        },
      });
      onCleanup(() => subscription.unsubscribe());
    });
  }
  readonly location = computed(() =>
    movementLocation(this.original() ?? this.movement(), this.s.accounts(), this.s.envelopes()),
  );
  readonly editable = computed(() => canCorrect(this.movement()));
  readonly reversible = computed(
    () => this.movement().status === 'POSTED' && this.movement().type !== 'REVERSAL',
  );
}
