import { describe, it, expect } from 'vitest';
import { routes } from './app.routes';
describe('Rutas', () => {
  it('carga funcionalidades de forma diferida', () => {
    for (const path of [
      'dashboard',
      'accounts',
      'envelopes',
      'expenses',
      'budget-periods',
      'movements',
      'settings',
    ])
      expect(routes.find((r) => r.path === path)?.loadComponent).toBeTypeOf('function');
  });
});
