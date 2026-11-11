import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Dashboard } from './dashboard';
import { HouseholdStore } from '../../core/config/household-store';
describe('Barras de saldo en Tus sobres', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    const s = TestBed.inject(HouseholdStore);
    s.householdId.set('h');
    s.envelopes.set([
      {
        id: 'e',
        name: 'Compras',
        balance: 150,
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
        id: 'p',
        householdId: 'h',
        startDate: '2026-11-01',
        endDate: '2026-11-15',
        status: 'OPEN',
        expectedIncome: 1000,
        lines: [{ envelopeId: 'e', amount: 100 }],
      },
    ]);
    s.periodId.set('p');
    s.dashboard.set({ total: 1000, reserved: 150, free: 850, accounts: [] });
  });
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  function setup() {
    const fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController)
      .expectOne((r) => r.url.endsWith('/movements'))
      .flush([]);
    return {
      fixture,
      component: fixture.componentInstance,
      element: fixture.nativeElement as HTMLElement,
      s: TestBed.inject(HouseholdStore),
    };
  }
  it('limita la barra a su ancho y conserva el saldo extra sin mostrar porcentaje', () => {
    const { element, component } = setup();
    expect(component.envelopePlans()[0]).toMatchObject({
      balance: 150,
      planned: 100,
      progress: 100,
      extra: 50,
    });
    const bar = element.querySelector('[role="progressbar"]')!;
    expect(bar.getAttribute('aria-valuenow')).toBe('100');
    expect(bar.getAttribute('aria-valuetext')).toContain('150.00');
    expect(element.querySelector('.envelope-progress span')?.getAttribute('style')).toContain(
      '100%',
    );
    const row = element.querySelector('.envelope-entry')!;
    expect(row.textContent).toContain('Extra: $50.00');
    expect(row.textContent).not.toContain('%');
    const limit = element.querySelector<HTMLElement>('.envelope-plan-limit')!;
    expect(Number.parseFloat(limit.style.left)).toBeCloseTo(100 / 1.5);
    expect(limit.getAttribute('aria-hidden')).toBe('true');
    expect(limit.title).toContain('$100.00');
    expect(
      Number.parseFloat(element.querySelector<HTMLElement>('.envelope-excess')!.style.width),
    ).toBeCloseTo(100 - 100 / 1.5);
  });
  it('refleja el dinero que queda y cambia con la quincena seleccionada', () => {
    const { fixture, component, s } = setup();
    s.envelopes.update((items) => items.map((e) => ({ ...e, balance: 25 })));
    fixture.detectChanges();
    expect(component.envelopePlans()[0]).toMatchObject({ progress: 25, extra: 0 });
    s.periods.update((items) =>
      items.map((p) => ({ ...p, lines: [{ envelopeId: 'e', amount: 50 }] })),
    );
    fixture.detectChanges();
    expect(component.envelopePlans()[0].progress).toBe(50);
    expect(fixture.nativeElement.querySelector('.envelope-plan-limit')).toBeNull();
  });
  it('no divide entre cero ni inventa un plan cuando falta', () => {
    const { fixture, element, s } = setup();
    s.periods.update((items) =>
      items.map((p) => ({ ...p, lines: [{ envelopeId: 'e', amount: 0 }] })),
    );
    fixture.detectChanges();
    expect(element.querySelector('[role="progressbar"]')).toBeNull();
    expect(element.textContent).toContain('Sin monto planeado en esta quincena');
    s.periodId.set('');
    fixture.detectChanges();
    expect(element.textContent).toContain('Selecciona una quincena');
  });
  it('distingue un saldo exacto de un excedente sin alterar los importes', () => {
    const { fixture, element, s } = setup();
    s.envelopes.update((items) => items.map((e) => ({ ...e, balance: 100 })));
    fixture.detectChanges();
    expect(element.querySelector('.envelope-plan-limit')).toBeNull();
    s.envelopes.update((items) => items.map((e) => ({ ...e, balance: 200 })));
    fixture.detectChanges();
    expect(element.querySelector<HTMLElement>('.envelope-plan-limit')?.style.left).toBe('50%');
    expect(element.querySelector('.envelope-entry')?.textContent).toContain('Extra: $100.00');
    expect(s.envelopes()[0].balance).toBe(200);
  });
  it('abre Registrar gasto con la información del sobre al tocar la fila', () => {
    const { element, component } = setup();
    const expense = vi.spyOn(component.modals, 'expense').mockResolvedValue();
    element.querySelector<HTMLButtonElement>('.envelope-open')!.click();
    expect(expense).toHaveBeenCalledWith('e');
  });
});
