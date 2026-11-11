import Decimal from 'decimal.js';
import { MovementResponse } from '../../core/api/generated/models';
export type MovementDirection = 'credit' | 'debit' | 'transfer' | 'neutral';
export function movementDirection(
  movement: Pick<MovementResponse, 'type' | 'accountEffects' | 'envelopeEffects'>,
): MovementDirection {
  switch (movement.type) {
    case 'INCOME':
    case 'OPENING_BALANCE':
    case 'ALLOCATE':
      return 'credit';
    case 'EXPENSE':
    case 'RELEASE':
      return 'debit';
    case 'TRANSFER':
    case 'ENVELOPE_TRANSFER':
    case 'REALLOCATE':
      return 'transfer';
    case 'REVERSAL': {
      const accounts = movement.accountEffects.reduce(
        (sum, effect) => sum.plus(effect.change),
        new Decimal(0),
      );
      if (!accounts.isZero()) return accounts.isPositive() ? 'credit' : 'debit';
      const envelopes = movement.envelopeEffects.reduce(
        (sum, effect) => sum.plus(effect.change),
        new Decimal(0),
      );
      if (!envelopes.isZero()) return envelopes.isPositive() ? 'credit' : 'debit';
      return [...movement.accountEffects, ...movement.envelopeEffects].some(
        (effect) => effect.change !== 0,
      )
        ? 'transfer'
        : 'neutral';
    }
    default:
      return 'neutral';
  }
}
