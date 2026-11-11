import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { describe, it, expect, vi } from 'vitest';
import { PeriodCreate } from './period-create';
import { ModalState } from '../../shared/dialogs/modal-state';
import { HouseholdStore } from '../../core/config/household-store';
describe('Confirmación de cambio de quincena', () => {
  it('cierra la apertura con éxito e indica la quincena exacta para continuar la guía', async () => {
    TestBed.configureTestingModule({
      imports: [PeriodCreate],
      providers: [provideHttpClient(), provideHttpClientTesting(), ModalState],
    });
    TestBed.inject(HouseholdStore).householdId.set('h');
    const modal = TestBed.inject(ModalState);
    const complete = vi.spyOn(modal, 'complete');
    const fixture = TestBed.createComponent(PeriodCreate);
    const c = fixture.componentInstance;
    c.form.patchValue({ range: { startDate: '2026-11-16', endDate: '2026-11-30' } });
    vi.spyOn(c.flow, 'prepare').mockResolvedValue('new-period');
    await c.create();
    expect(complete).toHaveBeenCalledWith('Quincena abierta correctamente.', 'new-period');
    expect(modal.busy()).toBe(false);
  });

  it('muestra Sí y No con las fechas reales y conserva el formulario al cancelar', async () => {
    TestBed.configureTestingModule({
      imports: [PeriodCreate],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    TestBed.inject(HouseholdStore).householdId.set('h');
    const fixture = TestBed.createComponent(PeriodCreate),
      component = fixture.componentInstance;
    component.form.patchValue({ range: { startDate: '2026-11-15', endDate: '2026-11-30' } });
    fixture.detectChanges();
    const pending = component.create(),
      http = TestBed.inject(HttpTestingController);
    http
      .expectOne('/api/v1/households/h/budget-template')
      .flush({ expectedIncome: 1000, lines: [] });
    http.expectOne('/api/v1/households/h/budget-periods').flush([
      {
        id: 'old',
        householdId: 'h',
        startDate: '2026-11-01',
        endDate: '2026-11-14',
        status: 'OPEN',
        expectedIncome: 0,
        lines: [],
      },
    ]);
    await pending;
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Se cerrará la quincena anterior');
    expect(element.textContent).toContain('2026-11-01');
    expect(element.textContent).toContain('¿Estás de acuerdo?');
    const choices = [
      ...element.querySelectorAll<HTMLButtonElement>('.confirmation-actions button'),
    ];
    expect(choices[0].textContent?.trim()).toBe('No');
    expect(choices[1].textContent).toContain('Sí, cerrar y abrir nueva');
    choices[0].click();
    fixture.detectChanges();
    expect(component.flow.confirmation()).toBeNull();
    expect(component.form.controls.range.value?.startDate).toBe('2026-11-15');
    http.expectNone((r) => r.method === 'POST');
    http.verify();
  });
  it('muestra una alerta en el modal cuando falta la plantilla habitual', async () => {
    TestBed.configureTestingModule({
      imports: [PeriodCreate],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const store = TestBed.inject(HouseholdStore);
    store.householdId.set('h');
    vi.spyOn(store, 'refresh').mockResolvedValue();
    const fixture = TestBed.createComponent(PeriodCreate);
    fixture.componentInstance.form.patchValue({
      range: { startDate: '2026-11-15', endDate: '2026-11-30' },
    });
    fixture.detectChanges();
    const work = fixture.componentInstance.create();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/v1/households/h/budget-periods').flush([]);
    http
      .expectOne('/api/v1/households/h/budget-template')
      .flush({}, { status: 404, statusText: 'Not Found' });
    await work;
    fixture.detectChanges();
    const alert = (fixture.nativeElement as HTMLElement).querySelector('[role="alert"]');
    expect(alert?.textContent).toContain('algún importe mayor a $0.00');
    expect(alert?.textContent).not.toContain('recurso');
    expect(fixture.componentInstance.form.controls.range.value).toEqual({
      startDate: '2026-11-15',
      endDate: '2026-11-30',
    });
    http.expectNone((r) => r.method === 'POST');
    http.verify();
  });
});
