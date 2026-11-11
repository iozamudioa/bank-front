import { MoneyInput } from '../../shared/directives/money-input';
import { Icon } from '../../shared/components/icon/icon';
import { StatusLabel } from '../../shared/pipes/status-label';
import {
  Component,
  inject,
  computed,
  DestroyRef,
  input,
  effect,
  ElementRef,
  viewChild,
} from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ExpenseFacade } from './expense-facade';
import { FundingSelector } from './funding-selector';
import { validAmount } from '../../shared/utils/money';
@Component({
  imports: [MoneyInput, Icon, StatusLabel, CurrencyPipe, ReactiveFormsModule, FundingSelector],
  providers: [ExpenseFacade],
  templateUrl: './expense-page.html',
  styleUrl: './expense-page.scss',
})
export class ExpensePage {
  readonly envelopeId = input('');
  private readonly reviewElement = viewChild<ElementRef<HTMLElement>>('expenseReview');
  private readonly errorElement = viewChild<ElementRef<HTMLElement>>('expenseError');
  readonly f = inject(ExpenseFacade);
  readonly s = this.f.store;
  readonly form = inject(FormBuilder).nonNullable.group(
    {
      origin: ['envelope'],
      accountId: [''],
      targetEnvelopeId: [inject(ActivatedRoute).snapshot.queryParamMap.get('envelopeId') || ''],
      amount: [
        '',
        [
          Validators.required,
          (control) => (validAmount(String(control.value)) ? null : { amount: true }),
        ],
      ],
      description: ['', Validators.maxLength(500)],
    },
    {
      validators: (control) => {
        const value = control.getRawValue();
        return value.origin === 'account'
          ? value.accountId
            ? null
            : { account: true }
          : value.targetEnvelopeId
            ? null
            : { envelope: true };
      },
    },
  );
  readonly origin = toSignal(this.form.controls.origin.valueChanges, {
    initialValue: this.form.controls.origin.value,
  });
  private readonly accountId = toSignal(this.form.controls.accountId.valueChanges, {
    initialValue: this.form.controls.accountId.value,
  });
  private readonly selectedEnvelopeId = toSignal(this.form.controls.targetEnvelopeId.valueChanges, {
    initialValue: this.form.controls.targetEnvelopeId.value,
  });
  readonly selectedEnvelope = computed(() =>
    this.s.envelopes().find((e) => e.id === this.selectedEnvelopeId()),
  );
  readonly selectedAccount = computed(() =>
    this.s
      .accounts()
      .find(
        (a) =>
          a.id ===
          (this.origin() === 'account' ? this.accountId() : this.selectedEnvelope()?.accountId),
      ),
  );
  readonly selectedFree = computed(
    () =>
      this.s.dashboard()?.accounts.find((account) => account.id === this.selectedAccount()?.id)
        ?.free ?? null,
  );
  readonly amounts = computed(() => new Map(this.f.funding().map((v) => [v.envelopeId, v.amount])));
  constructor() {
    effect(() => {
      const hasReview = !!this.f.preview() || !!this.f.accountPreview();
      const target = this.f.error()
        ? this.errorElement()?.nativeElement
        : hasReview
          ? this.reviewElement()?.nativeElement
          : undefined;
      if (!target) return;
      const container = target.closest<HTMLElement>('.modal-body');
      if (!container) return;
      const bounds = container.getBoundingClientRect(),
        detail = target.getBoundingClientRect();
      if (detail.top < bounds.top || detail.bottom > bounds.bottom)
        container.scrollTop += detail.top - bounds.top - 16;
    });
    if (this.s.period()?.status !== 'OPEN') {
      const open = this.s.periods().find((p) => p.status === 'OPEN');
      if (open) this.s.periodId.set(open.id);
    }
    effect(() => {
      const id = this.envelopeId();
      if (id) this.form.controls.targetEnvelopeId.setValue(id);
    });
    this.form.valueChanges
      .pipe(takeUntilDestroyed(inject(DestroyRef)))
      .subscribe(() => this.f.reset());
  }
  async preview() {
    if (this.form.invalid || this.s.period()?.status !== 'OPEN') return;
    const v = this.form.getRawValue();
    const common = {
      amount: Number(v.amount),
      description: v.description,
      periodId: this.s.periodId(),
    };
    await this.f.calculate(
      v.origin === 'account'
        ? { ...common, accountId: v.accountId }
        : { ...common, targetEnvelopeId: v.targetEnvelopeId },
    );
  }
  balance(id: string) {
    const p = this.f.preview();
    return id === this.form.controls.targetEnvelopeId.value
      ? p?.targetBalance || 0
      : p?.eligibleDonors.find((d) => d.envelopeId === id)?.balance || 0;
  }
  name(id: string) {
    return this.s.envelopes().find((e) => e.id === id)?.name || id;
  }
}
