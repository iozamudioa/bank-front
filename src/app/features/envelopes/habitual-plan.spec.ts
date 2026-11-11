import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { describe, it, expect, vi } from 'vitest';
import { HabitualPlan } from './habitual-plan';
import { HouseholdStore } from '../../core/config/household-store';
import { ModalState } from '../../shared/dialogs/modal-state';
describe('Plan habitual sin quincena', () => {
  it('guarda únicamente una línea y no mueve saldos ni requiere periodo', async () => {
    TestBed.configureTestingModule({
      imports: [HabitualPlan],
      providers: [provideHttpClient(), provideHttpClientTesting(), ModalState],
    });
    const s = TestBed.inject(HouseholdStore);
    s.householdId.set('h');
    s.envelopes.set([
      {
        id: 'e',
        householdId: 'h',
        accountId: 'a',
        name: 'Comida',
        category: null,
        type: 'SPENDING',
        active: true,
        balance: 100,
        version: 0,
        habitualAmount: 500,
      },
    ]);
    vi.spyOn(s, 'refresh').mockResolvedValue();
    const modal = TestBed.inject(ModalState);
    modal.requestClose = vi.fn();
    const f = TestBed.createComponent(HabitualPlan);
    f.componentRef.setInput('envelopeId', 'e');
    f.detectChanges();
    expect(f.componentInstance.amount.value).toBe('500.00');
    f.componentInstance.amount.setValue('0.00');
    const pending = f.componentInstance.save(),
      http = TestBed.inject(HttpTestingController),
      req = http.expectOne('/api/v1/households/h/budget-template/lines/e');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ amount: 0 });
    req.flush({});
    await pending;
    expect(s.envelopes()[0].balance).toBe(100);
    expect(s.periods()).toEqual([]);
    expect(modal.requestClose).toHaveBeenCalled();
    http.verify();
    TestBed.resetTestingModule();
  });
});
