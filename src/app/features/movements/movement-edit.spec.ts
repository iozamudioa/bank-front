import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MovementEdit } from './movement-edit';
import { HouseholdStore } from '../../core/config/household-store';
import { ModalState } from '../../shared/dialogs/modal-state';
import { MovementResponse } from '../../core/api/generated/models';
const path = '/api/v1/households/h/movements/m';
const effect = (entityId: string, change: number) => ({
  entityId,
  change,
  before: 1000,
  after: 1000 + change,
});
const movement = (
  type: MovementResponse['type'],
  patch: Partial<MovementResponse> = {},
): MovementResponse => ({
  id: 'm',
  householdId: 'h',
  type,
  status: 'POSTED',
  amount: 100,
  description: 'Original',
  actor: 'u',
  occurredAt: '2026-11-01T18:00:00Z',
  periodId: 'closed',
  incomeSourceId: null,
  targetEnvelopeId: null,
  reversalOf: null,
  funding: [],
  accountEffects: [],
  envelopeEffects: [],
  ...patch,
});
describe('Modal de edición de movimientos', () => {
  let s: HouseholdStore,
    http: HttpTestingController,
    modal: ModalState,
    fixture: ComponentFixture<MovementEdit>,
    c: MovementEdit;
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MovementEdit],
      providers: [provideHttpClient(), provideHttpClientTesting(), ModalState],
    });
    s = TestBed.inject(HouseholdStore);
    http = TestBed.inject(HttpTestingController);
    modal = TestBed.inject(ModalState);
    modal.requestClose = vi.fn();
    s.householdId.set('h');
    s.periods.set([
      {
        id: 'open',
        householdId: 'h',
        startDate: '2026-11-16',
        endDate: '2026-11-30',
        status: 'OPEN',
        expectedIncome: 1000,
        lines: [],
      },
    ]);
    s.periodId.set('closed');
    s.accounts.set([
      {
        id: 'a',
        householdId: 'h',
        name: 'Banco',
        type: 'DIGITAL',
        balance: 0,
        version: 0,
        active: true,
      },
    ]);
    s.envelopes.set(
      ['e', 'donor', 'to'].map((id) => ({
        id,
        householdId: 'h',
        accountId: 'a',
        name: id,
        type: 'SPENDING',
        category: null,
        habitualAmount: null,
        balance: 0,
        version: 0,
        active: true,
      })),
    );
    vi.spyOn(s, 'refresh').mockResolvedValue();
  });
  afterEach(() => {
    try {
      http.verify();
    } finally {
      TestBed.resetTestingModule();
    }
  });
  async function setup(original: MovementResponse) {
    fixture = TestBed.createComponent(MovementEdit);
    fixture.componentRef.setInput('movementId', 'm');
    c = fixture.componentInstance;
    fixture.detectChanges();
    http.expectOne(path).flush(original);
    await fixture.whenStable();
    fixture.detectChanges();
    const sources = http.match('/api/v1/households/h/income-sources');
    sources.forEach((req) => req.flush([{ id: 'payroll', name: 'Nómina' }]));
    await fixture.whenStable();
    fixture.detectChanges();
    c.meta.controls.reason.setValue('Corrección de captura');
  }
  function previewResponse() {
    return {
      originalId: 'm',
      accountEffects: [{ entityId: 'a', before: 0, change: 100, after: 100 }],
      envelopeEffects: [],
    };
  }
  it('precarga un ingreso de quincena cerrada y revisa solo el efecto neto sin exigir dinero para deshacerlo primero', async () => {
    await setup(
      movement('INCOME', { incomeSourceId: 'payroll', accountEffects: [effect('a', 100)] }),
    );
    expect(c.income()!.form.getRawValue()).toEqual({
      accountId: 'a',
      incomeSourceId: 'payroll',
      amount: '100.00',
      description: 'Original',
    });
    expect(c.meta.controls.periodId.value).toBe('open');
    expect(s.periodId()).toBe('closed');
    c.income()!.form.controls.amount.setValue('200.00');
    const work = c.review();
    const req = http.expectOne(path + '/corrections/preview');
    expect(req.request.headers.has('Idempotency-Key')).toBe(false);
    expect(req.request.body).toEqual({
      periodId: 'open',
      reason: 'Corrección de captura',
      replacement: {
        type: 'INCOME',
        accountId: 'a',
        incomeSourceId: 'payroll',
        amount: 200,
        description: 'Original',
      },
    });
    req.flush(previewResponse());
    await work;
    fixture.detectChanges();
    expect(c.c.reviewing()).toBe(true);
    expect(c.effects()[0]).toMatchObject({ name: 'Banco', before: 0, change: 100, after: 100 });
    expect(fixture.nativeElement.textContent).toContain('Resultado neto');
    http.expectNone((r) => r.url.endsWith('/reverse') || r.url.endsWith('/incomes'));
    const done = c.c.confirm();
    void c.c.confirm();
    http.expectOne(path + '/corrections').flush({});
    await done;
    expect(modal.requestClose).toHaveBeenCalledWith({
      successMessage: 'Movimiento actualizado correctamente.',
    });
    expect(s.refresh).toHaveBeenCalledTimes(1);
  });
  it('Enter en el formulario reutilizado consulta la corrección y nunca registra un movimiento nuevo', async () => {
    await setup(movement('ALLOCATE', { envelopeEffects: [effect('e', 100)] }));
    fixture.nativeElement
      .querySelector('app-allocation-form form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    const req = http.expectOne(path + '/corrections/preview');
    expect(req.request.body.replacement).toMatchObject({
      type: 'ALLOCATE',
      envelopeId: 'e',
      amount: 100,
    });
    req.flush({ originalId: 'm', accountEffects: [], envelopeEffects: [effect('e', 0)] });
    await fixture.whenStable();
    fixture.detectChanges();
    http.expectNone('/api/v1/households/h/movements/allocations');
    c.cancel();
  });
  it('conserva la financiación completa de un gasto aunque los sobres no tengan saldo actual', async () => {
    await setup(
      movement('EXPENSE', {
        targetEnvelopeId: 'e',
        funding: [
          { envelopeId: 'e', amount: 40 },
          { envelopeId: 'donor', amount: 60 },
        ],
        envelopeEffects: [effect('e', -40), effect('donor', -60)],
      }),
    );
    expect(c.funding.getRawValue()).toEqual([
      { envelopeId: 'e', amount: '40.00' },
      { envelopeId: 'donor', amount: '60.00' },
    ]);
    const work = c.review();
    const req = http.expectOne(path + '/corrections/preview');
    expect(req.request.body.replacement.fundingSources).toEqual([
      { envelopeId: 'e', amount: 40 },
      { envelopeId: 'donor', amount: 60 },
    ]);
    req.flush({ originalId: 'm', accountEffects: [], envelopeEffects: [] });
    await work;
    c.cancel();
  });
  it('permite convertir un gasto de sobre en gasto de cuenta con un reemplazo completo', async () => {
    await setup(
      movement('EXPENSE', { targetEnvelopeId: 'e', funding: [{ envelopeId: 'e', amount: 100 }] }),
    );
    c.expenseForm.patchValue({ origin: 'account', accountId: 'a', amount: '75.50' });
    const work = c.review();
    const req = http.expectOne(path + '/corrections/preview');
    expect(req.request.body.replacement).toEqual({
      type: 'ACCOUNT_EXPENSE',
      accountId: 'a',
      amount: 75.5,
      description: 'Original',
    });
    req.flush(previewResponse());
    await work;
    c.cancel();
  });
  it.each([0, 409, 503])(
    'un error %s conserva la operación y la misma clave/cuerpo incluso después de refrescar',
    async (status) => {
      await setup(movement('TRANSFER', { accountEffects: [effect('a', -100), effect('b', 100)] }));
      const review = c.review();
      http.expectOne(path + '/corrections/preview').flush(previewResponse());
      await review;
      const first = c.c.confirm();
      const req = http.expectOne(path + '/corrections'),
        key = req.request.headers.get('Idempotency-Key'),
        body = req.request.body;
      if (status === 0) req.error(new ProgressEvent('error'));
      else req.flush({}, { status, statusText: 'Failure' });
      await first;
      fixture.detectChanges();
      expect(c.c.uncertain()).toBe(true);
      expect(modal.requestClose).not.toHaveBeenCalled();
      c.cancel();
      expect(c.c.reviewing()).toBe(true);
      c.transfer()!.form.patchValue({ amount: '999.00', description: 'No debe enviarse' });
      c.meta.controls.reason.setValue('Otro motivo');
      const retry = c.c.confirm();
      const repeated = http.expectOne(path + '/corrections');
      expect(repeated.request.headers.get('Idempotency-Key')).toBe(key);
      expect(repeated.request.body).toEqual(body);
      repeated.flush({});
      await retry;
      expect(modal.requestClose).toHaveBeenCalledTimes(1);
    },
  );
  it('mantiene el formulario y el mensaje local ante un 400 sin anunciar éxito', async () => {
    await setup(movement('RELEASE', { envelopeEffects: [effect('e', -100)] }));
    const review = c.review();
    http.expectOne(path + '/corrections/preview').flush(previewResponse());
    await review;
    const work = c.c.confirm();
    http.expectOne(path + '/corrections').flush({}, { status: 400, statusText: 'Bad Request' });
    await work;
    fixture.detectChanges();
    expect(c.release()!.form.controls.amount.value).toBe('100.00');
    expect(c.c.message()).toContain('Revisa los datos');
    expect(c.c.reviewing()).toBe(false);
    expect(modal.requestClose).not.toHaveBeenCalled();
  });
  it('rechaza una fila ya revertida al recuperar el detalle actual', async () => {
    await setup(movement('INCOME', { status: 'REVERSED', accountEffects: [effect('a', 100)] }));
    expect(c.seed()).toBeNull();
    expect(c.c.message()).toContain('no admite edición');
    await c.review();
    http.expectNone(path + '/corrections/preview');
  });
  it('no confirma si el preview no corresponde al movimiento y conserva la edición', async () => {
    await setup(
      movement('ENVELOPE_TRANSFER', { envelopeEffects: [effect('e', -100), effect('to', 100)] }),
    );
    const work = c.review();
    http
      .expectOne(path + '/corrections/preview')
      .flush({ ...previewResponse(), originalId: 'other' });
    await work;
    expect(c.c.reviewing()).toBe(false);
    expect(c.c.message()).toContain('resultado');
    expect(modal.requestClose).not.toHaveBeenCalled();
  });
  it('gasto por cero envia financiacion vacia, muestra devolucion neta y conserva clave y cuerpo al reintentar', async () => {
    await setup(
      movement('EXPENSE', {
        targetEnvelopeId: 'e',
        funding: [
          { envelopeId: 'e', amount: 40 },
          { envelopeId: 'donor', amount: 60 },
        ],
        accountEffects: [effect('a', -100)],
      }),
    );
    c.expenseForm.controls.amount.setValue('0.00');
    fixture.detectChanges();
    expect(c.expenseForm.valid).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('No se aplican aportaciones nuevas');
    const work = c.review();
    const preview = http.expectOne(path + '/corrections/preview');
    expect(preview.request.body.replacement.amount).toBe(0);
    expect(preview.request.body.replacement.fundingSources).toEqual([]);
    preview.flush({
      originalId: 'm',
      accountEffects: [effect('a', 100)],
      envelopeEffects: [effect('e', 40), effect('donor', 60)],
    });
    await work;
    expect(c.effects().some((e) => e.change === 100)).toBe(true);
    const confirm = c.c.confirm();
    const request = http.expectOne(path + '/corrections');
    const key = request.request.headers.get('Idempotency-Key');
    const body = request.request.body;
    request.flush({}, { status: 503, statusText: 'Unavailable' });
    await confirm;
    c.expenseForm.controls.amount.setValue('999.00');
    const retry = c.c.confirm();
    const repeated = http.expectOne(path + '/corrections');
    expect(repeated.request.headers.get('Idempotency-Key')).toBe(key);
    expect(repeated.request.body).toEqual(body);
    repeated.flush({});
    await retry;
    expect(modal.requestClose).toHaveBeenCalledTimes(1);
  });
  it('reabre una transferencia cero desde recursos explicitos y permite volver a enviarla por cero', async () => {
    await setup(
      movement('TRANSFER', {
        amount: 0,
        replacement: {
          type: 'TRANSFER',
          amount: 0,
          description: 'Cero',
          fromAccountId: 'a',
          toAccountId: 'b',
        },
      }),
    );
    expect(c.transfer()!.form.controls.fromAccountId.value).toBe('a');
    expect(c.transfer()!.form.controls.toAccountId.value).toBe('b');
    expect(c.transfer()!.form.controls.amount.value).toBe('0.00');
    expect(c.transfer()!.form.valid).toBe(true);
    const work = c.review();
    const preview = http.expectOne(path + '/corrections/preview');
    expect(preview.request.body.replacement).toMatchObject({
      type: 'TRANSFER',
      amount: 0,
      fromAccountId: 'a',
      toAccountId: 'b',
    });
    preview.flush(previewResponse());
    await work;
  });
});
