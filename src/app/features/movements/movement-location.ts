import {
  AccountResponse,
  EnvelopeResponse,
  MovementResponse,
} from '../../core/api/generated/models';
export function movementLocation(
  m: MovementResponse,
  accounts: readonly AccountResponse[],
  envelopes: readonly EnvelopeResponse[],
): string {
  const r = m.replacement;
  const account = (id?: string | null) => accounts.find((a) => a.id === id)?.name ?? 'Cuenta';
  const envelope = (id?: string | null, withAccount = false) => {
    const e = envelopes.find((e) => e.id === id);
    return e ? e.name + (withAccount ? ' (' + account(e.accountId) + ')' : '') : 'Sobre';
  };
  const signed = (effects: MovementResponse['accountEffects'], positive: boolean) =>
    effects.find((e) => (positive ? e.change > 0 : e.change < 0))?.entityId ??
    (effects.length === 1 ? effects[0].entityId : undefined);
  const fromAccount = r?.fromAccountId ?? signed(m.accountEffects, false),
    toAccount = r?.toAccountId ?? signed(m.accountEffects, true);
  const fromEnvelope = r?.fromEnvelopeId ?? signed(m.envelopeEffects, false),
    toEnvelope = r?.toEnvelopeId ?? signed(m.envelopeEffects, true);
  switch (m.type) {
    case 'TRANSFER':
      return account(fromAccount) + ' → ' + account(toAccount);
    case 'REALLOCATE':
      return envelope(fromEnvelope) + ' → ' + envelope(toEnvelope);
    case 'ENVELOPE_TRANSFER':
      return envelope(fromEnvelope, true) + ' → ' + envelope(toEnvelope, true);
    case 'ALLOCATE':
      return envelope(r?.envelopeId ?? toEnvelope);
    case 'RELEASE':
      return envelope(r?.envelopeId ?? fromEnvelope);
    case 'EXPENSE':
      return (r?.targetEnvelopeId ?? m.targetEnvelopeId)
        ? envelope(r?.targetEnvelopeId ?? m.targetEnvelopeId)
        : account(r?.accountId ?? fromAccount);
    case 'INCOME':
    case 'OPENING_BALANCE':
      return account(r?.accountId ?? toAccount);
    case 'REVERSAL':
      if (m.targetEnvelopeId) return envelope(m.targetEnvelopeId);
      if (m.accountEffects.some((e) => e.change < 0) && m.accountEffects.some((e) => e.change > 0))
        return account(fromAccount) + ' → ' + account(toAccount);
      if (
        m.envelopeEffects.some((e) => e.change < 0) &&
        m.envelopeEffects.some((e) => e.change > 0)
      )
        return envelope(fromEnvelope) + ' → ' + envelope(toEnvelope);
      if (m.envelopeEffects.some((e) => e.change !== 0))
        return envelope(
          signed(
            m.envelopeEffects,
            m.envelopeEffects.some((e) => e.change > 0),
          ),
        );
      return account(m.accountEffects[0]?.entityId);
    default:
      return '';
  }
}
export function movementTitle(
  m: MovementResponse,
  original?: MovementResponse | null,
  destination = '',
): string {
  const labels: Record<string, string> = {
    INCOME: 'Ingreso',
    EXPENSE: 'Gasto',
    ALLOCATE: 'Apartado',
    RELEASE: 'Liberación',
    TRANSFER: 'Transferencia entre cuentas',
    REALLOCATE: 'Movimiento entre sobres',
    ENVELOPE_TRANSFER: 'Transferencia entre sobres',
    OPENING_BALANCE: 'Saldo inicial',
    REVERSAL: 'Reversión',
  };
  if (m.type === 'REVERSAL')
    return original ? 'Reversión de ' + movementTitle(original, null, destination) : 'Reversión';
  if (m.type === 'EXPENSE')
    return m.description?.trim() ? 'Gasto de ' + m.description.trim() : 'Gasto';
  if (m.type === 'ALLOCATE' && destination) return 'Apartado de ' + destination;
  return labels[m.type] ?? m.type;
}
