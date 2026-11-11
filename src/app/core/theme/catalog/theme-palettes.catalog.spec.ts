import { describe, it, expect } from 'vitest';
import { THEME_PALETTES } from './theme-palettes.catalog';
import { contrastRatio } from '../utils/color.util';
describe('Catálogo y contraste de tokens', () => {
  it('conserva todos los colores originales en la vista previa', () => {
    expect(THEME_PALETTES.map((p) => p.colors)).toEqual([
      ['#DDDCDB', '#FD7B41', '#EDBF9B', '#3C4044'],
      ['#F6C992', '#FA6E81', '#ACC0D3', '#D396A6', '#09A1A1', '#5484A4'],
      ['#ECB914', '#F6D579', '#9D8108', '#CBB8A0', '#4F3D35'],
      ['#F2F0EF', '#BBBDBC', '#245F73', '#733E24'],
    ]);
    for (const p of THEME_PALETTES) expect(p.previewColors).toEqual(p.colors);
  });
  for (const p of THEME_PALETTES)
    for (const mode of ['lightTokens', 'darkTokens'] as const) {
      it(p.name + ' / ' + mode + ' cumple AA para texto y acciones', () => {
        const t = p[mode];
        for (const bg of [
          'background',
          'surface',
          'surface-variant',
          'primary-container',
          'secondary-container',
        ] as const)
          for (const fg of ['text', 'text-muted', 'primary', 'secondary', 'accent'] as const)
            expect(contrastRatio(t[fg], t[bg]), fg + ' sobre ' + bg).toBeGreaterThanOrEqual(4.5);
        for (const role of ['primary', 'secondary', 'accent'] as const)
          expect(contrastRatio(t[role], t[('on-' + role) as 'on-primary'])).toBeGreaterThanOrEqual(
            4.5,
          );
        expect(contrastRatio(t.hero, t['on-hero'])).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(t.hero, t['hero-muted'])).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(t.hero, t['hero-accent'])).toBeGreaterThanOrEqual(4.5);
      });
      it(p.name + ' / ' + mode + ' conserva estados y foco legibles', () => {
        const t = p[mode];
        for (const role of ['success', 'warning', 'danger'] as const) {
          expect(
            contrastRatio(t[role], t[(role + '-container') as 'success-container']),
          ).toBeGreaterThanOrEqual(4.5);
          expect(contrastRatio(t[role], t.surface)).toBeGreaterThanOrEqual(4.5);
        }
        expect(contrastRatio(t['control-border'], t.surface)).toBeGreaterThanOrEqual(3);
        expect(contrastRatio(t.focus, t.background)).toBeGreaterThanOrEqual(3);
      });
    }
  it('mantiene los mismos colores de estado para todas las paletas en cada modo', () => {
    for (const mode of ['lightTokens', 'darkTokens'] as const)
      for (const p of THEME_PALETTES) {
        const t = p[mode];
        expect(t.success).not.toBe(t.danger);
        expect(t.success).not.toBe(t.warning);
      }
  });
});
