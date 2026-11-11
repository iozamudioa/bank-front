import Decimal from 'decimal.js';
import {
  AccountResponse,
  DashboardViewResponse,
  EnvelopeResponse,
} from '../../core/api/generated/models';
import { validAmount } from '../../shared/utils/money';
import { MovementAction } from './models/movement-action';

export interface ProjectedBalance {
  key: string;
  name: string;
  scope: string;
  before: number | null;
  change: number;
  after: number | null;
}
export interface ProjectionBalances {
  accounts: readonly AccountResponse[];
  envelopes: readonly EnvelopeResponse[];
  dashboard: DashboardViewResponse | null;
}
/** Display-only estimate. Never updates confirmed balances or replaces API validation. */
export function projectMovement(
  action: MovementAction,
  values: Record<string, string>,
  balances: ProjectionBalances,
): ProjectedBalance[] {
  if (!validAmount(values['amount'] || '')) return [];
  const amount = new Decimal(values['amount']);
  const rows: ProjectedBalance[] = [];
  const add = (
    key: string,
    name: string,
    scope: string,
    before: number | null | undefined,
    change: Decimal,
  ) => {
    const known = typeof before === 'number' && Number.isFinite(before) ? before : null;
    rows.push({
      key,
      name,
      scope,
      before: known,
      change: change.toNumber(),
      after: known === null ? null : new Decimal(known).plus(change).toNumber(),
    });
  };
  const account = (id: string, change: Decimal) => {
    const a = balances.accounts.find((a) => a.id === id);
    add('account-' + id, a?.name || 'Cuenta seleccionada', 'Total en cuenta', a?.balance, change);
  };
  const envelope = (id: string, change: Decimal) => {
    const e = balances.envelopes.find((e) => e.id === id);
    add('envelope-' + id, e?.name || 'Sobre seleccionado', 'Total en sobre', e?.balance, change);
    return e;
  };
  switch (action) {
    case 'income':
    case 'opening':
      account(values['accountId'], amount);
      break;
    case 'transfer':
      account(values['fromAccountId'], amount.negated());
      account(values['toAccountId'], amount);
      break;
    case 'reallocate':
    case 'envelopeTransfer': {
      const from = envelope(values['fromEnvelopeId'], amount.negated());
      const to = envelope(values['toEnvelopeId'], amount);
      if (action === 'envelopeTransfer' && from && to && from.accountId !== to.accountId) {
        account(from.accountId, amount.negated());
        account(to.accountId, amount);
      }
      break;
    }
    case 'allocate':
    case 'release': {
      const reserveChange = action === 'allocate' ? amount : amount.negated();
      const e = envelope(values['envelopeId'], reserveChange);
      const a = balances.dashboard?.accounts.find((a) => a.id === e?.accountId);
      const name =
        a?.name || balances.accounts.find((a) => a.id === e?.accountId)?.name || 'Cuenta del sobre';
      add(
        'free-' + (e?.accountId || ''),
        name,
        'Dinero libre en cuenta',
        a?.free,
        reserveChange.negated(),
      );
      break;
    }
  }
  return rows;
}
