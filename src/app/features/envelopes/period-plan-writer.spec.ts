import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { PeriodPlanWriter, periodPlanError } from './period-plan-writer';
import { HouseholdStore } from '../../core/config/household-store';
import { BudgetPeriodResponse } from '../../core/api/generated/models';
const base = '/api/v1/households/h/budget-periods/p';
const period: BudgetPeriodResponse = {
  id: 'p',
  householdId: 'h',
  startDate: '2026-11-01',
  endDate: '2026-11-15',
  status: 'OPEN',
  expectedIncome: 5000,
  lines: [{ envelopeId: 'other', amount: 200 }],
};
describe('Guardar solo la línea planeada de una quincena abierta', () => {
  let writer: PeriodPlanWriter, http: HttpTestingController, s: HouseholdStore;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    writer = TestBed.inject(PeriodPlanWriter);
    http = TestBed.inject(HttpTestingController);
    s = TestBed.inject(HouseholdStore);
    s.householdId.set('h');
    s.periods.set([period]);
    s.accounts.set([
      {
        id: 'a',
        name: 'Banco',
        balance: 5000,
        type: 'DIGITAL',
        householdId: 'h',
        active: true,
        version: 0,
      },
    ]);
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
  });
  afterEach(() => {
    try {
      http.verify();
    } finally {
      TestBed.resetTestingModule();
    }
  });
  it('envía un PUT por línea, permite cero y refleja únicamente la respuesta confirmada sin mover dinero', async () => {
    const balances = { accounts: s.accounts(), envelopes: s.envelopes() };
    const work = writer.save('h', 'p', 'e', '0.00');
    http.expectOne(base).flush(period);
    await Promise.resolve();
    await Promise.resolve();
    const put = http.expectOne(base + '/lines/e');
    expect(put.request.method).toBe('PUT');
    expect(put.request.body).toEqual({ amount: 0 });
    expect(put.request.headers.has('Idempotency-Key')).toBe(false);
    const updated = { ...period, lines: [...period.lines, { envelopeId: 'e', amount: 0 }] };
    put.flush(updated);
    await work;
    expect(s.periods()[0]).toEqual(updated);
    expect(s.accounts()).toEqual(balances.accounts);
    expect(s.envelopes()).toEqual(balances.envelopes);
    http.expectNone((r) => /movements|budget-template/.test(r.url));
  });
  it.each(['CLOSED', 'DRAFT'] as const)(
    'no envía PUT si el estado confirmado es %s',
    async (status) => {
      const work = writer.save('h', 'p', 'e', '100').catch(periodPlanError);
      http.expectOne(base).flush({ ...period, status });
      expect(await work).toContain('ya no está abierta');
      http.expectNone((r) => r.method === 'PUT');
      expect(s.periods()[0].status).toBe(status);
    },
  );
  it('consulta el periodo tras un 409, conserva otras líneas y espera un reintento explícito', async () => {
    const work = writer.save('h', 'p', 'e', '100').catch(periodPlanError);
    http.expectOne(base).flush(period);
    await Promise.resolve();
    await Promise.resolve();
    http.expectOne(base + '/lines/e').flush({}, { status: 409, statusText: 'Conflict' });
    await Promise.resolve();
    await Promise.resolve();
    const concurrent = { ...period, lines: [{ envelopeId: 'other', amount: 250 }] };
    http.expectOne(base).flush(concurrent);
    expect(await work).toContain('El plan cambió');
    expect(s.periods()[0]).toEqual(concurrent);
    http.expectNone((r) => r.method === 'PUT');
  });
  it('informa si el periodo se cerró entre la consulta y el PUT', async () => {
    const work = writer.save('h', 'p', 'e', '100').catch(periodPlanError);
    http.expectOne(base).flush(period);
    await Promise.resolve();
    await Promise.resolve();
    http.expectOne(base + '/lines/e').flush({}, { status: 409, statusText: 'Conflict' });
    await Promise.resolve();
    await Promise.resolve();
    http.expectOne(base).flush({ ...period, status: 'CLOSED' });
    expect(await work).toContain('se cerró');
    http.expectNone((r) => r.method === 'PUT');
  });
});
