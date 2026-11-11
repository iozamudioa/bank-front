import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { beforeEach, afterEach, describe, it, expect } from 'vitest';
import { ReallocationForm } from './reallocation-form';
import { HouseholdStore } from '../../core/config/household-store';
describe('Saldos al mover entre sobres', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ReallocationForm],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const s = TestBed.inject(HouseholdStore);
    s.envelopes.set([
      {
        id: 'taekwondo',
        accountId: 'cash',
        active: true,
        balance: 850.25,
        category: null,
        habitualAmount: null,
        householdId: 'h',
        name: 'Taekwondo',
        type: 'SPENDING',
        version: 0,
      },
      {
        id: 'dogo',
        accountId: 'cash',
        active: true,
        balance: 0,
        category: null,
        habitualAmount: null,
        householdId: 'h',
        name: 'dogo',
        type: 'SPENDING',
        version: 0,
      },
    ]);
  });
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  function setup() {
    const fixture = TestBed.createComponent(ReallocationForm);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    return { fixture, element, component: fixture.componentInstance };
  }
  it('incluye el saldo confirmado de cada sobre en ambos selectores y en la selección', () => {
    const { fixture, element, component } = setup();
    for (const select of element.querySelectorAll('select')) {
      expect(select.options[1].textContent).toContain('850.25');
      expect(select.options[2].textContent).toContain('0.00');
    }
    component.form.patchValue({ fromEnvelopeId: 'taekwondo', toEnvelopeId: 'dogo' });
    fixture.detectChanges();
    expect(element.querySelector('#source-envelope-balance')?.textContent).toContain('850.25');
    expect(element.querySelector('#destination-envelope-balance')?.textContent).toContain('0.00');
  });
  it('recupera el saldo de la nueva selección y refleja cambios confirmados sin calcular saldos locales', () => {
    const { fixture, element, component } = setup();
    component.form.patchValue({ fromEnvelopeId: 'taekwondo', toEnvelopeId: 'dogo' });
    fixture.detectChanges();
    TestBed.inject(HouseholdStore).envelopes.update((items) =>
      items.map((e) => ({ ...e, balance: e.id === 'taekwondo' ? 750.25 : 100 })),
    );
    fixture.detectChanges();
    expect(element.querySelector('#source-envelope-balance')?.textContent).toContain('750.25');
    expect(element.querySelector('#destination-envelope-balance')?.textContent).toContain('100.00');
    component.form.controls.fromEnvelopeId.setValue('dogo');
    fixture.detectChanges();
    expect(element.querySelector('#source-envelope-balance')?.textContent).toContain('100.00');
  });
  it('no presenta un saldo cero ficticio si faltan datos y oculta los importes offline', () => {
    const { fixture, element, component } = setup();
    component.form.patchValue({ fromEnvelopeId: 'taekwondo', toEnvelopeId: 'dogo' });
    fixture.detectChanges();
    component.c.connection.online.set(false);
    fixture.detectChanges();
    expect(element.querySelector('#source-envelope-balance')?.textContent).toContain('Conéctate');
    expect(element.querySelector('#source-envelope-balance strong')).toBeNull();
    expect(element.querySelector('option[value="taekwondo"]')?.textContent).not.toContain('850.25');
    component.c.connection.online.set(true);
    TestBed.inject(HouseholdStore).envelopes.set([]);
    fixture.detectChanges();
    expect(element.querySelector('#destination-envelope-balance strong')).toBeNull();
    expect(element.querySelector('#destination-envelope-balance')?.textContent).toContain(
      'Saldo no disponible',
    );
  });
});
