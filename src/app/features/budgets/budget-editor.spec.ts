import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { describe, it, expect } from 'vitest';
import { BudgetEditor } from './budget-editor';
import { HouseholdStore } from '../../core/config/household-store';
describe('Primer presupuesto', () => {
  it('permite crear la primera plantilla con sobres existentes después de un 404', async () => {
    TestBed.configureTestingModule({
      imports: [BudgetEditor],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const s = TestBed.inject(HouseholdStore);
    s.householdId.set('h');
    s.envelopes.set([
      {
        id: 'central',
        accountId: 'a',
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
    const fixture = TestBed.createComponent(BudgetEditor);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http
      .expectOne('/api/v1/households/h/budget-template')
      .flush({}, { status: 404, statusText: 'Not Found' });
    await fixture.whenStable();
    expect(fixture.componentInstance.isNew()).toBe(true);
    expect(fixture.componentInstance.rows.length).toBe(1);
    fixture.componentInstance.rows.at(0).controls.amount.setValue('150.00');
    const save = fixture.componentInstance.save();
    const req = http.expectOne('/api/v1/households/h/budget-template');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.allocations).toEqual([{ envelopeId: 'central', amount: 150 }]);
    req.flush({});
    await save;
    expect(fixture.componentInstance.saved()).toBe(true);
    http.verify();
  });

  it('suma los planes con decimales, recalcula al editar y guarda el total aunque el servidor devuelva cero', async () => {
    TestBed.configureTestingModule({
      imports: [BudgetEditor],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const s = TestBed.inject(HouseholdStore);
    s.householdId.set('h');
    s.envelopes.set(
      ['a', 'b'].map((id) => ({
        id,
        householdId: 'h',
        accountId: 'account',
        name: id,
        type: 'SPENDING',
        active: true,
        category: null,
        habitualAmount: 0,
        balance: 99999,
        version: 0,
      })),
    );
    const fixture = TestBed.createComponent(BudgetEditor);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/v1/households/h/budget-template').flush({
      expectedIncome: 0,
      lines: [
        { envelopeId: 'a', amount: 1200.1 },
        { envelopeId: 'b', amount: 300.2 },
      ],
    });
    await fixture.whenStable();
    fixture.detectChanges();
    const c = fixture.componentInstance;
    expect(c.form.controls.expectedIncome.value).toBe('1500.30');
    expect(fixture.nativeElement.querySelector('[formcontrolname="expectedIncome"]').readOnly).toBe(
      true,
    );
    c.rows.at(0).controls.amount.setValue('9.99');
    expect(c.form.controls.expectedIncome.value).toBe('310.19');
    c.form.controls.expectedIncome.setValue('999.99');
    const save = c.save();
    const req = http.expectOne('/api/v1/households/h/budget-template');
    expect(req.request.body.expectedIncome).toBe(310.19);
    expect(req.request.body.allocations).toEqual([
      { envelopeId: 'a', amount: 9.99 },
      { envelopeId: 'b', amount: 300.2 },
    ]);
    req.flush({});
    await save;
    c.rows.at(0).controls.amount.setValue('');
    expect(c.form.invalid).toBe(true);
    expect(c.form.controls.expectedIncome.value).toBe('');
    http.verify();
    TestBed.resetTestingModule();
  });
});
