import { describe, it, expect } from 'vitest';
import { movementDirection } from './movement-direction';
import { MovementResponse } from '../../core/api/generated/models';
describe('Signo de movimientos en los listados', () => {
  it.each([
    ['INCOME', 'credit'],
    ['OPENING_BALANCE', 'credit'],
    ['EXPENSE', 'debit'],
    ['ALLOCATE', 'credit'],
    ['RELEASE', 'debit'],
    ['TRANSFER', 'transfer'],
    ['REALLOCATE', 'transfer'],
    ['ENVELOPE_TRANSFER', 'transfer'],
  ] as const)('clasifica %s como %s', (type, direction) =>
    expect(movementDirection({ type, accountEffects: [], envelopeEffects: [] })).toBe(direction),
  );
  const effect = (entityId: string, change: number) => ({
    entityId,
    change,
    before: 100,
    after: 100 + change,
  });
  it('las reversiones muestran la dirección real de los efectos y no la del gasto original', () => {
    expect(
      movementDirection({
        type: 'REVERSAL',
        accountEffects: [effect('a', 150)],
        envelopeEffects: [],
      }),
    ).toBe('credit');
    expect(
      movementDirection({
        type: 'REVERSAL',
        accountEffects: [effect('a', -150)],
        envelopeEffects: [],
      }),
    ).toBe('debit');
    expect(
      movementDirection({
        type: 'REVERSAL',
        accountEffects: [effect('a', 0)],
        envelopeEffects: [effect('e', -150)],
      }),
    ).toBe('debit');
  });
  it('una reversión interna conserva salida y entrada; cero no inventa un abono', () => {
    expect(
      movementDirection({
        type: 'REVERSAL',
        accountEffects: [effect('a', -0.1), effect('b', 0.1)],
        envelopeEffects: [],
      }),
    ).toBe('transfer');
    expect(
      movementDirection({
        type: 'REVERSAL',
        accountEffects: [effect('a', 0)],
        envelopeEffects: [],
      }),
    ).toBe('neutral');
  });
});
