import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { BudgetPeriodResponse } from '../../core/api/generated/models';
import { HouseholdStore } from '../../core/config/household-store';
import { PeriodOpening } from './period-opening';
const base = '/api/v1/households/h/budget-periods';
const request = { startDate: '2026-11-15', endDate: '2026-11-30', open: true };
function period(
  id: string,
  startDate = '2026-11-01',
  endDate = '2026-11-14',
  status: BudgetPeriodResponse['status'] = 'OPEN',
): BudgetPeriodResponse {
  return { id, householdId: 'h', startDate, endDate, status, expectedIncome: 0, lines: [] };
}
const previous = period('previous'),
  created = period('new', request.startDate, request.endDate);
describe('Cerrar anterior y abrir quincena', () => {
  let flow: PeriodOpening, http: HttpTestingController, store: HouseholdStore;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), PeriodOpening],
    });
    flow = TestBed.inject(PeriodOpening);
    http = TestBed.inject(HttpTestingController);
    store = TestBed.inject(HouseholdStore);
    store.householdId.set('h');
    store.periodId.set('previous');
    vi.spyOn(store, 'refresh').mockResolvedValue();
  });
  afterEach(() => http.verify());
  function list(periods: BudgetPeriodResponse[]) {
    http
      .expectOne('/api/v1/households/h/budget-template')
      .flush({ expectedIncome: 1000, lines: [] });
    http.expectOne((r) => r.method === 'GET' && r.url === base).flush(periods);
  }
  async function ask(periods = [previous]) {
    const work = flow.prepare(request);
    list(periods);
    await work;
  }
  it('abre directamente si no existe una quincena abierta', async () => {
    const work = flow.prepare(request);
    list([]);
    await Promise.resolve();
    await Promise.resolve();
    const post = http.expectOne((r) => r.method === 'POST' && r.url === base);
    expect(post.request.body).toEqual(request);
    post.flush(created);
    expect(await work).toBe('new');
    expect(store.periodId()).toBe('new');
    expect(flow.confirmation()).toBeNull();
  });
  it('pide permiso y No no cierra ni abre ninguna quincena', async () => {
    await ask();
    expect(flow.confirmation()).toEqual([previous]);
    flow.cancel();
    expect(flow.confirmation()).toBeNull();
    await flow.confirm();
    http.expectNone((r) => r.method === 'POST');
    expect(store.periodId()).toBe('previous');
  });
  it('Sí cierra primero y solo después abre la nueva, evitando doble envío', async () => {
    await ask();
    const work = flow.confirm();
    void flow.confirm();
    list([previous]);
    await Promise.resolve();
    await Promise.resolve();
    const close = http.expectOne(base + '/previous/close');
    http.expectNone((r) => r.method === 'POST' && r.url === base);
    expect(close.request.method).toBe('POST');
    close.flush(period('previous', previous.startDate, previous.endDate, 'CLOSED'));
    await Promise.resolve();
    await Promise.resolve();
    http.expectOne((r) => r.method === 'POST' && r.url === base).flush(created);
    expect(await work).toBe('new');
    expect(store.refresh).toHaveBeenCalledTimes(1);
    expect(store.periodId()).toBe('new');
  });
  it('no abre la nueva si falla el cierre de la anterior', async () => {
    await ask();
    const work = flow.confirm();
    list([previous]);
    await Promise.resolve();
    await Promise.resolve();
    http.expectOne(base + '/previous/close').flush({}, { status: 403, statusText: 'Forbidden' });
    await work;
    http.expectNone((r) => r.method === 'POST' && r.url === base);
    expect(flow.error()).toContain('No se pudo completar');
    expect(store.refresh).toHaveBeenCalled();
  });
  it('informa el cierre realizado si falla la apertura posterior', async () => {
    await ask();
    const work = flow.confirm();
    list([previous]);
    await Promise.resolve();
    await Promise.resolve();
    http.expectOne(base + '/previous/close').flush({});
    await Promise.resolve();
    await Promise.resolve();
    http
      .expectOne((r) => r.method === 'POST' && r.url === base)
      .flush({}, { status: 503, statusText: 'Unavailable' });
    await work;
    expect(flow.error()).toContain('Se cerró la quincena anterior');
    expect(flow.error()).toContain('No se pudo confirmar la apertura');
    expect(flow.busy()).toBe(false);
    expect(flow.confirmation()).toBeNull();
  });
  it('rechaza traslapes antes de cerrar una quincena', async () => {
    const work = flow.prepare({ startDate: '2026-11-10', endDate: '2026-11-20', open: true });
    list([previous]);
    await work;
    expect(flow.error()).toContain('traslapan');
    http.expectNone((r) => r.method === 'POST');
  });
  it('vuelve a pedir permiso si aparece otra quincena abierta mientras se confirma', async () => {
    await ask();
    const extra = period('extra', '2026-10-15', '2026-10-31');
    const work = flow.confirm();
    list([previous, extra]);
    await work;
    expect(flow.confirmation()).toEqual([previous, extra]);
    expect(flow.error()).toContain('confirma nuevamente');
    http.expectNone((r) => r.method === 'POST');
  });
  it('valida nuevamente los traslapes antes de hacer cualquier cierre', async () => {
    await ask();
    const work = flow.confirm();
    list([previous, created]);
    await work;
    expect(flow.error()).toContain('No se cerró ninguna');
    http.expectNone((r) => r.method === 'POST');
  });
  it('no vuelve a cerrar una quincena cerrada por otro usuario', async () => {
    await ask();
    const work = flow.confirm();
    list([{ ...previous, status: 'CLOSED' }]);
    await Promise.resolve();
    await Promise.resolve();
    http.expectNone(base + '/previous/close');
    http.expectOne((r) => r.method === 'POST' && r.url === base).flush(created);
    await work;
    expect(store.periodId()).toBe('new');
  });
  it('no hace escrituras si no puede comprobar las quincenas actuales', async () => {
    const work = flow.prepare(request);
    http
      .expectOne('/api/v1/households/h/budget-template')
      .flush({ expectedIncome: 1000, lines: [] });
    http.expectOne((r) => r.method === 'GET' && r.url === base).error(new ProgressEvent('error'));
    await work;
    http.expectNone((r) => r.method === 'POST');
    expect(flow.confirmation()).toBeNull();
    expect(flow.error()).toContain('conectar');
  });
  it('traduce la plantilla inexistente a un aviso útil en lugar de recurso no disponible', async () => {
    const work = flow.prepare(request);
    http.expectOne(base).flush([previous]);
    http
      .expectOne('/api/v1/households/h/budget-template')
      .flush({}, { status: 404, statusText: 'Not Found' });
    await work;
    expect(flow.error()).toContain('presupuesto habitual');
    expect(flow.error()).not.toContain('recurso');
    http.expectNone((r) => r.method === 'POST');
  });
  it('permite abrir con ingresos esperados en cero cuando los sobres ya tienen un plan positivo', async () => {
    const work = flow.prepare(request);
    http.expectOne(base).flush([]);
    http.expectOne('/api/v1/households/h/budget-template').flush({
      expectedIncome: 0,
      lines: [{ envelopeId: 'comida', amount: 4500 }],
    });
    await Promise.resolve();
    await Promise.resolve();
    http
      .expectOne((r) => r.method === 'POST' && r.url === base)
      .flush({ ...created, expectedIncome: 0, lines: [{ envelopeId: 'comida', amount: 4500 }] });
    expect(await work).toBe('new');
    expect(flow.error()).toBe('');
    http.expectNone((r) => r.url.includes('/movements/'));
  });
});
