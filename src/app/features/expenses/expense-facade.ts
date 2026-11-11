import { ModalState } from '../../shared/dialogs/modal-state';
import { createIdempotencyKey } from '../../shared/utils/idempotency-key';
import { OperationSafety } from '../../core/config/operation-safety';
import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import Decimal from 'decimal.js';
import { HouseholdStore } from '../../core/config/household-store';
import { Connectivity } from '../../core/config/connectivity';
import {
  AccountExpensePreviewResponse,
  AccountExpenseRequest,
  ExpensePreviewResponse,
  ExpenseRequest,
  FundingRequest,
} from '../../core/api/generated/models';
import { errorMessage } from '../../core/errors/message';

export type AccountExpensePreview = Required<AccountExpensePreviewResponse>;
function accountPreview(
  response: AccountExpensePreviewResponse,
  request: AccountExpenseRequest,
): AccountExpensePreview {
  const { accountId, amount, totalBefore, freeBefore, totalAfter, freeAfter } = response;
  if (
    accountId !== request.accountId ||
    ![amount, totalBefore, freeBefore, totalAfter, freeAfter].every(
      (value) => typeof value === 'number' && Number.isFinite(value),
    ) ||
    amount !== request.amount ||
    totalAfter! < 0 ||
    freeAfter! < 0
  )
    throw new Error('Invalid account preview');
  return {
    accountId,
    amount: amount!,
    totalBefore: totalBefore!,
    freeBefore: freeBefore!,
    totalAfter: totalAfter!,
    freeAfter: freeAfter!,
  };
}

@Injectable()
export class ExpenseFacade {
  readonly modal = inject(ModalState, { optional: true });
  readonly safety = inject(OperationSafety);
  readonly store = inject(HouseholdStore);
  readonly connection = inject(Connectivity);
  readonly preview = signal<ExpensePreviewResponse | null>(null);
  readonly accountPreview = signal<AccountExpensePreview | null>(null);
  readonly funding = signal<NonNullable<FundingRequest>[]>([]);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly success = signal(false);
  readonly uncertain = signal(false);
  readonly covered = computed(
    () =>
      !!this.accountPreview() ||
      (!!this.preview() &&
        this.funding()
          .reduce((sum, source) => sum.plus(source.amount), new Decimal(0))
          .eq(this.preview()!.requestedAmount)),
  );
  private command: ExpenseRequest | AccountExpenseRequest | null = null;
  private submitted: ExpenseRequest | AccountExpenseRequest | null = null;
  private key = '';
  private household = '';
  reset() {
    if (this.busy() || this.uncertain()) return;
    this.preview.set(null);
    this.accountPreview.set(null);
    this.funding.set([]);
    this.command = null;
    this.submitted = null;
    this.success.set(false);
    this.error.set('');
  }
  async calculate(body: ExpenseRequest | AccountExpenseRequest) {
    if (this.busy() || this.uncertain() || !this.connection.online() || !this.store.householdId())
      return;
    this.reset();
    this.busy.set(true);
    this.modal?.busy.set(true);
    this.household = this.store.householdId();
    const request = structuredClone(body);
    try {
      if ('accountId' in request) {
        const response = await firstValueFrom(
          this.store.api.previewAccountExpense(this.household, request),
        );
        this.accountPreview.set(accountPreview(response, request));
      } else {
        const response = await firstValueFrom(
          this.store.api.previewExpense(this.household, request),
        );
        this.preview.set(response);
        const target = Decimal.min(response.targetBalance, response.requestedAmount).toNumber();
        this.funding.set(
          target > 0 ? [{ envelopeId: request.targetEnvelopeId, amount: target }] : [],
        );
      }
      this.command = request;
      this.key = createIdempotencyKey();
    } catch (error) {
      this.preview.set(null);
      this.accountPreview.set(null);
      this.command = null;
      this.error.set(errorMessage(error));
    } finally {
      this.busy.set(false);
      this.modal?.busy.set(false);
    }
  }
  setDonor(id: string, value: string) {
    if (this.busy() || this.uncertain()) return;
    const donor = this.preview()?.eligibleDonors.find((item) => item.envelopeId === id);
    if (!donor) return;
    const amount = /^\d+(\.\d{0,2})?$/.test(value) ? new Decimal(value || 0) : new Decimal(0);
    this.funding.update((funding) => [
      ...funding.filter((source) => source.envelopeId !== id),
      ...(amount.gt(0) && amount.lte(donor.balance)
        ? [{ envelopeId: id, amount: amount.toNumber() }]
        : []),
    ]);
  }
  amount(id: string) {
    return this.funding().find((source) => source.envelopeId === id)?.amount || '';
  }
  after(id: string, balance: number) {
    return new Decimal(balance)
      .minus(this.funding().find((source) => source.envelopeId === id)?.amount || 0)
      .toNumber();
  }
  async confirm() {
    if (this.busy() || !this.covered() || !this.command || !this.connection.online()) return;
    this.safety.locked.set(true);
    this.busy.set(true);
    this.modal?.busy.set(true);
    this.error.set('');
    this.submitted ??= structuredClone(
      'accountId' in this.command
        ? this.command
        : { ...this.command, fundingSources: this.funding() },
    );
    const body = this.submitted;
    try {
      if ('accountId' in body)
        await firstValueFrom(this.store.api.registerAccountExpense(this.household, body, this.key));
      else await firstValueFrom(this.store.api.registerExpense(this.household, body, this.key));
      this.uncertain.set(false);
      this.preview.set(null);
      this.accountPreview.set(null);
      this.command = null;
      this.submitted = null;
      await this.store.refresh();
      this.safety.locked.set(false);
      this.success.set(true);
      this.modal?.complete('Gasto registrado correctamente.');
    } catch (error) {
      this.error.set(errorMessage(error));
      if (
        error instanceof HttpErrorResponse &&
        (error.status === 0 || error.status === 409 || error.status >= 500)
      ) {
        this.uncertain.set(true);
        if (error.status === 409) await this.store.refresh();
      } else {
        this.safety.locked.set(false);
        this.uncertain.set(false);
        this.preview.set(null);
        this.accountPreview.set(null);
        this.command = null;
        this.submitted = null;
        await this.store.refresh();
      }
    } finally {
      this.modal?.busy.set(false);
      this.busy.set(false);
    }
  }
}
