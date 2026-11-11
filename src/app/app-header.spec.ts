import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { App } from './app';
function setup(ready = true) {
  TestBed.configureTestingModule({
    imports: [App],
    providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
  });
  const fixture = TestBed.createComponent(App);
  fixture.componentInstance.ready = ready;
  fixture.detectChanges();
  return { fixture, element: fixture.nativeElement as HTMLElement };
}
describe('Cabecera móvil', () => {
  it('ofrece Configuración junto al tema con un icono y sin el indicador En línea', () => {
    const { element } = setup();
    const theme = element.querySelector('[aria-label="Cambiar tema"]')!;
    const settings = element.querySelector<HTMLAnchorElement>('.mobile-settings')!;
    expect(theme.nextElementSibling).toBe(settings);
    expect(settings.getAttribute('href')).toBe('/settings');
    expect(settings.getAttribute('aria-label')).toBe('Configuración');
    expect(settings.querySelector('app-icon')).not.toBeNull();
    expect(settings.querySelector('app-icon')?.getAttribute('aria-hidden')).toBe('true');
    expect(element.querySelector('.connection')).toBeNull();
    expect(element.querySelector('.topbar')?.textContent).not.toContain('En línea');
  });
  it('protege el acceso a Configuración cuando hay un modal abierto', () => {
    const { fixture, element } = setup();
    fixture.componentInstance.safety.modalOpen.set(true);
    fixture.detectChanges();
    const settings = element.querySelector<HTMLAnchorElement>('.mobile-settings')!;
    expect(settings.hasAttribute('href')).toBe(false);
    expect(settings.getAttribute('aria-disabled')).toBe('true');
    expect(settings.tabIndex).toBe(-1);
  });
});

describe('Login', () => {
  it('presenta los campos sin el aviso técnico ni el control de tema', () => {
    const { element } = setup(false);
    const login = element.querySelector('.login')!;
    expect(login.querySelector('input[autocomplete="username"]')).not.toBeNull();
    expect(login.querySelector('input[autocomplete="current-password"]')).not.toBeNull();
    expect(login.textContent).not.toContain('HTTP Basic');
    expect(login.textContent).not.toContain('Credenciales solo');
    expect(login.textContent).not.toContain('Tema:');
  });
});
