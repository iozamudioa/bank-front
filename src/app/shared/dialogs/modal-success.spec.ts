import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MAT_DIALOG_DEFAULT_OPTIONS, MatDialog } from '@angular/material/dialog';
import { provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ModalService } from './modal.service';
import { HouseholdStore } from '../../core/config/household-store';
import { ToastService } from '../notifications/toast.service';
import { OperationSafety } from '../../core/config/operation-safety';
describe('Cerrar modal y notificar solo cuando se confirma el éxito', () => {
  let http: HttpTestingController,
    store: HouseholdStore,
    service: ModalService,
    toasts: ToastService;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: MAT_DIALOG_DEFAULT_OPTIONS,
          useValue: { enterAnimationDuration: 0, exitAnimationDuration: 0 },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    store = TestBed.inject(HouseholdStore);
    service = TestBed.inject(ModalService);
    toasts = TestBed.inject(ToastService);
    store.householdId.set('h');
    store.periods.set([
      {
        id: 'p',
        householdId: 'h',
        startDate: '2026-11-01',
        endDate: '2026-11-15',
        status: 'OPEN',
        expectedIncome: 1000,
        lines: [],
      },
    ]);
    store.periodId.set('p');
    store.envelopes.set([
      {
        id: 'e',
        name: 'Compras',
        balance: 200,
        accountId: 'a',
        householdId: 'h',
        active: true,
        category: null,
        habitualAmount: null,
        type: 'SPENDING',
        version: 0,
      },
    ]);
    vi.spyOn(store, 'refresh').mockResolvedValue();
  });
  afterEach(() => {
    try {
      http.verify();
    } finally {
      TestBed.inject(OperationSafety).locked.set(false);
      TestBed.inject(MatDialog).closeAll();
      TestBed.resetTestingModule();
    }
  });
  const stable = () => TestBed.inject(ApplicationRef).whenStable();
  function fill(name: string, value: string) {
    const element = document.querySelector<HTMLInputElement | HTMLSelectElement>(
      '.bank-modal [formcontrolname="' + name + '"]',
    )!;
    element.value = value;
    element.dispatchEvent(
      new Event(element instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }),
    );
  }
  function submit() {
    document
      .querySelector<HTMLFormElement>('.bank-modal form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  }
  function expectSuccess(message: string) {
    expect(TestBed.inject(MatDialog).openDialogs.length).toBe(0);
    expect(TestBed.inject(OperationSafety).modalOpen()).toBe(false);
    expect(toasts.messages().map((t) => t.message)).toEqual([message]);
  }
  it('cierra Crear cuenta tras refrescar los datos y muestra un solo toast', async () => {
    await service.account();
    await stable();
    fill('name', 'Cuenta de prueba');
    submit();
    expect(toasts.messages()).toEqual([]);
    const closed = firstValueFrom(TestBed.inject(MatDialog).openDialogs[0].afterClosed());
    http.expectOne('/api/v1/households/h/accounts').flush({});
    await closed;
    expectSuccess('Cuenta creada correctamente.');
    expect(store.refresh).toHaveBeenCalledTimes(1);
  });
  it('mantiene Crear cuenta abierto y muestra el error local sin toast', async () => {
    await service.account();
    await stable();
    fill('name', 'Cuenta de prueba');
    submit();
    http
      .expectOne('/api/v1/households/h/accounts')
      .flush({}, { status: 400, statusText: 'Bad Request' });
    await stable();
    expect(TestBed.inject(MatDialog).openDialogs.length).toBe(1);
    expect(document.querySelector('.bank-modal [role="alert"]')?.textContent).toContain(
      'Revisa los datos',
    );
    expect(toasts.messages()).toEqual([]);
    expect(
      document.querySelector<HTMLInputElement>('.bank-modal [formcontrolname="name"]')?.value,
    ).toBe('Cuenta de prueba');
  });
  it('cierra Nuevo movimiento al confirmar y notifica fuera del modal', async () => {
    await service.movement();
    await stable();
    fill('envelopeId', 'e');
    fill('amount', '75');
    await stable();
    document.querySelector<HTMLButtonElement>('.movement-footer .primary')!.click();
    await stable();
    const closed = firstValueFrom(TestBed.inject(MatDialog).openDialogs[0].afterClosed());
    document.querySelector<HTMLButtonElement>('.movement-footer .primary')!.click();
    http.expectOne('/api/v1/households/h/movements/allocations').flush({});
    await closed;
    expectSuccess('Movimiento registrado correctamente.');
  });
  it('el gasto con confirmación incierta conserva el modal y al reintentar con éxito lo cierra con toast', async () => {
    await service.expense('e');
    await stable();
    fill('amount', '75');
    submit();
    http
      .expectOne('/api/v1/households/h/movements/expenses/preview')
      .flush({ requestedAmount: 75, targetBalance: 200, shortfall: 0, eligibleDonors: [] });
    await stable();
    const confirm = () =>
      [...document.querySelectorAll<HTMLButtonElement>('.bank-modal button')]
        .find(
          (b) =>
            b.textContent?.includes('Confirmar gasto') ||
            b.textContent?.includes('Reintentar misma operación'),
        )!
        .click();
    confirm();
    const first = http.expectOne('/api/v1/households/h/movements/expenses');
    const key = first.request.headers.get('Idempotency-Key');
    first.flush({}, { status: 503, statusText: 'Unavailable' });
    await stable();
    expect(TestBed.inject(MatDialog).openDialogs.length).toBe(1);
    expect(document.querySelector('.bank-modal [role="alert"]')).not.toBeNull();
    expect(toasts.messages()).toEqual([]);
    const closed = firstValueFrom(TestBed.inject(MatDialog).openDialogs[0].afterClosed());
    confirm();
    const second = http.expectOne('/api/v1/households/h/movements/expenses');
    expect(second.request.headers.get('Idempotency-Key')).toBe(key);
    second.flush({});
    await closed;
    expectSuccess('Gasto registrado correctamente.');
  });

  async function budget() {
    await service.budget();
    await stable();
    http.expectOne('/api/v1/households/h/budget-template').flush({
      expectedIncome: 2000.5,
      lines: [{ envelopeId: 'e', amount: 150.25 }],
    });
    await stable();
  }
  it('guarda el presupuesto desde su modal, mantiene el contrato y cierra con toast', async () => {
    await budget();
    expect(document.querySelectorAll('.bank-modal h2')).toHaveLength(1);
    expect(
      document.querySelector<HTMLInputElement>('[formcontrolname="expectedIncome"]')?.value,
    ).toBe('$150.25');
    const closed = firstValueFrom(TestBed.inject(MatDialog).openDialogs[0].afterClosed());
    submit();
    submit();
    const req = http.expectOne('/api/v1/households/h/budget-template');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({
      expectedIncome: 150.25,
      allocations: [{ envelopeId: 'e', amount: 150.25 }],
    });
    expect(document.querySelector<HTMLFieldSetElement>('.bank-modal fieldset')?.disabled).toBe(
      true,
    );
    req.flush({});
    await closed;
    expectSuccess('Presupuesto habitual guardado correctamente.');
    expect(store.refresh).not.toHaveBeenCalled();
  });
  it('un error al guardar el presupuesto conserva el modal, el importe y el mensaje local', async () => {
    await budget();
    await vi.waitFor(() =>
      expect(
        document.querySelector<HTMLInputElement>('.bank-modal [formcontrolname="amount"]')?.value,
      ).toBe('$150.25'),
    );
    fill('amount', '3000.75');
    submit();
    http
      .expectOne('/api/v1/households/h/budget-template')
      .flush({}, { status: 400, statusText: 'Bad Request' });
    await stable();
    expect(TestBed.inject(MatDialog).openDialogs).toHaveLength(1);
    expect(document.querySelector('.bank-modal [role="alert"]')?.textContent).toContain(
      'Revisa los datos',
    );
    expect(
      document.querySelector<HTMLInputElement>('[formcontrolname="expectedIncome"]')?.value,
    ).toContain('3,000.75');
    expect(toasts.messages()).toEqual([]);
  });
  it('no permite guardar valores vacíos como plantilla si la consulta del presupuesto falla', async () => {
    await service.budget();
    await stable();
    http
      .expectOne('/api/v1/households/h/budget-template')
      .flush({}, { status: 503, statusText: 'Unavailable' });
    await vi.waitFor(() =>
      expect(document.querySelector('.bank-modal [role="alert"]')).not.toBeNull(),
    );
    await stable();
    expect(document.querySelector<HTMLButtonElement>('.bank-modal button.primary')?.disabled).toBe(
      true,
    );
    submit();
    http.expectNone((r) => r.method === 'PUT');
    expect(TestBed.inject(MatDialog).openDialogs).toHaveLength(1);
    expect(document.querySelector('.bank-modal [role="alert"]')).not.toBeNull();
    expect(toasts.messages()).toEqual([]);
  });
  it('cierra una quincena solo al confirmar desde el modal y muestra toast al terminar', async () => {
    await service.periodClose('p');
    await stable();
    http.expectNone((r) => r.method === 'POST');
    const closed = firstValueFrom(TestBed.inject(MatDialog).openDialogs[0].afterClosed());
    const confirm = document.querySelector<HTMLButtonElement>('.bank-modal button.primary')!;
    confirm.click();
    confirm.click();
    http.expectOne('/api/v1/households/h/budget-periods/p/close').flush({});
    await closed;
    expectSuccess('Quincena cerrada correctamente.');
    expect(store.refresh).toHaveBeenCalledTimes(1);
  });
  it('conserva el modal de cierre con error local si la API rechaza cerrar la quincena', async () => {
    await service.periodClose('p');
    await stable();
    document.querySelector<HTMLButtonElement>('.bank-modal button.primary')!.click();
    http
      .expectOne('/api/v1/households/h/budget-periods/p/close')
      .flush({}, { status: 409, statusText: 'Conflict' });
    await stable();
    expect(TestBed.inject(MatDialog).openDialogs).toHaveLength(1);
    expect(document.querySelector('.bank-modal [role="alert"]')).not.toBeNull();
    expect(toasts.messages()).toEqual([]);
  });
});
