import { ReallocationForm } from '../transfers/reallocation-form';
import { By } from '@angular/platform-browser';
import { AllocationForm } from '../allocations/allocation-form';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { MovementDialog } from './movement-dialog';
import { HouseholdStore } from '../../core/config/household-store';
import { OperationSafety } from '../../core/config/operation-safety';

describe('Pestañas de nuevo movimiento', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MovementDialog],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const store = TestBed.inject(HouseholdStore);
    store.householdId.set('h');
    store.periods.set([
      {
        id: 'q1',
        householdId: 'h',
        startDate: '2026-11-01',
        endDate: '2026-11-14',
        status: 'OPEN',
        expectedIncome: 0,
        lines: [],
      },
    ]);
    store.periodId.set('q1');
  });
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  function setup() {
    const fixture = TestBed.createComponent(MovementDialog);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController).expectNone('/api/v1/households/h/income-sources');
    return { fixture, element: fixture.nativeElement as HTMLElement };
  }
  it('abre Apartar dinero como primera pestaña sin una selección previa', () => {
    const { element } = setup();
    expect(element.querySelectorAll('[role="tab"]').length).toBe(7);
    expect(element.querySelector('[role="tab"]')?.id).toBe('movement-tab-allocate');
    expect(element.querySelector('#movement-tab-allocate')?.getAttribute('aria-selected')).toBe(
      'true',
    );
    expect(element.querySelector('#movement-panel-allocate')?.hasAttribute('hidden')).toBe(false);
    expect(element.querySelector('app-allocation-form')).not.toBeNull();
    expect(element.querySelector('app-income-form')).toBeNull();
  });
  it('cambia directamente de formulario y conserva los datos capturados al regresar', () => {
    const { fixture, element } = setup();
    const amount = element.querySelector<HTMLInputElement>(
      '#movement-panel-allocate input[formControlName="amount"]',
    )!;
    amount.value = '350.25';
    amount.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    element.querySelector<HTMLButtonElement>('#movement-tab-income')!.click();
    fixture.detectChanges();
    TestBed.inject(HttpTestingController)
      .expectOne('/api/v1/households/h/income-sources')
      .flush([]);
    expect(element.querySelector('app-income-form')).not.toBeNull();
    expect(element.querySelector('#movement-panel-allocate')?.hasAttribute('hidden')).toBe(true);
    element.querySelector<HTMLButtonElement>('#movement-tab-allocate')!.click();
    fixture.detectChanges();
    expect(
      element.querySelector<HTMLInputElement>(
        '#movement-panel-allocate input[formControlName="amount"]',
      )?.value,
    ).toBe('$350.25');
  });
  it('permite recorrer las pestañas con flechas, Inicio y Fin', () => {
    const { fixture, element } = setup();
    const allocate = element.querySelector<HTMLButtonElement>('#movement-tab-allocate')!;
    allocate.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    fixture.detectChanges();
    const income = element.querySelector<HTMLButtonElement>('#movement-tab-income')!;
    TestBed.inject(HttpTestingController)
      .expectOne('/api/v1/households/h/income-sources')
      .flush([]);
    expect(fixture.componentInstance.action()).toBe('income');
    expect(income.tabIndex).toBe(0);
    expect(document.activeElement).toBe(income);
    income.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    fixture.detectChanges();
    expect(fixture.componentInstance.action()).toBe('opening');
    const opening = element.querySelector<HTMLButtonElement>('#movement-tab-opening')!;
    expect(element.querySelector('.period-selector')).toBeNull();
    opening.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    fixture.detectChanges();
    expect(fixture.componentInstance.action()).toBe('allocate');
  });
  it('impide cambiar de operación durante una confirmación pendiente', () => {
    const { fixture, element } = setup();
    TestBed.inject(OperationSafety).locked.set(true);
    fixture.detectChanges();
    expect(
      [...element.querySelectorAll<HTMLButtonElement>('[role="tab"]')].every(
        (button) => button.disabled,
      ),
    ).toBe(true);
    fixture.componentInstance.select('opening');
    expect(fixture.componentInstance.action()).toBe('allocate');
  });
  it('muestra las flechas según las pestañas ocultas y las oculta si caben todas', () => {
    const { fixture, element } = setup();
    const viewport = element.querySelector<HTMLElement>('#movement-tabs')!;
    Object.defineProperties(viewport, {
      scrollWidth: { value: 900, configurable: true },
      clientWidth: { value: 300, configurable: true },
      scrollLeft: { value: 0, writable: true },
    });
    viewport.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();
    const back = element.querySelector<HTMLButtonElement>(
      '[aria-label="Ver pestañas anteriores"]',
    )!;
    const next = element.querySelector<HTMLButtonElement>('[aria-label="Ver más pestañas"]')!;
    expect(back.hidden).toBe(false);
    expect(back.disabled).toBe(true);
    expect(next.disabled).toBe(false);
    viewport.scrollLeft = 600;
    viewport.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();
    expect(back.disabled).toBe(false);
    expect(next.disabled).toBe(true);
    Object.defineProperty(viewport, 'scrollWidth', { value: 300 });
    viewport.scrollLeft = 0;
    viewport.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();
    expect(back.hidden).toBe(true);
    expect(next.hidden).toBe(true);
  });
  it('desplaza las pestañas con las flechas sin cambiar el movimiento ni los datos', () => {
    const { fixture, element } = setup();
    const viewport = element.querySelector<HTMLElement>('#movement-tabs')!;
    Object.defineProperties(viewport, {
      scrollWidth: { value: 900 },
      clientWidth: { value: 300 },
      scrollLeft: { value: 0, writable: true },
    });
    const scroll = vi.fn();
    Object.defineProperty(viewport, 'scrollBy', { value: scroll });
    viewport.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();
    element.querySelector<HTMLButtonElement>('[aria-label="Ver más pestañas"]')!.click();
    expect(scroll).toHaveBeenCalledWith(expect.objectContaining({ left: expect.any(Number) }));
    expect(scroll.mock.calls[0][0].left).toBeGreaterThan(0);
    expect(fixture.componentInstance.action()).toBe('allocate');
  });
  it('mantiene pestañas y acciones fuera del detalle desplazable', async () => {
    const { fixture, element } = setup();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(element.querySelector('.movement-header [role="tablist"]')).not.toBeNull();
    expect(
      element.querySelector('.movement-detail input[formControlName="amount"]'),
    ).not.toBeNull();
    expect(element.querySelector('.movement-detail button')).toBeNull();
    expect(element.querySelector('.movement-footer button.primary')?.textContent).toContain(
      'Revisar operación',
    );
  });
  it('revisa y acepta desde el footer sin duplicar el movimiento', async () => {
    const { fixture, element } = setup();
    await fixture.whenStable();
    fixture.detectChanges();
    const store = TestBed.inject(HouseholdStore);
    vi.spyOn(store, 'refresh').mockResolvedValue();
    store.envelopes.set([
      {
        id: 'central',
        accountId: 'cash',
        active: true,
        balance: 0,
        category: null,
        habitualAmount: null,
        householdId: 'h',
        name: 'Central',
        type: 'SPENDING',
        version: 0,
      },
    ]);
    const form = fixture.debugElement.query(By.directive(AllocationForm))
      .componentInstance as AllocationForm;
    const review = element.querySelector<HTMLButtonElement>('.movement-footer button.primary')!;
    expect(review.disabled).toBe(true);
    form.form.patchValue({
      envelopeId: 'central',
      amount: '75.00',
      description: 'Apartado de compras',
    });
    fixture.detectChanges();
    expect(review.disabled).toBe(false);
    review.click();
    fixture.detectChanges();
    expect(form.c.reviewing()).toBe(true);
    const accept = element.querySelector<HTMLButtonElement>('.movement-footer button.primary')!;
    expect(accept.textContent).toContain('Aceptar');
    expect(element.querySelector('.movement-footer')?.textContent).toContain('Central');
    expect(element.querySelector('.movement-detail button')).toBeNull();
    accept.click();
    accept.click();
    const http = TestBed.inject(HttpTestingController),
      req = http.expectOne('/api/v1/households/h/movements/allocations');
    expect(req.request.body.amount).toBe(75);
    expect(req.request.headers.get('Idempotency-Key')).toBeTruthy();
    req.flush({});
    await fixture.whenStable();
    fixture.detectChanges();
    expect(form.c.reviewing()).toBe(false);
    expect(store.refresh).toHaveBeenCalledTimes(1);
    expect(element.querySelector('.movement-footer')?.textContent).toContain(
      'Movimiento registrado correctamente',
    );
  });
  it('muestra cambios y totales antes de confirmar y conserva la proyección original si hay un reintento incierto', async () => {
    const { fixture, element } = setup();
    const store = TestBed.inject(HouseholdStore);
    store.envelopes.set([
      {
        id: 'nancy',
        name: 'Nancy',
        balance: 1517,
        accountId: 'a',
        householdId: 'h',
        active: true,
        category: null,
        habitualAmount: null,
        type: 'SPENDING',
        version: 0,
      },
      {
        id: 'telcel',
        name: 'Telcel',
        balance: 1209,
        accountId: 'a',
        householdId: 'h',
        active: true,
        category: null,
        habitualAmount: null,
        type: 'SPENDING',
        version: 0,
      },
    ]);
    fixture.componentInstance.select('reallocate');
    fixture.detectChanges();
    await fixture.whenStable();
    const form = fixture.debugElement.query(By.directive(ReallocationForm))
      .componentInstance as ReallocationForm;
    form.form.patchValue({ fromEnvelopeId: 'nancy', toEnvelopeId: 'telcel', amount: '100' });
    fixture.detectChanges();
    element.querySelector<HTMLButtonElement>('.movement-footer button.primary')!.click();
    fixture.detectChanges();
    const rows = element.querySelectorAll('.projected-row');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('Nancy');
    expect(rows[0].textContent).toContain('−$100.00');
    expect(rows[0].textContent).toContain('$1,417.00');
    expect(rows[1].textContent).toContain('+$100.00');
    expect(rows[1].textContent).toContain('$1,309.00');
    TestBed.inject(HttpTestingController).expectNone((r) => r.method === 'POST');
    form.c.uncertain.set(true);
    store.envelopes.update((items) => items.map((e) => ({ ...e, balance: 999 })));
    fixture.detectChanges();
    expect(element.querySelector('.projected-row')?.textContent).toContain('$1,417.00');
  });
  it('aplica formato de pesos en los siete formularios sin alterar el importe del modelo', async () => {
    const { fixture, element } = setup();
    for (const action of fixture.componentInstance.actions) {
      fixture.componentInstance.select(action.id);
      fixture.detectChanges();
      if (action.id === 'income')
        TestBed.inject(HttpTestingController)
          .expectOne('/api/v1/households/h/income-sources')
          .flush([]);
      await fixture.whenStable();
      const input = element.querySelector<HTMLInputElement>(
        '#movement-panel-' + action.id + ' input[formControlName="amount"]',
      )!;
      input.value = '1500.5';
      input.dispatchEvent(new Event('input'));
      input.dispatchEvent(new Event('blur'));
      fixture.detectChanges();
      expect(input.value).toBe('$1,500.50');
      expect(fixture.componentInstance.activeForm()?.form.getRawValue()['amount']).toBe('1500.50');
    }
  });
});
