import Decimal from 'decimal.js';
export function validAmount(value: string, zero = false): boolean {
  return (
    /^\d{1,13}(\.\d{1,2})?$/.test(value) &&
    new Decimal(value).gte(zero ? 0 : '0.01') &&
    new Decimal(value).lte('9999999999999.99')
  );
}
export function sum(values: number[]): number {
  return values.reduce((a, b) => a.plus(b), new Decimal(0)).toNumber();
}
