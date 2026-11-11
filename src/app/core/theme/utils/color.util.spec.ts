import { describe, it, expect } from 'vitest';
import { contrastRatio, mix, readable } from './color.util';
describe('Cálculo WCAG de luminancia', () => {
  it('calcula los extremos de contraste', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBe(21);
    expect(contrastRatio('#123456', '#123456')).toBe(1);
  });
  it('distingue las dos tonalidades a ambos lados del límite AA', () => {
    expect(contrastRatio('#777777', '#ffffff')).toBeLessThan(4.5);
    expect(contrastRatio('#767676', '#ffffff')).toBeGreaterThan(4.5);
  });
  it('deriva un color accesible sin invertir toda la paleta', () => {
    const base = '#FD7B41';
    const derived = readable(base, ['#ffffff']);
    expect(contrastRatio(derived, '#ffffff')).toBeGreaterThanOrEqual(4.5);
    expect(mix(base, '#ffffff', 0)).toBe('#fd7b41');
  });
});
