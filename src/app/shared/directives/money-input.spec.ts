import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { describe, expect, it } from 'vitest';
import { MoneyInput } from './money-input';
import { validAmount } from '../utils/money';
@Component({
  imports: [MoneyInput, ReactiveFormsModule],
  template: '<input appMoneyInput [formControl]="amount" />',
})
class Host {
  readonly amount = new FormControl('', {
    nonNullable: true,
    validators: (c) => (validAmount(c.value) ? null : { amount: true }),
  });
}
function setup() {
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
  const enter = (value: string) => {
    input.value = value;
    input.setSelectionRange(value.length, value.length);
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };
  return { fixture, input, enter, control: fixture.componentInstance.amount };
}
describe('Importes en pesos', () => {
  it('muestra miles, pesos y dos decimales para valores programáticos sin cambiar el modelo', () => {
    const { fixture, input, control } = setup();
    control.setValue('1500');
    fixture.detectChanges();
    expect(input.value).toBe('$1,500.00');
    expect(control.value).toBe('1500');
  });
  it('acepta pegar moneda formateada y envía únicamente la cadena decimal', () => {
    const { input, enter, control } = setup();
    enter('$12,345.67');
    expect(control.value).toBe('12345.67');
    expect(control.valid).toBe(true);
    expect(input.value).toBe('$12,345.67');
  });
  it('mantiene el separador decimal mientras se escribe y completa centavos al salir', () => {
    const { input, enter, control } = setup();
    enter('1500.');
    expect(input.value).toBe('$1,500.');
    enter('$1,500.5');
    input.dispatchEvent(new Event('blur'));
    expect(input.value).toBe('$1,500.50');
    expect(control.value).toBe('1500.50');
    expect(control.touched).toBe(true);
  });
  it('conserva precisión máxima, no trunca decimales inválidos y permite vaciar el campo', () => {
    const { input, enter, control } = setup();
    enter('9999999999999.99');
    expect(input.value).toBe('$9,999,999,999,999.99');
    expect(control.value).toBe('9999999999999.99');
    enter('100.001');
    input.dispatchEvent(new Event('blur'));
    expect(control.invalid).toBe(true);
    expect(control.value).toBe('100.001');
    enter('');
    expect(input.value).toBe('');
    expect(control.value).toBe('');
  });
  it('respeta inserciones intermedias sin enviar símbolos al formulario', () => {
    const { fixture, input, control } = setup();
    control.setValue('1234.56');
    fixture.detectChanges();
    input.value = '$19,234.56';
    input.setSelectionRange(3, 3);
    input.dispatchEvent(new Event('input'));
    expect(input.value).toBe('$19,234.56');
    expect(input.selectionStart).toBe(3);
    expect(control.value).toBe('19234.56');
  });
  it('normaliza un punto final al salir para no dejar inválido un importe que se ve completo', () => {
    const { input, enter, control } = setup();
    enter('1500.');
    input.dispatchEvent(new Event('blur'));
    expect(control.value).toBe('1500.00');
    expect(control.valid).toBe(true);
    expect(input.value).toBe('$1,500.00');
  });
});
