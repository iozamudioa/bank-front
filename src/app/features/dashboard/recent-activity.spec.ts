import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { describe, it, expect, vi } from 'vitest';
import { RecentActivity } from './recent-activity';
import { HouseholdStore } from '../../core/config/household-store';
import { OperationSafety } from '../../core/config/operation-safety';
import { ModalService } from '../../shared/dialogs/modal.service';
import { MovementResponse } from '../../core/api/generated/models';
describe('Edición desde actividad reciente', () => {
  it('abre el mismo modal con lápiz incluso para importe cero, excluye no corregibles y respeta bloqueos', async () => {
    TestBed.configureTestingModule({
      imports: [RecentActivity],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    const store = TestBed.inject(HouseholdStore);
    store.householdId.set('h');
    const reverse = vi.spyOn(TestBed.inject(ModalService), 'reverseMovement').mockResolvedValue();
    const edit = vi.spyOn(TestBed.inject(ModalService), 'editMovement').mockResolvedValue();
    const fixture = TestBed.createComponent(RecentActivity);
    fixture.detectChanges();
    const original: MovementResponse = {
      id: 'm',
      householdId: 'h',
      type: 'INCOME',
      status: 'POSTED',
      amount: 0,
      description: 'Ingreso corregido',
      actor: 'u',
      occurredAt: '2026-11-11T18:00:00Z',
      periodId: 'p',
      targetEnvelopeId: null,
      incomeSourceId: null,
      reversalOf: null,
      funding: [],
      accountEffects: [],
      envelopeEffects: [],
    };
    const http = TestBed.inject(HttpTestingController);
    http
      .expectOne((r) => r.url.endsWith('/movements'))
      .flush([
        original,
        { ...original, id: 'opening', type: 'OPENING_BALANCE' },
        { ...original, id: 'reverse', type: 'REVERSAL' },
        { ...original, id: 'reversed', status: 'REVERSED' },
      ]);
    await fixture.whenStable();
    fixture.detectChanges();
    const buttons = fixture.nativeElement.querySelectorAll(
      'button[title="Editar movimiento"]',
    ) as NodeListOf<HTMLButtonElement>;
    expect(buttons.length).toBe(1);
    expect(buttons[0].querySelector('app-icon')?.textContent).toContain('edit');
    buttons[0].click();
    expect(edit).toHaveBeenCalledWith('m');
    expect(fixture.nativeElement.querySelector('details')).toBeNull();
    fixture.nativeElement.querySelector('button[title="Revertir movimiento"]').click();
    expect(reverse).toHaveBeenCalledWith('m');
    TestBed.inject(OperationSafety).locked.set(true);
    fixture.detectChanges();
    expect(buttons[0].disabled).toBe(true);
    buttons[0].click();
    expect(edit).toHaveBeenCalledTimes(1);
    http.verify();
    TestBed.resetTestingModule();
  });
});
