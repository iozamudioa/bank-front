import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ExpenseFacade } from './expense-facade';
import { HouseholdStore } from '../../core/config/household-store';
const body = { periodId: 'p', targetEnvelopeId: 'central', amount: 150, description: 'Carne' };
describe('Gasto inteligente', () => {
  let f: ExpenseFacade;
  let http: HttpTestingController;
  let s: HouseholdStore;
  const url = '/api/v1/households/h/movements/expenses';
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), ExpenseFacade],
    });
    f = TestBed.inject(ExpenseFacade);
    s = TestBed.inject(HouseholdStore);
    s.householdId.set('h');
    vi.spyOn(s, 'refresh').mockResolvedValue();
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    http.verify();
    vi.unstubAllGlobals();
  });
  async function preview() {
    const p = f.calculate(body);
    http.expectOne(url + '/preview').flush({
      requestedAmount: 150,
      targetBalance: 80,
      shortfall: 70,
      eligibleDonors: [
        { envelopeId: 'sams', name: 'Sams', balance: 1000 },
        { envelopeId: 'other', name: 'Otro', balance: 30 },
      ],
    });
    await p;
  }
  it('muestra faltante y permite combinar fuentes exactas', async () => {
    await preview();
    expect(f.preview()?.shortfall).toBe(70);
    expect(f.covered()).toBe(false);
    f.setDonor('sams', '40');
    f.setDonor('other', '30');
    expect(f.covered()).toBe(true);
    expect(f.after('sams', 1000)).toBe(960);
  });
  it('rechaza fuentes por encima de su saldo', async () => {
    await preview();
    f.setDonor('other', '70');
    expect(f.covered()).toBe(false);
  });
  it('envía un solo gasto y refresca saldos confirmados', async () => {
    await preview();
    f.setDonor('sams', '70');
    const p = f.confirm();
    void f.confirm();
    const req = http.expectOne(url);
    expect(req.request.headers.get('Idempotency-Key')).toBeTruthy();
    expect(req.request.body.fundingSources).toEqual([
      { envelopeId: 'central', amount: 80 },
      { envelopeId: 'sams', amount: 70 },
    ]);
    req.flush({});
    await p;
    expect(f.success()).toBe(true);
    expect(s.refresh).toHaveBeenCalledTimes(1);
  });
  it('409 refresca saldos y conserva clave sin reintento automático', async () => {
    await preview();
    f.setDonor('sams', '70');
    const p = f.confirm();
    http.expectOne(url).flush({}, { status: 409, statusText: 'Conflict' });
    await p;
    expect(f.preview()).not.toBeNull();
    expect(f.uncertain()).toBe(true);
    expect(f.error()).toContain('saldo cambió');
    expect(s.refresh).toHaveBeenCalled();
  });
  it('reintenta confirmación incierta con misma clave y cuerpo', async () => {
    await preview();
    f.setDonor('sams', '70');
    const p = f.confirm();
    const first = http.expectOne(url);
    const key = first.request.headers.get('Idempotency-Key');
    const snapshot = first.request.body;
    first.flush({}, { status: 503, statusText: 'Unavailable' });
    await p;
    expect(f.uncertain()).toBe(true);
    f.setDonor('sams', '99');
    const second = f.confirm();
    const req = http.expectOne(url);
    expect(req.request.headers.get('Idempotency-Key')).toBe(key);
    expect(req.request.body).toEqual(snapshot);
    req.flush({});
    await second;
    expect(f.uncertain()).toBe(false);
  });
  it('no confirma fuentes incompletas', async () => {
    await preview();
    await f.confirm();
    http.expectNone(url);
  });
  it('consulta y confirma un gasto sin randomUUID disponible, conservando la misma clave al reintentar', async () => {
    const original = globalThis.crypto;
    vi.stubGlobal('crypto', { getRandomValues: original.getRandomValues.bind(original) });
    await preview();
    expect(f.error()).toBe('');
    expect(f.preview()).not.toBeNull();
    f.setDonor('sams', '70');
    const first = f.confirm();
    const request = http.expectOne(url);
    const key = request.request.headers.get('Idempotency-Key');
    expect(key).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    request.flush({}, { status: 503, statusText: 'Unavailable' });
    await first;
    const retry = f.confirm();
    const second = http.expectOne(url);
    expect(second.request.headers.get('Idempotency-Key')).toBe(key);
    second.flush({});
    await retry;
    expect(f.success()).toBe(true);
  });

  const accountBody = { periodId: 'p', accountId: 'a', amount: 150, description: 'Sin sobre' };
  const accountUrl = '/api/v1/households/h/movements/account-expenses';
  const accountResult = {
    accountId: 'a',
    amount: 150,
    totalBefore: 1000,
    freeBefore: 300,
    totalAfter: 850,
    freeAfter: 150,
  };
  async function previewAccount() {
    const work = f.calculate(accountBody);
    const request = http.expectOne(accountUrl + '/preview');
    expect(request.request.headers.has('Idempotency-Key')).toBe(false);
    expect(request.request.body).toEqual(accountBody);
    request.flush(accountResult);
    await work;
  }
  it('consulta el preview de saldo libre sin enviar un sobre ni fuentes de financiación', async () => {
    await previewAccount();
    expect(f.preview()).toBeNull();
    expect(f.accountPreview()).toEqual(accountResult);
    expect(f.funding()).toEqual([]);
    expect(f.covered()).toBe(true);
    http.expectNone(url + '/preview');
  });
  it('confirma un solo gasto de cuenta y recupera los saldos del servidor sin tocar reservas locales', async () => {
    const envelopes = s.envelopes();
    await previewAccount();
    const work = f.confirm();
    void f.confirm();
    const req = http.expectOne(accountUrl);
    expect(req.request.headers.get('Idempotency-Key')).toBeTruthy();
    expect(req.request.body).toEqual(accountBody);
    expect(req.request.body.fundingSources).toBeUndefined();
    req.flush({});
    await work;
    expect(f.success()).toBe(true);
    expect(s.refresh).toHaveBeenCalledTimes(1);
    expect(s.envelopes()).toBe(envelopes);
  });
  it.each([0, 409, 503])(
    'conserva cuerpo y clave tras error %s en gasto directo y bloquea cambiar su origen',
    async (status) => {
      await previewAccount();
      const original = f.confirm(),
        req = http.expectOne(accountUrl);
      const key = req.request.headers.get('Idempotency-Key');
      if (status === 0) req.error(new ProgressEvent('error'));
      else req.flush({}, { status, statusText: 'Failure' });
      await original;
      expect(f.uncertain()).toBe(true);
      f.reset();
      await f.calculate(body);
      http.expectNone(url + '/preview');
      expect(f.accountPreview()).toEqual(accountResult);
      const retry = f.confirm(),
        request = http.expectOne(accountUrl);
      expect(request.request.headers.get('Idempotency-Key')).toBe(key);
      expect(request.request.body).toEqual(accountBody);
      request.flush({});
      await retry;
    },
  );
  it('rechaza un gasto directo si el saldo libre es insuficiente y no confirma desde el total real', async () => {
    const work = f.calculate(accountBody);
    http
      .expectOne(accountUrl + '/preview')
      .flush({}, { status: 400, statusText: 'Insufficient free balance' });
    await work;
    expect(f.accountPreview()).toBeNull();
    expect(f.error()).toContain('Revisa los datos');
    await f.confirm();
    http.expectNone(accountUrl);
  });
  it('no inventa importes cuando el preview de cuenta está incompleto y exige una nueva revisión después de 400', async () => {
    const invalid = f.calculate(accountBody);
    http.expectOne(accountUrl + '/preview').flush({ accountId: 'a', amount: 150 });
    await invalid;
    expect(f.accountPreview()).toBeNull();
    await f.confirm();
    http.expectNone(accountUrl);
    await previewAccount();
    const work = f.confirm();
    http.expectOne(accountUrl).flush({}, { status: 400, statusText: 'Invalid' });
    await work;
    expect(f.accountPreview()).toBeNull();
    expect(f.uncertain()).toBe(false);
    await f.confirm();
    http.expectNone(accountUrl);
  });
});
