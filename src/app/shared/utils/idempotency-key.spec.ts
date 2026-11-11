import { afterEach, describe, expect, it, vi } from 'vitest';
import { createIdempotencyKey } from './idempotency-key';
afterEach(() => vi.unstubAllGlobals());
describe('Claves de operación en HTTP y HTTPS', () => {
  it('usa randomUUID si está disponible', () => {
    const randomUUID = vi.fn(() => '19d7c3e5-0496-486f-97a5-42c6913905dd');
    vi.stubGlobal('crypto', { randomUUID });
    expect(createIdempotencyKey()).toBe('19d7c3e5-0496-486f-97a5-42c6913905dd');
    expect(randomUUID).toHaveBeenCalledTimes(1);
  });
  it('genera UUID v4 criptográfico sin randomUUID, como al entrar desde el móvil por IP HTTP', () => {
    const original = globalThis.crypto;
    const getRandomValues = vi.fn(original.getRandomValues.bind(original));
    vi.stubGlobal('crypto', { getRandomValues });
    const ids = Array.from({ length: 100 }, () => createIdempotencyKey());
    expect(
      ids.every((id) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id),
      ),
    ).toBe(true);
    expect(new Set(ids).size).toBe(100);
    expect(getRandomValues).toHaveBeenCalledTimes(100);
  });
});
