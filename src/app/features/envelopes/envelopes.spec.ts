import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import { Envelopes } from './envelopes';
import { HouseholdStore } from '../../core/config/household-store';
import { ModalService } from '../../shared/dialogs/modal.service';
describe('Tarjetas de sobres', () => {
  it('abre el gasto con el sobre seleccionado al tocar la tarjeta y conserva Historial como enlace independiente', () => {
    TestBed.configureTestingModule({
      imports: [Envelopes],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    const store = TestBed.inject(HouseholdStore);
    store.envelopes.set([
      {
        id: 'telcel',
        name: 'Telcel',
        balance: 1309,
        accountId: 'a',
        householdId: 'h',
        active: true,
        category: null,
        habitualAmount: null,
        type: 'SPENDING',
        version: 0,
      },
    ]);
    const expense = vi.spyOn(TestBed.inject(ModalService), 'expense').mockResolvedValue();
    const fixture = TestBed.createComponent(Envelopes);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const card = element.querySelector<HTMLButtonElement>('.envelope-open')!;
    expect(card.getAttribute('aria-label')).toContain('Telcel');
    expect(card.textContent).toContain('Telcel');
    card.click();
    expect(expense).toHaveBeenCalledWith('telcel');
    expect(element.querySelector('.actions button')?.textContent).toContain('Plan habitual');
    const history = element.querySelector<HTMLAnchorElement>('.history-link')!;
    expect(history.closest('button')).toBeNull();
    expect(history.getAttribute('href')).toContain('envelopeId=telcel');
    fixture.componentInstance.safety.modalOpen.set(true);
    fixture.detectChanges();
    expect(card.disabled).toBe(true);
  });
});
