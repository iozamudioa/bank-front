import { TestBed } from '@angular/core/testing';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { Appearance } from './appearance';
import { Theme } from '../../../core/theme/theme';
import { HouseholdStore } from '../../../core/config/household-store';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
describe('Selector de apariencia', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('matchMedia', () => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    TestBed.configureTestingModule({
      imports: [Appearance],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
  });
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    vi.unstubAllGlobals();
  });
  it('muestra cuatro paletas y solo los modos claro y oscuro', () => {
    const f = TestBed.createComponent(Appearance);
    f.detectChanges();
    const element = f.nativeElement as HTMLElement;
    expect(element.querySelectorAll('input[name="bank-palette"]').length).toBe(4);
    expect(element.querySelectorAll('input[name="bank-theme-mode"]').length).toBe(2);
    expect(element.textContent).toContain('Yacht Club');
  });
  it('aplica la paleta seleccionada sin cambiar la quincena ni realizar HTTP', () => {
    const store = TestBed.inject(HouseholdStore);
    store.periodId.set('selected-period');
    const f = TestBed.createComponent(Appearance);
    f.detectChanges();
    const element = f.nativeElement as HTMLElement;
    element.querySelector<HTMLInputElement>('input[value="yacht-club"]')!.click();
    f.detectChanges();
    expect(TestBed.inject(Theme).paletteId()).toBe('yacht-club');
    expect(store.periodId()).toBe('selected-period');
    expect(element.querySelector<HTMLInputElement>('input[value="yacht-club"]')!.checked).toBe(
      true,
    );
    element.querySelector<HTMLInputElement>('input[value="dark"]')!.click();
    f.detectChanges();
    expect(TestBed.inject(Theme).effectiveMode()).toBe('dark');
    expect(TestBed.inject(Theme).paletteId()).toBe('yacht-club');
  });
});
