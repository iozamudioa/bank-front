import { TestBed } from '@angular/core/testing';
import { Type } from '@angular/core';
import { FormControl } from '@angular/forms';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { afterEach, describe, expect, it } from 'vitest';
import { IncomeForm } from '../income/income-form';
import { AllocationForm } from '../allocations/allocation-form';
import { ReleaseForm } from '../allocations/release-form';
import { TransferForm } from '../transfers/transfer-form';
import { ReallocationForm } from '../transfers/reallocation-form';
import { EnvelopeTransferForm } from '../transfers/envelope-transfer-form';
const forms: [string, Type<unknown>][] = [
  ['ingreso', IncomeForm],
  ['apartado', AllocationForm],
  ['liberacion', ReleaseForm],
  ['transferencia', TransferForm],
  ['reasignacion', ReallocationForm],
  ['transferencia de sobres', EnvelopeTransferForm],
];
describe('Importe cero exclusivo de correcciones', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    TestBed.resetTestingModule();
  });
  it.each(forms)('%s conserva altas positivas y acepta cero solo en modo correccion', (_, type) => {
    TestBed.configureTestingModule({
      imports: [type],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(type);
    const amount = (
      fixture.componentInstance as { form: { controls: { amount: FormControl<string> } } }
    ).form.controls.amount;
    fixture.detectChanges();
    amount.setValue('0.00');
    expect(amount.valid).toBe(false);
    fixture.componentRef.setInput('correctionMode', true);
    fixture.detectChanges();
    amount.updateValueAndValidity();
    expect(amount.valid).toBe(true);
    for (const invalid of ['-1.00', '0.001']) {
      amount.setValue(invalid);
      expect(amount.valid).toBe(false);
    }
    amount.setValue('1.00');
    expect(amount.valid).toBe(true);
    fixture.componentRef.setInput('correctionMode', false);
    fixture.detectChanges();
    amount.setValue('0.00');
    expect(amount.valid).toBe(false);
  });
});
