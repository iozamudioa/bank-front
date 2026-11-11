import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { PeriodSetup } from './period-setup';
import { EnvelopeCreate } from '../envelopes/envelope-create';
import { By } from '@angular/platform-browser';
import { HouseholdStore } from '../../core/config/household-store';
import { OperationSafety } from '../../core/config/operation-safety';
import { ModalState } from '../../shared/dialogs/modal-state';
import { ToastService } from '../../shared/notifications/toast.service';
import { BudgetPeriodResponse, EnvelopeResponse } from '../../core/api/generated/models';

const path = '/api/v1/households/h';
const period: BudgetPeriodResponse = {
  id: 'p',
  householdId: 'h',
  startDate: '2026-11-16',
  endDate: '2026-11-30',
  status: 'OPEN',
  expectedIncome: 5000,
  lines: [
    { envelopeId: 'e1', amount: 300 },
    { envelopeId: 'e2', amount: 200 },
  ],
};
const envelope = (id: string, name: string, balance: number, active = true): EnvelopeResponse => ({
  id,
  name,
  balance,
  active,
  accountId: 'a',
  householdId: 'h',
  type: 'SPENDING',
  category: null,
  habitualAmount: null,
  version: 0,
});

describe('Guía de preparación de quincena', () => {
  let s: HouseholdStore,
    http: HttpTestingController,
    fixture: ComponentFixture<PeriodSetup>,
    c: PeriodSetup,
    outer: ModalState,
    toasts: ToastService;
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PeriodSetup],
      providers: [provideHttpClient(), provideHttpClientTesting(), ModalState],
    });
    s = TestBed.inject(HouseholdStore);
    http = TestBed.inject(HttpTestingController);
    outer = TestBed.inject(ModalState);
    outer.requestClose = vi.fn();
    toasts = TestBed.inject(ToastService);
    s.householdId.set('h');
    s.periods.set([period, { ...period, id: 'another' }]);
    s.periodId.set('another');
    s.accounts.set([
      {
        id: 'a',
        name: 'Banco',
        type: 'DIGITAL',
        balance: 5000,
        active: true,
        householdId: 'h',
        version: 0,
      },
      {
        id: 'b',
        name: 'Efectivo',
        type: 'PHYSICAL',
        balance: 100,
        active: true,
        householdId: 'h',
        version: 0,
      },
    ]);
    s.dashboard.set({
      total: 5100,
      reserved: 600,
      free: 4500,
      accounts: [
        { id: 'a', name: 'Banco', type: 'DIGITAL', total: 5000, reserved: 600, free: 4400 },
        { id: 'b', name: 'Efectivo', type: 'PHYSICAL', total: 100, reserved: 0, free: 100 },
      ],
    });
    s.envelopes.set([
      envelope('e1', 'Comida', 100),
      envelope('e2', 'Renta', 500),
      envelope('e3', 'Transporte', 0),
      envelope('inactive', 'Archivado', 0, false),
    ]);
    vi.spyOn(s, 'refresh').mockResolvedValue();
    fixture = TestBed.createComponent(PeriodSetup);
    fixture.componentRef.setInput('periodId', 'p');
    c = fixture.componentInstance;
    fixture.detectChanges();
    http.expectOne(path + '/income-sources').flush([]);
    fixture.detectChanges();
  });
  afterEach(() => {
    try {
      http.verify();
    } finally {
      TestBed.inject(OperationSafety).locked.set(false);
      TestBed.resetTestingModule();
    }
  });
  function allocate() {
    c.go('allocate');
    fixture.detectChanges();
    return c.allocation()!;
  }

  it('fija la quincena nueva, recorre todos los sobres activos y precarga el plan completo aunque haya remanentes', () => {
    const form = allocate();
    expect(s.periodId()).toBe('p');
    expect(c.envelopes().map((e) => e.id)).toEqual(['e1', 'e2', 'e3']);
    expect(form.form.getRawValue()).toMatchObject({ envelopeId: 'e1', amount: '300.00' });
    expect(form.selectedAccount()?.free).toBe(4400);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Comida');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Falta para el plan');
    c.skipEnvelope();
    fixture.detectChanges();
    expect(c.current()?.id).toBe('e2');
    expect(c.allocation()!.form.controls.amount.value).toBe('200.00');
    expect(c.remaining('e2')).toBe(0);
    c.skipEnvelope();
    fixture.detectChanges();
    expect(c.current()?.id).toBe('e3');
    expect(c.planned('e3')).toBeNull();
    c.skipEnvelope();
    fixture.detectChanges();
    expect(c.step()).toBe('summary');
    expect(c.processed()).toBe(3);
    expect(c.decisions()).toEqual({ e1: 'skipped', e2: 'skipped', e3: 'skipped' });
    http.expectNone((r) => r.method !== 'GET');
    expect(toasts.messages()).toEqual([]);
  });

  it('registra varios ingresos sin avanzar ni repetir el anterior y luego permite transferir', async () => {
    const form = c.income()!;
    form.form.patchValue({ accountId: 'a', amount: '1000.50' });
    form.review();
    expect(c.blocked()).toBe(true);
    c.go('transfer');
    expect(c.step()).toBe('income');
    const work = form.c.confirm();
    fixture.detectChanges();
    expect(outer.busy()).toBe(true);
    const req = http.expectOne(path + '/movements/incomes');
    expect(req.request.body).toEqual({
      accountId: 'a',
      incomeSourceId: null,
      amount: 1000.5,
      description: '',
      periodId: 'p',
    });
    expect(req.request.headers.has('Idempotency-Key')).toBe(true);
    req.flush({});
    await work;
    fixture.detectChanges();
    expect(c.step()).toBe('income');
    expect(form.form.controls.amount.value).toBe('');
    expect(outer.busy()).toBe(false);
    expect(outer.requestClose).not.toHaveBeenCalled();
    expect(toasts.messages()).toHaveLength(1);
    form.form.patchValue({ accountId: 'a', amount: '200' });
    form.review();
    const second = form.c.confirm();
    http.expectOne(path + '/movements/incomes').flush({});
    await second;
    fixture.detectChanges();
    c.go('transfer');
    fixture.detectChanges();
    expect(c.step()).toBe('transfer');
    expect(toasts.messages()).toHaveLength(2);
  });

  it('confirma transferencias por separado con la quincena nueva y conserva el paso para hacer más', async () => {
    c.go('transfer');
    fixture.detectChanges();
    const form = c.transfer()!;
    form.form.patchValue({ fromAccountId: 'a', toAccountId: 'b', amount: '1500.25' });
    form.review();
    const work = form.c.confirm();
    const req = http.expectOne(path + '/movements/transfers');
    expect(req.request.body).toEqual({
      fromAccountId: 'a',
      toAccountId: 'b',
      amount: 1500.25,
      description: '',
      periodId: 'p',
    });
    req.flush({});
    await work;
    fixture.detectChanges();
    expect(c.step()).toBe('transfer');
    expect(form.form.controls.amount.value).toBe('');
    expect(outer.requestClose).not.toHaveBeenCalled();
  });

  it('en un error incierto conserva el sobre, importe y clave; solo avanza tras confirmar el éxito', async () => {
    const form = allocate();
    form.review();
    const first = form.c.confirm();
    const req = http.expectOne(path + '/movements/allocations');
    const key = req.request.headers.get('Idempotency-Key');
    const body = req.request.body;
    req.flush({}, { status: 503, statusText: 'Unavailable' });
    await first;
    fixture.detectChanges();
    expect(c.currentId()).toBe('e1');
    expect(c.decisions()).toEqual({});
    expect(toasts.messages()).toEqual([]);
    c.skipEnvelope();
    c.newEnvelope();
    c.finish();
    expect(c.currentId()).toBe('e1');
    expect(c.creatingEnvelope()).toBe(false);
    expect(outer.requestClose).not.toHaveBeenCalled();
    const retry = form.c.confirm();
    const repeated = http.expectOne(path + '/movements/allocations');
    expect(repeated.request.headers.get('Idempotency-Key')).toBe(key);
    expect(repeated.request.body).toEqual(body);
    expect(body).toMatchObject({ periodId: 'p', envelopeId: 'e1', amount: 300 });
    repeated.flush({});
    await retry;
    fixture.detectChanges();
    expect(c.decisions()['e1']).toBe('allocated');
    expect(c.currentId()).toBe('e2');
    expect(toasts.messages()).toHaveLength(1);
  });

  it('no destruye el formulario ni pierde la confirmación mientras refresca los saldos', async () => {
    const form = allocate();
    let finishRefresh!: () => void;
    vi.mocked(s.refresh).mockImplementationOnce(() => {
      s.loading.set(true);
      s.envelopes.set([]);
      s.periods.set([]);
      return new Promise<void>((resolve) => {
        finishRefresh = resolve;
      });
    });
    form.review();
    const work = form.c.confirm();
    http.expectOne(path + '/movements/allocations').flush({});
    await Promise.resolve();
    await Promise.resolve();
    fixture.detectChanges();
    expect(c.allocation()).toBe(form);
    expect(c.currentId()).toBe('e1');
    expect(outer.busy()).toBe(true);
    s.envelopes.set([
      envelope('e1', 'Comida', 400),
      envelope('e2', 'Renta', 500),
      envelope('e3', 'Transporte', 0),
    ]);
    s.periods.set([period]);
    s.loading.set(false);
    finishRefresh();
    await work;
    fixture.detectChanges();
    expect(c.currentId()).toBe('e2');
    expect(c.envelopes()[0].balance).toBe(400);
  });

  it('mantiene errores definitivos locales, sin toast y sin marcar el sobre como completado', async () => {
    const form = allocate();
    form.review();
    const work = form.c.confirm();
    http
      .expectOne(path + '/movements/allocations')
      .flush({}, { status: 400, statusText: 'Invalid' });
    await work;
    fixture.detectChanges();
    expect(c.currentId()).toBe('e1');
    expect(form.form.controls.amount.value).toBe('300.00');
    expect(form.c.message()).toBeTruthy();
    expect(c.decisions()).toEqual({});
    expect(toasts.messages()).toEqual([]);
    expect(outer.requestClose).not.toHaveBeenCalled();
  });

  it('bloquea nuevas operaciones si la quincena se cierra y nunca usa otra quincena abierta', () => {
    const form = allocate();
    s.periods.set([
      { ...period, status: 'CLOSED' },
      { ...period, id: 'another' },
    ]);
    s.periodId.set('another');
    fixture.detectChanges();
    expect(c.ready()).toBe(false);
    form.review();
    expect(form.c.reviewing()).toBe(false);
    c.skipEnvelope();
    expect(c.currentId()).toBe('e1');
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('[role="alert"]')?.textContent,
    ).toContain('ya no está abierta');
    http.expectNone((r) => r.method === 'POST');
  });

  it('crea un nuevo sobre con plan obligatorio para la quincena guiada y lo incorpora al recorrido', async () => {
    allocate();
    c.newEnvelope();
    fixture.detectChanges();
    const child = fixture.debugElement.query(By.directive(EnvelopeCreate))
      .componentInstance as EnvelopeCreate;
    child.form.patchValue({ name: 'Internet', accountId: 'a' });
    expect(child.form.controls.plan.controls.periodId.value).toBe('p');
    expect(child.form.invalid).toBe(true);
    expect(fixture.nativeElement.querySelector('app-period-plan-fields select')).toBeNull();
    child.form.controls.plan.controls.amount.setValue('750.50');
    const created = envelope('new', 'Internet', 0);
    vi.mocked(s.refresh).mockImplementationOnce(async () => {
      s.envelopes.update((items) => [...items, created]);
      s.periods.set([
        { ...period, lines: [...period.lines, { envelopeId: 'new', amount: 750.5 }] },
      ]);
    });
    const work = child.create();
    http.expectOne(path + '/envelopes').flush(created);
    await Promise.resolve();
    await Promise.resolve();
    http.expectOne(path + '/budget-periods/p').flush(period);
    await Promise.resolve();
    await Promise.resolve();
    const put = http.expectOne(path + '/budget-periods/p/lines/new');
    expect(put.request.body).toEqual({ amount: 750.5 });
    put.flush({ ...period, lines: [...period.lines, { envelopeId: 'new', amount: 750.5 }] });
    await work;
    fixture.detectChanges();
    expect(c.creatingEnvelope()).toBe(false);
    expect(c.currentId()).toBe('new');
    expect(c.allocation()!.form.getRawValue()).toMatchObject({
      envelopeId: 'new',
      amount: '750.50',
    });
    expect(c.envelopes().map((e) => e.id)).toContain('new');
    http.expectNone(path + '/movements/allocations');
  });

  it('el resumen conserva pendientes y permite revisar un sobre sin volver a abrir la quincena', () => {
    allocate();
    c.skipEnvelope();
    fixture.detectChanges();
    c.skipEnvelope();
    fixture.detectChanges();
    c.skipEnvelope();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Faltan');
    c.revisit('e1');
    fixture.detectChanges();
    expect(c.currentId()).toBe('e1');
    expect(c.allocation()!.form.controls.amount.value).toBe('300.00');
    c.go('summary');
    fixture.detectChanges();
    c.finish();
    expect(outer.requestClose).toHaveBeenCalledWith({
      successMessage: 'Carga y distribución de saldos finalizada.',
    });
    http.expectNone((r) => r.method === 'POST');
  });

  it('reutiliza la barra de pestañas de movimientos con iconos, flechas y navegación por teclado', () => {
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.setup-header app-dialog-tabs')).not.toBeNull();
    const tabs = element.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    expect(tabs).toHaveLength(4);
    expect([...tabs].every((tab) => tab.querySelector('app-icon'))).toBe(true);
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    expect(element.querySelector('[aria-label="Ver más pestañas"]')).not.toBeNull();
    tabs[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    fixture.detectChanges();
    expect(c.step()).toBe('transfer');
    expect(tabs[1].getAttribute('aria-selected')).toBe('true');
    expect(element.querySelector('[role="tabpanel"]')?.getAttribute('aria-labelledby')).toBe(
      'period-setup-tab-transfer',
    );
    tabs[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    fixture.detectChanges();
    expect(c.step()).toBe('allocate');
    expect(c.allocation()!.form.controls.amount.value).toBe('300.00');
  });
});
