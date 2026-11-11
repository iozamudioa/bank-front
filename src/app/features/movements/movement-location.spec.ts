import { describe, it, expect } from 'vitest';
import { movementLocation, movementTitle } from './movement-location';
import {
  AccountResponse,
  EnvelopeResponse,
  MovementResponse,
} from '../../core/api/generated/models';
const accounts: AccountResponse[] = ['Banco', 'Efectivo'].map((name, i) => ({
  id: String(i),
  name,
  type: 'DIGITAL',
  householdId: 'h',
  balance: 100,
  active: true,
  version: 0,
}));
const envelopes: EnvelopeResponse[] = ['Central de Abastos', 'Renta'].map((name, i) => ({
  id: 'e' + i,
  name,
  accountId: String(i),
  householdId: 'h',
  balance: 100,
  active: true,
  version: 0,
  type: 'SPENDING',
  category: null,
  habitualAmount: 100,
}));
const effect = (entityId: string, change: number) => ({
  entityId,
  change,
  before: 100,
  after: 100 + change,
});
const movement = (
  type: MovementResponse['type'],
  patch: Partial<MovementResponse> = {},
): MovementResponse => ({
  id: 'm',
  householdId: 'h',
  type,
  status: 'POSTED',
  amount: 50,
  description: 'Concepto',
  occurredAt: '2026-11-11T18:00:00Z',
  actor: 'u',
  periodId: 'p',
  incomeSourceId: null,
  targetEnvelopeId: null,
  reversalOf: null,
  funding: [],
  accountEffects: [],
  envelopeEffects: [],
  ...patch,
});
describe('Origen y destino visibles del movimiento', () => {
  it('muestra el recorrido de cuentas y sobres', () => {
    expect(
      movementLocation(
        movement('TRANSFER', { accountEffects: [effect('0', -50), effect('1', 50)] }),
        accounts,
        envelopes,
      ),
    ).toBe('Banco → Efectivo');
    expect(
      movementLocation(
        movement('ENVELOPE_TRANSFER', { envelopeEffects: [effect('e0', -50), effect('e1', 50)] }),
        accounts,
        envelopes,
      ),
    ).toBe('Central de Abastos (Banco) → Renta (Efectivo)');
  });
  it('usa los recursos explícitos cuando el movimiento fue corregido a cero', () => {
    expect(
      movementLocation(
        movement('TRANSFER', {
          amount: 0,
          replacement: { type: 'TRANSFER', amount: 0, fromAccountId: '1', toAccountId: '0' },
        }),
        accounts,
        envelopes,
      ),
    ).toBe('Efectivo → Banco');
  });
  it('identifica el sobre del apartado y gasto, o la cuenta del gasto libre', () => {
    expect(
      movementLocation(
        movement('ALLOCATE', { envelopeEffects: [effect('e0', 50)] }),
        accounts,
        envelopes,
      ),
    ).toBe('Central de Abastos');
    expect(
      movementLocation(movement('EXPENSE', { targetEnvelopeId: 'e0' }), accounts, envelopes),
    ).toBe('Central de Abastos');
    expect(
      movementLocation(
        movement('EXPENSE', { accountEffects: [effect('1', -50)] }),
        accounts,
        envelopes,
      ),
    ).toBe('Efectivo');
    expect(movementTitle(movement('ALLOCATE'))).toBe('Apartado');
    expect(movementTitle(movement('TRANSFER'))).toBe('Transferencia entre cuentas');
    expect(movementTitle(movement('EXPENSE', { description: 'Carne' }))).toBe('Gasto de Carne');
  });
});

describe('Conceptos de las reversiones', () => {
  it('identifica el gasto original y conserva su nombre', () => {
    expect(
      movementTitle(movement('REVERSAL'), movement('EXPENSE', { description: 'verdura' })),
    ).toBe('Reversión de Gasto de verdura');
  });
  it('identifica el sobre del apartado original', () => {
    expect(movementTitle(movement('REVERSAL'), movement('ALLOCATE'), 'Diario')).toBe(
      'Reversión de Apartado de Diario',
    );
  });
});
