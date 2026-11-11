import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { describe, it, expect } from 'vitest';
import { MovementRow } from './movement-row';
import { HouseholdStore } from '../../core/config/household-store';
import { MovementResponse } from '../../core/api/generated/models';

const original: MovementResponse = {
  id: 'expense',
  householdId: 'h',
  type: 'EXPENSE',
  status: 'REVERSED',
  amount: 50,
  description: 'verdura',
  actor: 'olda',
  occurredAt: '2026-11-11T19:21:00Z',
  periodId: 'p',
  incomeSourceId: null,
  targetEnvelopeId: null,
  reversalOf: null,
  funding: [],
  accountEffects: [],
  envelopeEffects: [],
};
const reversal: MovementResponse = {
  ...original,
  id: 'reverse',
  type: 'REVERSAL',
  status: 'POSTED',
  reversalOf: 'expense',
  description: 'Importe incorrecto',
};
describe('Identificación del original de una reversión', () => {
  for (const inPage of [true, false]) {
    it(
      inPage
        ? 'reutiliza el original de la página sin otra consulta'
        : 'consulta el original fuera de la página y separa el motivo',
      async () => {
        TestBed.configureTestingModule({
          imports: [MovementRow],
          providers: [provideHttpClient(), provideHttpClientTesting()],
        });
        TestBed.inject(HouseholdStore).householdId.set('h');
        const fixture = TestBed.createComponent(MovementRow);
        fixture.componentRef.setInput('movement', reversal);
        fixture.componentRef.setInput('related', inPage ? [reversal, original] : [reversal]);
        fixture.detectChanges();
        const http = TestBed.inject(HttpTestingController);
        if (!inPage) http.expectOne((r) => r.url.endsWith('/movements/expense')).flush(original);
        await fixture.whenStable();
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('strong').textContent).toBe(
          'Reversión de Gasto de verdura',
        );
        expect(fixture.nativeElement.querySelector('.movement-note').textContent).toContain(
          'Importe incorrecto',
        );
        expect(fixture.nativeElement.querySelector('.type-icon app-icon').textContent).toContain(
          'undo',
        );
        expect(fixture.nativeElement.querySelector('button[title="Editar movimiento"]')).toBeNull();
        http.verify();
        fixture.destroy();
        TestBed.resetTestingModule();
      },
    );
  }
});
