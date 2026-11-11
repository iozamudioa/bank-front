import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { ReverseForm } from './reverse-form';
import { HouseholdStore } from '../../core/config/household-store';
import { ModalState } from '../../shared/dialogs/modal-state';
import { MovementResponse } from '../../core/api/generated/models';
const original: MovementResponse = {
  id: 'm',
  householdId: 'h',
  type: 'EXPENSE',
  status: 'POSTED',
  amount: 50,
  description: 'Carne',
  occurredAt: '2026-11-11T18:00:00Z',
  actor: 'u',
  periodId: 'closed',
  incomeSourceId: null,
  targetEnvelopeId: 'e',
  reversalOf: null,
  funding: [],
  accountEffects: [],
  envelopeEffects: [],
};
describe('Modal de reversión', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [ReverseForm],
      providers: [provideHttpClient(), provideHttpClientTesting(), ModalState],
    }),
  );
  afterEach(() => {
    try {
      TestBed.inject(HttpTestingController).verify();
    } finally {
      TestBed.resetTestingModule();
    }
  });
  async function setup(m = original) {
    const s = TestBed.inject(HouseholdStore);
    s.householdId.set('h');
    s.periodId.set('closed');
    s.periods.set([
      {
        id: 'open',
        householdId: 'h',
        startDate: '2026-11-16',
        endDate: '2026-11-30',
        status: 'OPEN',
        expectedIncome: 0,
        lines: [],
      },
    ]);
    vi.spyOn(s, 'refresh').mockResolvedValue();
    const modal = TestBed.inject(ModalState);
    modal.requestClose = vi.fn();
    const f = TestBed.createComponent(ReverseForm);
    f.componentRef.setInput('movementId', 'm');
    f.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/v1/households/h/movements/m').flush(m);
    await f.whenStable();
    f.detectChanges();
    return { f, c: f.componentInstance, s, modal, http };
  }
  it('pide motivo y confirmación; reintenta sin duplicar la reversión y cierra con éxito', async () => {
    const { c, s, modal, http } = await setup();
    c.review();
    http.expectNone((r) => r.method === 'POST');
    c.form.controls.reason.setValue('  Error de captura  ');
    c.review();
    http.expectNone((r) => r.method === 'POST');
    const first = c.c.confirm();
    const req = http.expectOne('/api/v1/households/h/movements/m/reverse'),
      key = req.request.headers.get('Idempotency-Key');
    expect(req.request.body).toEqual({ periodId: 'open', reason: 'Error de captura' });
    req.flush({}, { status: 503, statusText: 'Unavailable' });
    await first;
    expect(c.c.uncertain()).toBe(true);
    expect(modal.requestClose).not.toHaveBeenCalled();
    c.c.cancel();
    expect(c.c.reviewing()).toBe(true);
    c.form.controls.reason.setValue('No enviar');
    const retry = c.c.confirm();
    const again = http.expectOne('/api/v1/households/h/movements/m/reverse');
    expect(again.request.headers.get('Idempotency-Key')).toBe(key);
    expect(again.request.body).toEqual({ periodId: 'open', reason: 'Error de captura' });
    again.flush({});
    await retry;
    expect(s.periodId()).toBe('closed');
    expect(modal.requestClose).toHaveBeenCalledWith({
      successMessage: 'Movimiento revertido correctamente.',
    });
  });
  it('no permite revertir una fila obsoleta ya revertida', async () => {
    const { c, http } = await setup({ ...original, status: 'REVERSED' });
    expect(c.original()).toBeNull();
    expect(c.c.message()).toContain('no se puede revertir');
    c.form.patchValue({ periodId: 'open', reason: 'Error' });
    c.review();
    http.expectNone((r) => r.method === 'POST');
  });
});
