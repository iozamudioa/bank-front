import { TestBed } from '@angular/core/testing';
import { afterEach, describe, it, expect } from 'vitest';
import { MovementAmount } from './movement-amount';
import { MovementResponse } from '../../core/api/generated/models';
describe('Formato del importe firmado', () => {
  afterEach(() => TestBed.resetTestingModule());
  it.each([
    ['INCOME', 250.5, '+$250.50'],
    ['EXPENSE', 1500, '−$1,500.00'],
    ['EXPENSE', 0, '−$0.00'],
  ] as const)('formatea %s por %s', (type, amount, text) => {
    TestBed.configureTestingModule({ imports: [MovementAmount] });
    const f = TestBed.createComponent(MovementAmount);
    f.componentRef.setInput('movement', {
      type,
      amount,
      accountEffects: [],
      envelopeEffects: [],
    } as unknown as MovementResponse);
    f.detectChanges();
    expect(f.nativeElement.textContent.trim()).toBe(text);
  });
  it('muestra ambas direcciones de una transferencia en lugar de clasificarla como gasto', () => {
    TestBed.configureTestingModule({ imports: [MovementAmount] });
    const f = TestBed.createComponent(MovementAmount);
    f.componentRef.setInput('movement', {
      type: 'TRANSFER',
      amount: 250.5,
      accountEffects: [],
      envelopeEffects: [],
    } as unknown as MovementResponse);
    f.detectChanges();
    const values = f.nativeElement.querySelectorAll('.transfer > span');
    expect(values[0].textContent.trim()).toBe('−$250.50');
    expect(values[1].textContent.trim()).toBe('+$250.50');
  });
});
