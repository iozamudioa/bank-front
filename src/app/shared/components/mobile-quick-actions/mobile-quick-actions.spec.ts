import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, expect, it, vi } from 'vitest';
import { MobileQuickActions } from './mobile-quick-actions';
import { HouseholdStore } from '../../../core/config/household-store';
import { ModalService } from '../../dialogs/modal.service';
function setup() {
  TestBed.configureTestingModule({
    imports: [MobileQuickActions],
    providers: [provideHttpClient(), provideHttpClientTesting()],
  });
  TestBed.inject(HouseholdStore).householdId.set('h');
  const fixture = TestBed.createComponent(MobileQuickActions);
  fixture.detectChanges();
  const element = fixture.nativeElement as HTMLElement;
  const toggle = element.querySelector<HTMLButtonElement>('.fab-toggle')!;
  return { fixture, element, toggle };
}
describe('FAB de acciones móviles', () => {
  it('despliega dos acciones con iconos y nombres accesibles, y se cierra con Escape', () => {
    const { fixture, element, toggle } = setup();
    toggle.click();
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    const options = [...element.querySelectorAll<HTMLButtonElement>('.quick-option')];
    expect(options.map((b) => b.getAttribute('aria-label'))).toEqual([
      'Nuevo movimiento',
      'Registrar gasto',
    ]);
    expect(
      options.every((b) => b.children.length === 1 && b.firstElementChild?.tagName === 'APP-ICON'),
    ).toBe(true);
    const focus = vi.spyOn(toggle, 'focus');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(element.querySelector('.quick-options')).toBeNull();
    expect(focus).toHaveBeenCalled();
  });
  it.each(['movement', 'expense'] as const)(
    'abre %s desde el FAB y cierra el desplegable',
    (action) => {
      const { fixture, element, toggle } = setup();
      const open = vi.spyOn(TestBed.inject(ModalService), action).mockResolvedValue();
      toggle.click();
      fixture.detectChanges();
      element
        .querySelectorAll<HTMLButtonElement>('.quick-option')
        [action === 'movement' ? 0 : 1].click();
      fixture.detectChanges();
      expect(open).toHaveBeenCalledTimes(1);
      expect(element.querySelector('.quick-options')).toBeNull();
    },
  );
  it('bloquea accesos y cierra opciones si hay una confirmación financiera pendiente', () => {
    const { fixture, element, toggle } = setup();
    toggle.click();
    fixture.detectChanges();
    fixture.componentInstance.safety.locked.set(true);
    fixture.detectChanges();
    expect(toggle.disabled).toBe(true);
    expect(element.querySelector('.quick-options')).toBeNull();
  });
});
