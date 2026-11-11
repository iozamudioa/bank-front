import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { EnvelopePlanDialog } from './envelope-plan-dialog';
import { HouseholdStore } from '../../core/config/household-store';
import { ModalState } from '../../shared/dialogs/modal-state';
import { BudgetPeriodResponse } from '../../core/api/generated/models';
const period: BudgetPeriodResponse = {
  id: 'p',
  householdId: 'h',
  startDate: '2026-11-01',
  endDate: '2026-11-15',
  status: 'OPEN',
  expectedIncome: 5000,
  lines: [
    { envelopeId: 'e', amount: 75.25 },
    { envelopeId: 'other', amount: 200 },
  ],
};
const path = '/api/v1/households/h/budget-periods/p';
describe('Agregar y actualizar lo planeado de un sobre existente', () => {
  let s: HouseholdStore, http: HttpTestingController, modal: ModalState;
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [EnvelopePlanDialog],
      providers: [provideHttpClient(), provideHttpClientTesting(), ModalState],
    });
    s = TestBed.inject(HouseholdStore);
    http = TestBed.inject(HttpTestingController);
    modal = TestBed.inject(ModalState);
    modal.requestClose = vi.fn();
    s.householdId.set('h');
    s.periods.set([period]);
    s.envelopes.set([
      {
        id: 'e',
        name: 'Compras',
        balance: 300,
        accountId: 'a',
        householdId: 'h',
        active: true,
        type: 'SPENDING',
        category: null,
        habitualAmount: null,
        version: 0,
      },
    ]);
    vi.spyOn(s, 'refresh').mockResolvedValue();
  });
  afterEach(() => {
    try {
      http.verify();
    } finally {
      TestBed.resetTestingModule();
    }
  });
  async function setup() {
    const fixture = TestBed.createComponent(EnvelopePlanDialog);
    fixture.componentRef.setInput('envelopeId', 'e');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return { fixture, c: fixture.componentInstance, element: fixture.nativeElement as HTMLElement };
  }
  it('carga el importe del periodo abierto, no el saldo reservado', async () => {
    const { c, element } = await setup();
    expect(c.form.controls.amount.value).toBe('75.25');
    expect(element.querySelector<HTMLInputElement>('input')?.value).toBe('$75.25');
    expect(s.envelopes()[0].balance).toBe(300);
  });
  it('ofrece cero para agregar un plan cuando no existe una línea', async () => {
    s.periods.set([{ ...period, lines: [] }]);
    const { c } = await setup();
    expect(c.form.controls.amount.value).toBe('0.00');
  });
  it('actualiza solo esa línea mediante PUT, acepta cero y completa con el mensaje de éxito', async () => {
    const { c } = await setup();
    c.form.controls.amount.setValue('0.00');
    const work = c.save();
    void c.save();
    http.expectOne(path).flush(period);
    await Promise.resolve();
    await Promise.resolve();
    const put = http.expectOne(path + '/lines/e');
    expect(put.request.body).toEqual({ amount: 0 });
    const updated = {
      ...period,
      lines: [
        { envelopeId: 'e', amount: 0 },
        { envelopeId: 'other', amount: 200 },
      ],
    };
    put.flush(updated);
    await work;
    expect(s.periods()[0]).toEqual(updated);
    expect(s.envelopes()[0].balance).toBe(300);
    expect(modal.requestClose).toHaveBeenCalledWith({
      successMessage: 'Plan de quincena guardado correctamente.',
    });
    http.expectNone((r) => r.method === 'POST');
  });
  it('conserva la captura tras un conflicto y mantiene el modal abierto para revisar y reintentar', async () => {
    const { c, fixture } = await setup();
    c.form.controls.amount.setValue('32.10');
    const work = c.save();
    http.expectOne(path).flush(period);
    await Promise.resolve();
    await Promise.resolve();
    http.expectOne(path + '/lines/e').flush({}, { status: 409, statusText: 'Conflict' });
    await Promise.resolve();
    await Promise.resolve();
    http.expectOne(path).flush({
      ...period,
      lines: [
        { envelopeId: 'e', amount: 9 },
        { envelopeId: 'other', amount: 250 },
      ],
    });
    await work;
    fixture.detectChanges();
    expect(c.form.controls.amount.value).toBe('32.10');
    expect(c.error()).toContain('El plan cambió');
    expect(modal.requestClose).not.toHaveBeenCalled();
    expect(s.periods()[0].lines[1].amount).toBe(250);
    http.expectNone((r) => r.method === 'PUT');
  });
});
