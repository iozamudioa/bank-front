import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { EnvelopeCreate } from './envelope-create';
import { HouseholdStore } from '../../core/config/household-store';
import { ModalState } from '../../shared/dialogs/modal-state';
import { BudgetPeriodResponse, EnvelopeResponse } from '../../core/api/generated/models';
const path = '/api/v1/households/h';
const period: BudgetPeriodResponse = {
  id: 'p',
  householdId: 'h',
  startDate: '2026-11-16',
  endDate: '2026-11-30',
  status: 'OPEN',
  expectedIncome: 5000,
  lines: [{ envelopeId: 'other', amount: 200 }],
};
const created: EnvelopeResponse = {
  id: 'new',
  name: 'Nuevo',
  accountId: 'a',
  householdId: 'h',
  active: true,
  type: 'SPENDING',
  category: null,
  habitualAmount: null,
  balance: 0,
  version: 0,
};
describe('Crear sobre con plan opcional para la quincena abierta', () => {
  let s: HouseholdStore, http: HttpTestingController, modal: ModalState;
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [EnvelopeCreate],
      providers: [provideHttpClient(), provideHttpClientTesting(), ModalState],
    });
    s = TestBed.inject(HouseholdStore);
    http = TestBed.inject(HttpTestingController);
    modal = TestBed.inject(ModalState);
    modal.requestClose = vi.fn();
    s.householdId.set('h');
    s.periods.set([
      { ...period, id: 'closed', status: 'CLOSED', startDate: '2026-11-01', endDate: '2026-11-15' },
      period,
    ]);
    s.periodId.set('closed');
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
    vi.spyOn(s, 'refresh').mockResolvedValue();
  });
  afterEach(() => {
    try {
      http.verify();
    } finally {
      TestBed.resetTestingModule();
    }
  });
  function setup() {
    const fixture = TestBed.createComponent(EnvelopeCreate);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    c.form.patchValue({ name: 'Nuevo', accountId: 'a' });
    fixture.detectChanges();
    return { fixture, c, element: fixture.nativeElement as HTMLElement };
  }
  async function finishPlan(amount: number) {
    http.expectOne(path + '/budget-periods/p').flush(period);
    await Promise.resolve();
    await Promise.resolve();
    const put = http.expectOne(path + '/budget-periods/p/lines/new');
    expect(put.request.method).toBe('PUT');
    expect(put.request.body).toEqual({ amount });
    put.flush({ ...period, lines: [...period.lines, { envelopeId: 'new', amount }] });
  }
  it('precarga la única abierta aunque el dashboard esté en un periodo cerrado', () => {
    const { c, element } = setup();
    expect(c.form.controls.plan.controls.periodId.value).toBe('p');
    expect(element.querySelector('app-period-plan-fields option[value="closed"]')).toBeNull();
    expect(c.form.controls.plan.controls.amount.value).toBe('');
    expect(s.periodId()).toBe('closed');
  });
  it('permite omitir el plan y conserva el cuerpo del alta original', async () => {
    const { c } = setup();
    const work = c.create();
    const post = http.expectOne(path + '/envelopes');
    expect(post.request.body).toEqual({
      name: 'Nuevo',
      accountId: 'a',
      category: '',
      habitualAmount: 0,
      type: 'SPENDING',
    });
    post.flush(created);
    await work;
    http.expectNone((r) => r.method === 'PUT');
    expect(modal.requestClose).toHaveBeenCalledWith({
      successMessage: 'Sobre creado correctamente.',
    });
  });
  it('crea una sola vez, guarda el plan y solo completa cuando ambas operaciones terminan', async () => {
    const { c } = setup();
    c.form.controls.plan.controls.amount.setValue('1500.50');
    const work = c.create();
    void c.create();
    http.expectOne(path + '/envelopes').flush(created);
    await Promise.resolve();
    await Promise.resolve();
    expect(modal.requestClose).not.toHaveBeenCalled();
    await finishPlan(1500.5);
    await work;
    expect(modal.requestClose).toHaveBeenCalledWith({
      successMessage: 'Sobre creado y plan de quincena guardado.',
    });
    expect(s.periodId()).toBe('p');
    expect(s.periods().find((p) => p.id === 'p')?.lines).toEqual([
      ...period.lines,
      { envelopeId: 'new', amount: 1500.5 },
    ]);
    expect(s.accounts()[0].balance).toBe(5000);
    http.expectNone((r) => /movements|budget-template/.test(r.url));
  });
  it('si falla el plan conserva el id, mantiene el modal y reintenta sin repetir el alta', async () => {
    const { c, fixture, element } = setup();
    c.form.controls.plan.controls.amount.setValue('100');
    const work = c.create();
    http.expectOne(path + '/envelopes').flush(created);
    await Promise.resolve();
    await Promise.resolve();
    http.expectOne(path + '/budget-periods/p').flush(period);
    await Promise.resolve();
    await Promise.resolve();
    http
      .expectOne(path + '/budget-periods/p/lines/new')
      .flush({}, { status: 503, statusText: 'Unavailable' });
    await work;
    fixture.detectChanges();
    expect(c.createdEnvelope()?.id).toBe('new');
    expect(c.error()).toContain('ya se creó');
    expect(modal.requestClose).not.toHaveBeenCalled();
    expect(element.querySelector('fieldset')?.disabled).toBe(true);
    c.form.controls.plan.controls.amount.setValue('');
    expect(c.form.invalid).toBe(true);
    c.form.controls.plan.controls.amount.setValue('100');
    const retry = c.create();
    await finishPlan(100);
    await retry;
    http.expectNone((r) => r.method === 'POST');
    expect(modal.requestClose).toHaveBeenCalledTimes(1);
  });
  it('si la quincena ya se cerró no escribe el plan y explica que el sobre está creado', async () => {
    const { c } = setup();
    c.form.controls.plan.controls.amount.setValue('100');
    const work = c.create();
    http.expectOne(path + '/envelopes').flush(created);
    await Promise.resolve();
    await Promise.resolve();
    http.expectOne(path + '/budget-periods/p').flush({ ...period, status: 'CLOSED' });
    await work;
    expect(c.error()).toContain('ya se creó');
    expect(c.error()).toContain('ya no está abierta');
    expect(c.createdEnvelope()?.id).toBe('new');
    expect(modal.requestClose).not.toHaveBeenCalled();
    http.expectNone((r) => r.method === 'PUT');
  });
  it('sin quincenas abiertas oculta el importe y permite crear sin plan', () => {
    s.periods.set([]);
    const { c, element } = setup();
    expect(element.querySelector('app-period-plan-fields input')).toBeNull();
    expect(element.textContent).toContain('No hay una quincena abierta');
    expect(c.form.valid).toBe(true);
  });
  it('con varias abiertas exige elegir cuál recibe el importe', () => {
    s.periods.set([period, { ...period, id: 'q', startDate: '2026-12-01', endDate: '2026-12-15' }]);
    const { c } = setup();
    expect(c.form.controls.plan.controls.periodId.value).toBe('');
    c.form.controls.plan.controls.amount.setValue('100');
    expect(c.form.invalid).toBe(true);
    void c.create();
    http.expectNone((r) => r.method === 'POST');
    c.form.controls.plan.controls.periodId.setValue('q');
    expect(c.form.valid).toBe(true);
  });
  it('acepta cero y bloquea importes inválidos o escrituras sin conexión', async () => {
    const { c } = setup();
    c.form.controls.plan.controls.amount.setValue('1.001');
    expect(c.form.invalid).toBe(true);
    c.form.controls.plan.controls.amount.setValue('0.00');
    expect(c.form.valid).toBe(true);
    c.connection.online.set(false);
    await c.create();
    http.expectNone((r) => r.method === 'POST');
  });

  it('crea el sobre y su habitual en un solo POST y reintenta con cuerpo y clave estables', async () => {
    const { c } = setup();
    c.form.controls.habitualAmount.setValue('4500.50');
    const first = c.create(),
      req = http.expectOne(path + '/envelopes'),
      key = req.request.headers.get('Idempotency-Key'),
      body = req.request.body;
    expect(body.habitualAmount).toBe(4500.5);
    expect(key).toBeTruthy();
    req.flush({}, { status: 503, statusText: 'Unavailable' });
    await first;
    expect(c.uncertain()).toBe(true);
    expect(modal.requestClose).not.toHaveBeenCalled();
    c.form.controls.habitualAmount.setValue('999.00');
    const retry = c.create(),
      again = http.expectOne(path + '/envelopes');
    expect(again.request.body).toEqual(body);
    expect(again.request.headers.get('Idempotency-Key')).toBe(key);
    again.flush({ ...created, habitualAmount: 4500.5 });
    await retry;
    expect(c.uncertain()).toBe(false);
    http.expectNone((r) => r.method === 'PUT');
    expect(modal.requestClose).toHaveBeenCalledTimes(1);
  });
});
