import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { HouseholdStore } from './household-store';
describe('Saldos confirmados', () => {
  let s: HouseholdStore;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    s = TestBed.inject(HouseholdStore);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify({ ignoreCancelled: true }));
  it('consulta dashboard y selecciona quincena abierta sin crear aportaciones', async () => {
    const pending = s.select('home');
    http.expectOne('/api/v1/households/home/accounts').flush([]);
    http.expectOne('/api/v1/households/home/envelopes').flush([]);
    http.expectOne('/api/v1/households/home/budget-periods').flush([
      { id: 'closed', status: 'CLOSED', startDate: '2026-11-01' },
      { id: 'open', status: 'OPEN', startDate: '2026-11-15', expectedIncome: 500, lines: [] },
    ]);
    http
      .expectOne('/api/v1/households/home/dashboard')
      .flush({ total: 100, reserved: 80, free: 20, accounts: [] });
    await pending;
    expect(s.dashboard()?.free).toBe(20);
    expect(s.periodId()).toBe('open');
    expect(s.period()?.expectedIncome).toBe(500);
    expect(s.revision()).toBe(1);
  });
  it('ordena las quincenas de m?s reciente a m?s antigua y elige la abierta m?s reciente', async () => {
    const pending = s.select('home');
    http.expectOne('/api/v1/households/home/accounts').flush([]);
    http.expectOne('/api/v1/households/home/envelopes').flush([]);
    const periods = [
      { id: 'old', status: 'CLOSED', startDate: '2025-12-15' },
      { id: 'middle', status: 'OPEN', startDate: '2026-11-15' },
      { id: 'latest', status: 'OPEN', startDate: '2027-01-01' },
    ];
    http.expectOne('/api/v1/households/home/budget-periods').flush(periods);
    http
      .expectOne('/api/v1/households/home/dashboard')
      .flush({ total: 0, reserved: 0, free: 0, accounts: [] });
    await pending;
    expect(s.periods().map((p) => p.id)).toEqual(['latest', 'middle', 'old']);
    expect(s.periodId()).toBe('latest');
    expect(periods.map((p) => p.id)).toEqual(['old', 'middle', 'latest']);
  });

  it('ordena sobres por nombre en espanol, ignorando mayusculas y acentos', async () => {
    const pending = s.select('home');
    http.expectOne('/api/v1/households/home/accounts').flush([]);
    const envelopes = [
      { id: 'z', name: 'Zapatos' },
      { id: 'n-tilde', name: '\u00d1and\u00fa' },
      { id: 'b', name: 'banco' },
      { id: 'a', name: '\u00c1gua' },
      { id: 'n', name: 'Navidad' },
      { id: 'c', name: 'Central' },
    ];
    http.expectOne('/api/v1/households/home/envelopes').flush(envelopes);
    http.expectOne('/api/v1/households/home/budget-periods').flush([]);
    http
      .expectOne('/api/v1/households/home/dashboard')
      .flush({ total: 0, reserved: 0, free: 0, accounts: [] });
    await pending;
    expect(s.envelopes().map((e) => e.id)).toEqual(['a', 'b', 'c', 'n', 'n-tilde', 'z']);
    expect(envelopes.map((e) => e.id)).toEqual(['z', 'n-tilde', 'b', 'a', 'n', 'c']);
  });

  it('borra saldos y comunica error de API', async () => {
    const pending = s.select('home');
    http.expectOne('/api/v1/households/home/accounts').error(new ProgressEvent('error'));
    await pending;
    expect(s.dashboard()).toBeNull();
    expect(s.error()).toContain('conectar');
    expect(s.loading()).toBe(false);
  });
});
