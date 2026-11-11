import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { describe, it, expect, vi } from 'vitest';
import { Dashboard } from './dashboard';
import { HouseholdStore } from '../../core/config/household-store';
describe('Dashboard requiere quincena abierta', () => {
  it.each(['none', 'CLOSED', 'OPEN'])('redirección con %s', (status) => {
    TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    const store = TestBed.inject(HouseholdStore);
    store.householdId.set('h');
    if (status !== 'none')
      store.periods.set([
        {
          id: 'p',
          householdId: 'h',
          startDate: '2026-11-01',
          endDate: '2026-11-15',
          status: status as 'OPEN' | 'CLOSED',
          expectedIncome: 0,
          lines: [],
        },
      ]);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    if (status === 'OPEN') expect(navigate).not.toHaveBeenCalled();
    else expect(navigate).toHaveBeenCalledWith('/setup', { replaceUrl: true });
    TestBed.inject(HttpTestingController)
      .match(() => true)
      .forEach((r) => r.flush([]));
    TestBed.resetTestingModule();
  });
});
