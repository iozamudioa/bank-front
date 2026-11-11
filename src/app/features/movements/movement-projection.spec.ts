import { describe, expect, it } from 'vitest';
import { projectMovement, ProjectionBalances } from './movement-projection';
import { AccountResponse, EnvelopeResponse } from '../../core/api/generated/models';
const account = (id: string, name: string, balance: number): AccountResponse => ({
  id,
  name,
  balance,
  householdId: 'h',
  active: true,
  type: 'DIGITAL',
  version: 0,
});
const envelope = (
  id: string,
  name: string,
  balance: number,
  accountId = 'a',
): EnvelopeResponse => ({
  id,
  name,
  balance,
  accountId,
  householdId: 'h',
  active: true,
  type: 'SPENDING',
  category: null,
  habitualAmount: null,
  version: 0,
});
const balances: ProjectionBalances = {
  accounts: [account('a', 'Banco', 4000), account('b', 'Efectivo', 2000)],
  envelopes: [
    envelope('nancy', 'Nancy', 1517),
    envelope('telcel', 'Telcel', 1209),
    envelope('other', 'Otro banco', 500, 'b'),
  ],
  dashboard: {
    total: 6000,
    reserved: 3226,
    free: 2774,
    accounts: [
      { id: 'a', name: 'Banco', type: 'DIGITAL', total: 4000, reserved: 2726, free: 1274 },
      { id: 'b', name: 'Efectivo', type: 'PHYSICAL', total: 2000, reserved: 500, free: 1500 },
    ],
  },
};
describe('Resultado estimado de los siete movimientos', () => {
  it('muestra Nancy −100 total 1417 y Telcel +100 total 1309, sin mover el total de cuenta', () => {
    const rows = projectMovement(
      'reallocate',
      { fromEnvelopeId: 'nancy', toEnvelopeId: 'telcel', amount: '100' },
      balances,
    );
    expect(rows.map((r) => [r.name, r.before, r.change, r.after])).toEqual([
      ['Nancy', 1517, -100, 1417],
      ['Telcel', 1209, 100, 1309],
    ]);
  });
  it.each(['income', 'opening'] as const)('%s suma solo al saldo real de la cuenta', (action) => {
    expect(
      projectMovement(action, { accountId: 'a', amount: '100' }, balances).map((r) => [
        r.change,
        r.after,
      ]),
    ).toEqual([[100, 4100]]);
  });
  it('transferir entre cuentas descuenta y abona sus saldos reales', () => {
    expect(
      projectMovement(
        'transfer',
        { fromAccountId: 'a', toAccountId: 'b', amount: '100' },
        balances,
      ).map((r) => [r.change, r.after]),
    ).toEqual([
      [-100, 3900],
      [100, 2100],
    ]);
  });
  it('transferir sobres entre cuentas mueve tanto reservas como dinero real', () => {
    expect(
      projectMovement(
        'envelopeTransfer',
        { fromEnvelopeId: 'nancy', toEnvelopeId: 'other', amount: '100' },
        balances,
      ).map((r) => [r.scope, r.change, r.after]),
    ).toEqual([
      ['Total en sobre', -100, 1417],
      ['Total en sobre', 100, 600],
      ['Total en cuenta', -100, 3900],
      ['Total en cuenta', 100, 2100],
    ]);
  });
  it('apartar aumenta el sobre y descuenta solo el dinero libre, sin descontar del total de cuenta', () => {
    const rows = projectMovement('allocate', { envelopeId: 'nancy', amount: '100' }, balances);
    expect(rows.map((r) => [r.scope, r.change, r.after])).toEqual([
      ['Total en sobre', 100, 1617],
      ['Dinero libre en cuenta', -100, 1174],
    ]);
    expect(balances.accounts[0].balance).toBe(4000);
  });
  it('liberar reserva reduce el sobre y devuelve dinero libre', () => {
    expect(
      projectMovement('release', { envelopeId: 'nancy', amount: '100' }, balances).map((r) => [
        r.change,
        r.after,
      ]),
    ).toEqual([
      [-100, 1417],
      [100, 1374],
    ]);
  });
  it('conserva centavos sin error de coma flotante y no modifica los datos originales', () => {
    const data = { ...balances, envelopes: [envelope('e', 'Centavos', 0.2)] };
    expect(projectMovement('allocate', { envelopeId: 'e', amount: '0.10' }, data)[0].after).toBe(
      0.3,
    );
    expect(data.envelopes[0].balance).toBe(0.2);
  });
  it('no inventa saldos cero ni redondea importes inválidos', () => {
    expect(
      projectMovement('income', { accountId: 'missing', amount: '100' }, balances)[0].after,
    ).toBeNull();
    expect(
      projectMovement(
        'allocate',
        { envelopeId: 'nancy', amount: '100' },
        { ...balances, dashboard: null },
      )[1].after,
    ).toBeNull();
    expect(projectMovement('income', { accountId: 'a', amount: '0.001' }, balances)).toEqual([]);
  });
});
