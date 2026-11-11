import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { FinancialCommand } from './financial-command';
import { HouseholdStore } from '../../core/config/household-store';
import { OperationSafety } from '../../core/config/operation-safety';
describe('Confirmación financiera', () => {
  afterEach(() => vi.unstubAllGlobals());
  function setup() {
    const store = { refresh: vi.fn().mockResolvedValue(undefined) };
    TestBed.configureTestingModule({
      providers: [FinancialCommand, { provide: HouseholdStore, useValue: store }],
    });
    return { c: TestBed.inject(FinancialCommand), safety: TestBed.inject(OperationSafety), store };
  }
  it('bloquea navegación, evita doble envío y libera al confirmar', async () => {
    const { c, safety, store } = setup();
    const result = new Subject<unknown>();
    const call = vi.fn(() => result);
    c.review(call);
    expect(safety.locked()).toBe(true);
    const first = c.confirm();
    void c.confirm();
    expect(call).toHaveBeenCalledTimes(1);
    result.next({});
    await first;
    expect(store.refresh).toHaveBeenCalledTimes(1);
    expect(safety.locked()).toBe(false);
  });
  it('cancela sin enviar dinero', () => {
    const { c, safety } = setup();
    const call = vi.fn(() => of({}));
    c.review(call);
    c.cancel();
    expect(call).not.toHaveBeenCalled();
    expect(safety.locked()).toBe(false);
  });
  it('conserva clave e impide cancelar confirmación incierta', async () => {
    const { c, safety } = setup();
    const call = vi
      .fn()
      .mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 503 })))
      .mockReturnValueOnce(of({}));
    c.review(call);
    await c.confirm();
    c.cancel();
    expect(safety.locked()).toBe(true);
    await c.confirm();
    expect(call.mock.calls[0][0]).toBe(call.mock.calls[1][0]);
    expect(safety.locked()).toBe(false);
  });
  it('permite revisar y confirmar por HTTP local sin randomUUID', async () => {
    const original = globalThis.crypto;
    vi.stubGlobal('crypto', { getRandomValues: original.getRandomValues.bind(original) });
    const { c, safety } = setup();
    const call = vi.fn((_key: string) => of({}));
    c.review(call);
    await c.confirm();
    expect(call.mock.calls[0][0]).toMatch(/^[0-9a-f-]{36}$/);
    expect(safety.locked()).toBe(false);
  });
});
