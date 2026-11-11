import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AllocationForm } from './allocation-form';
import { HouseholdStore } from '../../core/config/household-store';

describe('Importe planeado al apartar dinero', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AllocationForm],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const store = TestBed.inject(HouseholdStore);
    store.envelopes.set(
      ['central', 'sams', 'sin-plan'].map((id) => ({
        id,
        accountId: 'cash',
        active: true,
        balance: 900,
        category: null,
        habitualAmount: null,
        householdId: 'h',
        name: id,
        type: 'SPENDING',
        version: 0,
      })),
    );
    store.periods.set([
      {
        id: 'q1',
        householdId: 'h',
        startDate: '2026-11-01',
        endDate: '2026-11-14',
        status: 'OPEN',
        expectedIncome: 1000,
        lines: [
          { envelopeId: 'central', amount: 150.5 },
          { envelopeId: 'sams', amount: 0 },
        ],
      },
      {
        id: 'q2',
        householdId: 'h',
        startDate: '2026-11-15',
        endDate: '2026-11-30',
        status: 'OPEN',
        expectedIncome: 1000,
        lines: [{ envelopeId: 'central', amount: 250 }],
      },
    ]);
    store.periodId.set('q1');
  });
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  function form() {
    const fixture = TestBed.createComponent(AllocationForm);
    fixture.detectChanges();
    const select = fixture.nativeElement.querySelector('select') as HTMLSelectElement;
    const selectEnvelope = (id: string) => {
      select.value = id;
      select.dispatchEvent(new Event('change'));
      fixture.detectChanges();
    };
    return { fixture, component: fixture.componentInstance, selectEnvelope };
  }

  it('completa lo planeado con dos decimales y permite editar el importe', () => {
    const { fixture, component, selectEnvelope } = form();
    selectEnvelope('central');
    expect(component.form.controls.amount.value).toBe('150.50');
    const input = fixture.nativeElement.querySelector(
      'input[formControlName="amount"]',
    ) as HTMLInputElement;
    expect(input.value).toBe('$150.50');
    input.value = '75.25';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(component.form.controls.amount.value).toBe('75.25');
    expect(component.form.controls.amount.valid).toBe(true);
  });

  it('usa el presupuesto de la quincena seleccionada, no el saldo del sobre', () => {
    const { component, selectEnvelope } = form();
    TestBed.inject(HouseholdStore).periodId.set('q2');
    selectEnvelope('central');
    expect(component.form.controls.amount.value).toBe('250.00');
  });

  it('limpia el importe al elegir un sobre sin plan o quitar la selecci?n', () => {
    const { component, selectEnvelope } = form();
    selectEnvelope('central');
    selectEnvelope('sin-plan');
    expect(component.form.controls.amount.value).toBe('');
    selectEnvelope('central');
    selectEnvelope('');
    expect(component.form.controls.amount.value).toBe('');
  });

  it('conserva un plan cero y no inventa un monto cuando no hay quincena', () => {
    const { component, selectEnvelope } = form();
    selectEnvelope('sams');
    expect(component.form.controls.amount.value).toBe('0.00');
    expect(component.form.controls.amount.invalid).toBe(true);
    TestBed.inject(HouseholdStore).periodId.set('');
    selectEnvelope('central');
    expect(component.form.controls.amount.value).toBe('');
  });
  it('muestra el dinero libre real de la cuenta del sobre, no su saldo ni el total del hogar', () => {
    const store = TestBed.inject(HouseholdStore);
    store.envelopes.update((items) => [
      ...items,
      {
        id: 'digital',
        accountId: 'digital-account',
        active: true,
        balance: 50,
        category: null,
        habitualAmount: null,
        householdId: 'h',
        name: 'Sobre digital',
        type: 'SPENDING',
        version: 0,
      },
    ]);
    store.dashboard.set({
      total: 2000,
      reserved: 1000,
      free: 1000,
      accounts: [
        { id: 'cash', name: 'Efectivo', type: 'PHYSICAL', total: 1000, reserved: 900, free: 100 },
        {
          id: 'digital-account',
          name: 'Cuenta digital',
          type: 'DIGITAL',
          total: 1000,
          reserved: 100,
          free: 900,
        },
      ],
    });
    const { fixture, component, selectEnvelope } = form();
    const amount = () =>
      (fixture.nativeElement as HTMLElement).querySelector('.available-balance .amount')
        ?.textContent;
    expect(amount()).toContain('1,000.00');
    selectEnvelope('central');
    expect(component.availableAmount()).toBe(100);
    expect(amount()).toContain('100.00');
    expect(fixture.nativeElement.textContent).toContain('Efectivo');
    selectEnvelope('digital');
    expect(component.availableAmount()).toBe(900);
    expect(amount()).toContain('900.00');
    expect(fixture.nativeElement.textContent).toContain('Cuenta digital');
  });
  it('actualiza el disponible cuando llegan nuevos saldos del backend', () => {
    const store = TestBed.inject(HouseholdStore);
    store.dashboard.set({
      total: 1000,
      reserved: 900,
      free: 100,
      accounts: [
        { id: 'cash', name: 'Efectivo', type: 'PHYSICAL', total: 1000, reserved: 900, free: 100 },
      ],
    });
    const { fixture, component, selectEnvelope } = form();
    selectEnvelope('central');
    store.dashboard.set({
      total: 1000,
      reserved: 985,
      free: 15,
      accounts: [
        { id: 'cash', name: 'Efectivo', type: 'PHYSICAL', total: 1000, reserved: 985, free: 15 },
      ],
    });
    fixture.detectChanges();
    expect(component.availableAmount()).toBe(15);
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.available-balance .amount')
        ?.textContent,
    ).toContain('15.00');
  });
  it('distingue un saldo cero confirmado de un saldo no disponible y oculta importes sin conexión', () => {
    const { fixture, component, selectEnvelope } = form();
    selectEnvelope('central');
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.available-balance .amount'),
    ).toBeNull();
    TestBed.inject(HouseholdStore).dashboard.set({
      total: 900,
      reserved: 900,
      free: 0,
      accounts: [
        { id: 'cash', name: 'Efectivo', type: 'PHYSICAL', total: 900, reserved: 900, free: 0 },
      ],
    });
    fixture.detectChanges();
    expect(component.availableAmount()).toBe(0);
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.available-balance .amount')
        ?.textContent,
    ).toContain('0.00');
    component.c.connection.online.set(false);
    fixture.detectChanges();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.available-balance .amount'),
    ).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Conéctate');
  });

  it('precarga el plan completo en el formulario embebido con sobre y quincena fijos', () => {
    const fixture = TestBed.createComponent(AllocationForm);
    fixture.componentRef.setInput('embedded', true);
    fixture.componentRef.setInput('fixedEnvelopeId', 'central');
    fixture.componentRef.setInput('periodId', 'q1');
    TestBed.inject(HouseholdStore).periodId.set('q2');
    fixture.detectChanges();
    const component = fixture.componentInstance;
    expect(component.form.controls.envelopeId.value).toBe('central');
    expect(component.form.controls.amount.value).toBe('150.50');
    expect(fixture.nativeElement.querySelector('select')).toBeNull();
    expect(fixture.nativeElement.querySelector('[formcontrolname="amount"]').value).toBe('$150.50');
  });

  it('espera a que llegue el plan y no sobrescribe el importe editado cuando se refrescan los datos', () => {
    const store = TestBed.inject(HouseholdStore);
    const periods = store.periods();
    store.periods.set(periods.map((period) => ({ ...period, lines: [] })));
    const fixture = TestBed.createComponent(AllocationForm);
    fixture.componentRef.setInput('fixedEnvelopeId', 'central');
    fixture.componentRef.setInput('periodId', 'q1');
    fixture.detectChanges();
    expect(fixture.componentInstance.form.controls.amount.value).toBe('');
    store.periods.set(periods);
    fixture.detectChanges();
    expect(fixture.componentInstance.form.controls.amount.value).toBe('150.50');
    const input = fixture.nativeElement.querySelector(
      '[formcontrolname="amount"]',
    ) as HTMLInputElement;
    input.value = '75.25';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    store.periods.set(
      periods.map((period) => ({ ...period, lines: [{ envelopeId: 'central', amount: 999 }] })),
    );
    fixture.detectChanges();
    expect(fixture.componentInstance.form.controls.amount.value).toBe('75.25');
  });

  it('conserva la captura manual aunque el plan llegue después de empezar a escribir', () => {
    const store = TestBed.inject(HouseholdStore);
    const periods = store.periods();
    store.periods.set([]);
    const fixture = TestBed.createComponent(AllocationForm);
    fixture.componentRef.setInput('fixedEnvelopeId', 'central');
    fixture.componentRef.setInput('periodId', 'q1');
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector(
      '[formcontrolname="amount"]',
    ) as HTMLInputElement;
    input.value = '85.50';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    store.periods.set(periods);
    fixture.detectChanges();
    expect(fixture.componentInstance.form.controls.amount.value).toBe('85.50');
  });
});
