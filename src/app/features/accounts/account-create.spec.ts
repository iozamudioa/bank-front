import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { describe, it, expect, vi } from 'vitest';
import { AccountCreate } from './account-create';
import { HouseholdStore } from '../../core/config/household-store';
import { ModalState } from '../../shared/dialogs/modal-state';
describe('Crear cuenta en modal', () => {
  it('guarda una vez, actualiza saldos y cierra al completar', async () => {
    TestBed.configureTestingModule({
      imports: [AccountCreate],
      providers: [provideHttpClient(), provideHttpClientTesting(), ModalState],
    });
    const store = TestBed.inject(HouseholdStore);
    store.householdId.set('h');
    vi.spyOn(store, 'refresh').mockResolvedValue();
    const modal = TestBed.inject(ModalState);
    modal.requestClose = vi.fn();
    const f = TestBed.createComponent(AccountCreate).componentInstance;
    f.form.patchValue({ name: 'Efectivo', type: 'PHYSICAL' });
    const pending = f.create();
    void f.create();
    expect(modal.busy()).toBe(true);
    const http = TestBed.inject(HttpTestingController),
      req = http.expectOne('/api/v1/households/h/accounts');
    expect(req.request.body).toEqual({ name: 'Efectivo', type: 'PHYSICAL' });
    req.flush({});
    await pending;
    expect(store.refresh).toHaveBeenCalledTimes(1);
    expect(modal.requestClose).toHaveBeenCalledTimes(1);
    expect(modal.busy()).toBe(false);
    http.verify();
  });
});
