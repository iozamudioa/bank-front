import { describe, it, expect } from 'vitest';
import { isDateRange, localDateString, parseLocalDate } from './date-range';
describe('Fechas locales de una quincena', () => {
  it('conserva el día local sin convertirlo a UTC', () => {
    const date = new Date(2026, 11, 16, 23, 30);
    expect(localDateString(date)).toBe('2026-12-16');
    expect(localDateString(parseLocalDate('2026-12-31')!)).toBe('2026-12-31');
  });
  it('rechaza fechas inexistentes, campos incompletos y orden inverso', () => {
    for (const range of [
      null,
      { startDate: '2026-02-30', endDate: '2026-03-15' },
      { startDate: '2026-11-15', endDate: '' },
      { startDate: '2026-11-30', endDate: '2026-11-15' },
    ])
      expect(isDateRange(range)).toBe(false);
    expect(isDateRange({ startDate: '2026-11-15', endDate: '2026-11-30' })).toBe(true);
  });
});
