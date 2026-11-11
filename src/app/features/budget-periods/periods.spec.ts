import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Periods } from './periods';
import { HouseholdStore } from '../../core/config/household-store';
import { ModalService } from '../../shared/dialogs/modal.service';
import { BudgetPeriodResponse } from '../../core/api/generated/models';
const period: BudgetPeriodResponse = {
  id: 'open',
  householdId: 'h',
  startDate: '2026-11-16',
  endDate: '2026-11-30',
  status: 'OPEN',
  expectedIncome: 1000,
  lines: [],
};
describe('Acciones de quincena desde el historial', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [Periods],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }),
  );
  afterEach(() => {
    try {
      TestBed.inject(HttpTestingController).verify();
    } finally {
      TestBed.resetTestingModule();
    }
  });
  it('abre la guía en una quincena abierta aunque se esté consultando una cerrada, sin cargar el editor en la página', () => {
    const s = TestBed.inject(HouseholdStore);
    s.householdId.set('h');
    s.periods.set([{ ...period, id: 'closed', status: 'CLOSED' }, period]);
    s.periodId.set('closed');
    const launch = vi.spyOn(TestBed.inject(ModalService), 'periodSetup').mockResolvedValue();
    const fixture = TestBed.createComponent(Periods);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('app-budget-editor')).toBeNull();
    TestBed.inject(HttpTestingController).expectNone('/api/v1/households/h/budget-template');
    element.querySelector<HTMLButtonElement>('.fund-period')!.click();
    expect(launch).toHaveBeenCalledWith('open');
    expect(s.periodId()).toBe('closed');
  });
  it('usa la abierta seleccionada y deshabilita la carga si no queda ninguna abierta', () => {
    const s = TestBed.inject(HouseholdStore);
    s.householdId.set('h');
    s.periods.set([period, { ...period, id: 'selected' }]);
    s.periodId.set('selected');
    const launch = vi.spyOn(TestBed.inject(ModalService), 'periodSetup').mockResolvedValue();
    const fixture = TestBed.createComponent(Periods);
    fixture.detectChanges();
    fixture.componentInstance.fund();
    expect(launch).toHaveBeenCalledWith('selected');
    launch.mockClear();
    s.periods.set([{ ...period, status: 'CLOSED' }]);
    fixture.detectChanges();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.fund-period')!
        .disabled,
    ).toBe(true);
    fixture.componentInstance.fund();
    expect(launch).not.toHaveBeenCalled();
  });
});
