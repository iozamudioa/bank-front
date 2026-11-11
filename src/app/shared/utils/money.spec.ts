import { describe, it, expect } from 'vitest';
import { validAmount, sum } from './money';
describe('Importes MXN', () => {
  it.each(['0', '-1', '1.001', 'NaN', 'Infinity', '1e3', '', '1,000', ' 12', '10000000000000'])(
    'rechaza %s',
    (v) => expect(validAmount(v)).toBe(false),
  );
  it.each(['0.01', '150', '150.20', '9999999999999.99'])('acepta %s', (v) =>
    expect(validAmount(v)).toBe(true),
  );
  it('permite cero solo en planes', () => {
    expect(validAmount('0', true)).toBe(true);
    expect(validAmount('0')).toBe(false);
  });
  it('suma decimales sin error binario', () => expect(sum([0.1, 0.2])).toBe(0.3));
});
