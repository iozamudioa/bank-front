import Decimal from 'decimal.js';
import {
  BalanceEffectResponse,
  MovementReplacementRequest,
  MovementResponse,
  FundingRequest,
} from '../../core/api/generated/models';
import { validAmount } from '../../shared/utils/money';

export type CorrectionKind = MovementReplacementRequest['type'];
export const CORRECTION_LABELS: Record<CorrectionKind, string> = {
  INCOME: 'Registrar ingreso',
  ALLOCATE: 'Apartar dinero',
  RELEASE: 'Liberar reserva',
  REALLOCATE: 'Mover entre sobres',
  TRANSFER: 'Transferir entre cuentas',
  ENVELOPE_TRANSFER: 'Transferir sobres entre cuentas',
  EXPENSE: 'Gasto desde sobre',
  ACCOUNT_EXPENSE: 'Gasto desde saldo libre',
};
export class CorrectionDataError extends Error {}
export function canCorrect(movement: MovementResponse) {
  return (
    movement.status === 'POSTED' &&
    movement.type !== 'OPENING_BALANCE' &&
    movement.type !== 'REVERSAL'
  );
}
function effectId(effects: BalanceEffectResponse[], positive: boolean) {
  const matching = effects.filter((effect) => (positive ? effect.change > 0 : effect.change < 0));
  if (matching.length !== 1)
    throw new CorrectionDataError(
      'No se pudo identificar el origen o destino del movimiento. Vuelve a consultar su detalle.',
    );
  return matching[0].entityId;
}
export function originalReplacement(movement: MovementResponse): MovementReplacementRequest {
  if (!canCorrect(movement)) throw new CorrectionDataError('Este movimiento ya no admite edición.');
  if (movement.replacement) {
    const saved = movement.replacement;
    if (
      saved.type !== movement.type &&
      !(movement.type === 'EXPENSE' && saved.type === 'ACCOUNT_EXPENSE')
    )
      throw new CorrectionDataError(
        'El reemplazo confirmado no coincide con el tipo del movimiento.',
      );
    if (!new Decimal(saved.amount).eq(movement.amount))
      throw new CorrectionDataError(
        'El reemplazo confirmado no coincide con el importe del movimiento.',
      );
    const fields = Object.fromEntries(
      Object.entries(saved)
        .filter(([key]) => key !== 'type' && key !== 'fundingSources')
        .map(([key, value]) => [key, value == null ? '' : String(value)]),
    );
    return buildReplacement(
      saved.type,
      fields,
      saved.fundingSources?.filter((source) => source != null) ?? [],
    );
  }
  const common = { amount: movement.amount, description: movement.description ?? '' };
  switch (movement.type) {
    case 'INCOME':
      return {
        ...common,
        type: 'INCOME',
        accountId: effectId(movement.accountEffects, true),
        ...(movement.incomeSourceId ? { incomeSourceId: movement.incomeSourceId } : {}),
      };
    case 'ALLOCATE':
      return { ...common, type: 'ALLOCATE', envelopeId: effectId(movement.envelopeEffects, true) };
    case 'RELEASE':
      return { ...common, type: 'RELEASE', envelopeId: effectId(movement.envelopeEffects, false) };
    case 'REALLOCATE':
    case 'ENVELOPE_TRANSFER':
      return {
        ...common,
        type: movement.type,
        fromEnvelopeId: effectId(movement.envelopeEffects, false),
        toEnvelopeId: effectId(movement.envelopeEffects, true),
      };
    case 'TRANSFER':
      return {
        ...common,
        type: 'TRANSFER',
        fromAccountId: effectId(movement.accountEffects, false),
        toAccountId: effectId(movement.accountEffects, true),
      };
    case 'EXPENSE':
      if (!movement.targetEnvelopeId)
        return {
          ...common,
          type: 'ACCOUNT_EXPENSE',
          accountId: effectId(movement.accountEffects, false),
        };
      if (!movement.funding.length) {
        const debits = movement.envelopeEffects.filter((effect) => effect.change < 0);
        if (
          debits.length !== 1 ||
          debits[0].entityId !== movement.targetEnvelopeId ||
          !new Decimal(debits[0].change).negated().eq(movement.amount)
        )
          throw new CorrectionDataError(
            'No se pudo recuperar la financiación completa de este gasto.',
          );
      }
      return {
        ...common,
        type: 'EXPENSE',
        targetEnvelopeId: movement.targetEnvelopeId,
        fundingSources: movement.funding.length
          ? movement.funding.map((source) => ({ ...source }))
          : undefined,
      };
    default:
      throw new CorrectionDataError('Este tipo de movimiento no admite edición.');
  }
}
export function replacementFields(
  replacement: MovementReplacementRequest | NonNullable<MovementResponse['replacement']>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(replacement)
      .filter(([key]) => key !== 'type' && key !== 'fundingSources')
      .map(([key, value]) => [
        key,
        key === 'amount' ? new Decimal(value as number).toFixed(2) : String(value ?? ''),
      ]),
  );
}
export function buildReplacement(
  kind: CorrectionKind,
  fields: Record<string, string>,
  funding: NonNullable<FundingRequest>[] = [],
): MovementReplacementRequest {
  if (!validAmount(fields['amount'] ?? '', true))
    throw new CorrectionDataError('Ingresa un importe no negativo con máximo dos decimales.');
  const common = { amount: Number(fields['amount']), description: fields['description'] ?? '' };
  const required = (name: string) => {
    const value = fields[name];
    if (!value) throw new CorrectionDataError('Selecciona los recursos de origen y destino.');
    return value;
  };
  const pair = (from: string, to: string) => {
    const a = required(from),
      b = required(to);
    if (a === b) throw new CorrectionDataError('Selecciona un origen y destino diferentes.');
    return [a, b];
  };
  switch (kind) {
    case 'INCOME':
      return {
        ...common,
        type: kind,
        accountId: required('accountId'),
        ...(fields['incomeSourceId'] ? { incomeSourceId: fields['incomeSourceId'] } : {}),
      };
    case 'ALLOCATE':
    case 'RELEASE':
      return { ...common, type: kind, envelopeId: required('envelopeId') };
    case 'TRANSFER': {
      const [fromAccountId, toAccountId] = pair('fromAccountId', 'toAccountId');
      return { ...common, type: kind, fromAccountId, toAccountId };
    }
    case 'REALLOCATE':
    case 'ENVELOPE_TRANSFER': {
      const [fromEnvelopeId, toEnvelopeId] = pair('fromEnvelopeId', 'toEnvelopeId');
      return { ...common, type: kind, fromEnvelopeId, toEnvelopeId };
    }
    case 'ACCOUNT_EXPENSE':
      return { ...common, type: kind, accountId: required('accountId') };
    case 'EXPENSE': {
      const targetEnvelopeId = required('targetEnvelopeId');
      if (common.amount === 0) {
        if (funding.length)
          throw new CorrectionDataError('Un gasto corregido a cero requiere aportaciones vacias.');
        return { ...common, type: kind, targetEnvelopeId, fundingSources: [] };
      }
      const seen = new Set<string>();
      for (const source of funding) {
        if (
          !source.envelopeId ||
          seen.has(source.envelopeId) ||
          !validAmount(String(source.amount))
        )
          throw new CorrectionDataError(
            'Revisa las aportaciones: usa sobres únicos e importes positivos.',
          );
        seen.add(source.envelopeId);
      }
      if (
        !funding.length ||
        !funding.reduce((sum, source) => sum.plus(source.amount), new Decimal(0)).eq(common.amount)
      )
        throw new CorrectionDataError(
          'Las aportaciones deben cubrir exactamente el importe del gasto.',
        );
      return {
        ...common,
        type: kind,
        targetEnvelopeId,
        fundingSources: funding.map((source) => ({ ...source })),
      };
    }
  }
}
