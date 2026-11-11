import { describe, expect, it } from 'vitest';
import { BalanceEffectResponse, MovementResponse } from '../../core/api/generated/models';
import {
  buildReplacement,
  canCorrect,
  CorrectionKind,
  originalReplacement,
} from './movement-correction';
export const effect = (entityId: string, change: number): BalanceEffectResponse => ({
  entityId,
  change,
  before: 1000,
  after: 1000 + change,
});
export const movement = (
  type: MovementResponse['type'],
  patch: Partial<MovementResponse> = {},
): MovementResponse => ({
  id: 'm',
  householdId: 'h',
  type,
  status: 'POSTED',
  amount: 100,
  description: 'Original',
  actor: 'u',
  occurredAt: '2026-11-01T18:00:00Z',
  periodId: 'closed',
  incomeSourceId: null,
  targetEnvelopeId: null,
  reversalOf: null,
  funding: [],
  accountEffects: [],
  envelopeEffects: [],
  ...patch,
});
const cases: [CorrectionKind, MovementResponse, Record<string, unknown>][] = [
  [
    'INCOME',
    movement('INCOME', { accountEffects: [effect('a', 100)], incomeSourceId: 'payroll' }),
    { accountId: 'a', incomeSourceId: 'payroll' },
  ],
  [
    'ALLOCATE',
    movement('ALLOCATE', { accountEffects: [effect('a', 0)], envelopeEffects: [effect('e', 100)] }),
    { envelopeId: 'e' },
  ],
  [
    'RELEASE',
    movement('RELEASE', { accountEffects: [effect('a', 0)], envelopeEffects: [effect('e', -100)] }),
    { envelopeId: 'e' },
  ],
  [
    'REALLOCATE',
    movement('REALLOCATE', { envelopeEffects: [effect('from', -100), effect('to', 100)] }),
    { fromEnvelopeId: 'from', toEnvelopeId: 'to' },
  ],
  [
    'TRANSFER',
    movement('TRANSFER', { accountEffects: [effect('from', -100), effect('to', 100)] }),
    { fromAccountId: 'from', toAccountId: 'to' },
  ],
  [
    'ENVELOPE_TRANSFER',
    movement('ENVELOPE_TRANSFER', { envelopeEffects: [effect('from', -100), effect('to', 100)] }),
    { fromEnvelopeId: 'from', toEnvelopeId: 'to' },
  ],
  [
    'EXPENSE',
    movement('EXPENSE', {
      targetEnvelopeId: 'e',
      funding: [
        { envelopeId: 'e', amount: 40 },
        { envelopeId: 'donor', amount: 60 },
      ],
    }),
    {
      targetEnvelopeId: 'e',
      fundingSources: [
        { envelopeId: 'e', amount: 40 },
        { envelopeId: 'donor', amount: 60 },
      ],
    },
  ],
  [
    'ACCOUNT_EXPENSE',
    movement('EXPENSE', { accountEffects: [effect('a', -100)] }),
    { accountId: 'a' },
  ],
];
describe('Datos de la corrección atómica', () => {
  it.each(cases)(
    'recupera %s a partir de sus efectos auditados y conserva todos los campos',
    (kind, original, fields) => {
      expect(originalReplacement(original)).toEqual({
        type: kind,
        amount: 100,
        description: 'Original',
        ...fields,
      });
    },
  );
  it('no permite saldo inicial, reversiones ni movimientos revertidos', () => {
    for (const original of [
      movement('OPENING_BALANCE'),
      movement('REVERSAL'),
      movement('INCOME', { status: 'REVERSED' }),
    ]) {
      expect(canCorrect(original)).toBe(false);
      expect(() => originalReplacement(original)).toThrow();
    }
  });
  it('no deduce el importe desde saldos virtuales de un reemplazo anterior', () => {
    const original = movement('INCOME', {
      amount: 200,
      accountEffects: [{ entityId: 'a', before: -100, change: 200, after: 100 }],
    });
    expect(originalReplacement(original)).toMatchObject({
      type: 'INCOME',
      accountId: 'a',
      amount: 200,
    });
  });
  it('permite quitar explícitamente la fuente de un ingreso y cambiar el origen de un gasto', () => {
    expect(
      buildReplacement('INCOME', {
        accountId: 'a',
        amount: '1200.50',
        incomeSourceId: '',
        description: 'Nuevo',
      }),
    ).toEqual({ type: 'INCOME', accountId: 'a', amount: 1200.5, description: 'Nuevo' });
    expect(buildReplacement('ACCOUNT_EXPENSE', { accountId: 'a', amount: '150' })).toEqual({
      type: 'ACCOUNT_EXPENSE',
      accountId: 'a',
      amount: 150,
      description: '',
    });
  });
  it('exige aportaciones completas, únicas y positivas y no elimina donantes implícitamente', () => {
    const fields = { targetEnvelopeId: 'e', amount: '100' };
    expect(() => buildReplacement('EXPENSE', fields, [{ envelopeId: 'e', amount: 40 }])).toThrow(
      'exactamente',
    );
    expect(() =>
      buildReplacement('EXPENSE', fields, [
        { envelopeId: 'e', amount: 50 },
        { envelopeId: 'e', amount: 50 },
      ]),
    ).toThrow('únicos');
    expect(() =>
      buildReplacement('EXPENSE', fields, [
        { envelopeId: 'e', amount: 0 },
        { envelopeId: 'other', amount: 100 },
      ]),
    ).toThrow();
    expect(
      buildReplacement('EXPENSE', fields, [
        { envelopeId: 'e', amount: 40 },
        { envelopeId: 'other', amount: 60 },
      ]),
    ).toMatchObject({
      fundingSources: [
        { envelopeId: 'e', amount: 40 },
        { envelopeId: 'other', amount: 60 },
      ],
    });
  });
  it('rechaza importes inválidos y transferencias con el mismo origen/destino antes de consultar', () => {
    for (const amount of ['0.001', '-10', '1,000', '10000000000000'])
      expect(() => buildReplacement('ALLOCATE', { envelopeId: 'e', amount })).toThrow();
    expect(() =>
      buildReplacement('TRANSFER', { fromAccountId: 'a', toAccountId: 'a', amount: '100' }),
    ).toThrow('diferentes');
  });
  it.each(cases)(
    'permite cero en %s y recupera los recursos explicitos sin efectos con signo',
    (kind, original, fields) => {
      const values = Object.fromEntries(
        Object.entries(fields)
          .filter(([key]) => key !== 'fundingSources')
          .map(([key, value]) => [key, String(value)]),
      );
      const zero = buildReplacement(kind, { ...values, amount: '0.00', description: 'Cero' }, []);
      const saved = movement(original.type, {
        amount: 0,
        description: 'Cero',
        accountEffects: [],
        envelopeEffects: [],
        funding: [],
        replacement: zero as NonNullable<MovementResponse['replacement']>,
      });
      expect(originalReplacement(saved)).toEqual(zero);
    },
  );
  it('el gasto cero rechaza aportaciones positivas y filas por cero', () => {
    const fields = { amount: '0.00', targetEnvelopeId: 'e' };
    expect(buildReplacement('EXPENSE', fields)).toMatchObject({ amount: 0, fundingSources: [] });
    for (const amount of [0, 1])
      expect(() => buildReplacement('EXPENSE', fields, [{ envelopeId: 'e', amount }])).toThrow();
  });
});
