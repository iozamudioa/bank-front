import { HouseholdStore } from '../../core/config/household-store';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { describe, it, expect, beforeEach } from 'vitest';
import { ExpensePage } from './expense-page';
describe('Formulario de gasto', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [ExpensePage],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }),
  );
  it('precarga el sobre recibido por el modal', () => {
    const fixture = TestBed.createComponent(ExpensePage);
    fixture.componentRef.setInput('envelopeId', 'central');
    fixture.detectChanges();
    expect(fixture.componentInstance.form.controls.targetEnvelopeId.value).toBe('central');
  });
  it('requiere sobre e importe válido', () => {
    const c = TestBed.createComponent(ExpensePage).componentInstance;
    expect(c.form.invalid).toBe(true);
    c.form.patchValue({ targetEnvelopeId: 'e', amount: '0.001' });
    expect(c.form.invalid).toBe(true);
    c.form.controls.amount.setValue('150.00');
    expect(c.form.valid).toBe(true);
  });
  it('presenta etiquetas y estado sin quincena abierta', () => {
    const f = TestBed.createComponent(ExpensePage);
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Importe en MXN');
    expect(f.nativeElement.textContent).toContain('quincena abierta');
    expect(f.nativeElement.textContent).not.toContain('Gasta con claridad');
  });
  it('precarga nombre, cuenta y saldo del sobre y elige la quincena abierta al abrir el gasto', () => {
    const s = TestBed.inject(HouseholdStore);
    s.accounts.set([
      {
        id: 'a',
        name: 'Banco',
        balance: 5000,
        householdId: 'h',
        active: true,
        type: 'DIGITAL',
        version: 0,
      },
    ]);
    s.envelopes.set([
      {
        id: 'telcel',
        name: 'Telcel',
        balance: 1309,
        accountId: 'a',
        householdId: 'h',
        active: true,
        category: null,
        habitualAmount: null,
        type: 'SPENDING',
        version: 0,
      },
    ]);
    s.periods.set([
      {
        id: 'open',
        householdId: 'h',
        startDate: '2026-11-01',
        endDate: '2026-11-15',
        status: 'OPEN',
        expectedIncome: 1000,
        lines: [],
      },
    ]);
    s.periodId.set('closed');
    const fixture = TestBed.createComponent(ExpensePage);
    fixture.componentRef.setInput('envelopeId', 'telcel');
    fixture.detectChanges();
    expect(fixture.componentInstance.form.controls.targetEnvelopeId.value).toBe('telcel');
    expect(s.periodId()).toBe('open');
    const info = (fixture.nativeElement as HTMLElement).querySelector('.selected-envelope-info')!;
    expect(info.textContent).toContain('Telcel');
    expect(info.textContent).toContain('Banco');
    expect(info.textContent).toContain('$1,309.00');
    expect(fixture.componentInstance.form.controls.amount.value).toBe('');
  });

  it('permite gasto de cuenta sin sobre y muestra solo su saldo libre confirmado', async () => {
    const s = TestBed.inject(HouseholdStore);
    s.householdId.set('h');
    s.accounts.set([
      {
        id: 'a',
        householdId: 'h',
        name: 'Banco',
        type: 'DIGITAL',
        balance: 5000,
        version: 0,
        active: true,
      },
    ]);
    s.dashboard.set({
      total: 5000,
      reserved: 4900,
      free: 100,
      accounts: [
        { id: 'a', name: 'Banco', type: 'DIGITAL', total: 5000, reserved: 4900, free: 100 },
      ],
    });
    s.periods.set([
      {
        id: 'open',
        householdId: 'h',
        startDate: '2026-11-16',
        endDate: '2026-11-30',
        status: 'OPEN',
        expectedIncome: 5000,
        lines: [],
      },
    ]);
    const fixture = TestBed.createComponent(ExpensePage);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    c.form.patchValue({ origin: 'account', accountId: 'a', amount: '75.50' });
    fixture.detectChanges();
    expect(c.form.valid).toBe(true);
    expect(c.selectedFree()).toBe(100);
    const info = (fixture.nativeElement as HTMLElement).querySelector('.selected-envelope-info')!;
    expect(info.textContent).toContain('$100.00');
    expect(info.textContent).not.toContain('$5,000.00');
    expect(fixture.nativeElement.querySelector('[formcontrolname="targetEnvelopeId"]')).toBeNull();
    const work = c.preview(),
      http = TestBed.inject(HttpTestingController);
    const request = http.expectOne('/api/v1/households/h/movements/account-expenses/preview');
    expect(request.request.body).toEqual({
      accountId: 'a',
      periodId: 'open',
      amount: 75.5,
      description: '',
    });
    request.flush({
      accountId: 'a',
      amount: 75.5,
      totalBefore: 5000,
      freeBefore: 100,
      totalAfter: 4924.5,
      freeAfter: 24.5,
    });
    await work;
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Saldo libre después');
    expect(fixture.nativeElement.textContent).toContain('$24.50');
    http.verify();
  });
});
