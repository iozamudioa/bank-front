import { TestBed } from '@angular/core/testing';
import { describe, it, expect } from 'vitest';
import { Icon } from './icon';
describe('Iconos de Google', () => {
  it('oculta los nombres técnicos a lectores de pantalla', () => {
    const f = TestBed.createComponent(Icon);
    f.componentRef.setInput('name', 'savings');
    f.detectChanges();
    const element = f.nativeElement as HTMLElement;
    expect(element.getAttribute('aria-hidden')).toBe('true');
    expect(element.querySelector('.material-symbols-rounded')?.textContent?.trim()).toBe('savings');
    expect(element.getAttribute('tabindex')).toBeNull();
  });
  it('permite tamaños explícitos y estado seleccionado', () => {
    const f = TestBed.createComponent(Icon);
    f.componentRef.setInput('name', 'dashboard');
    f.componentRef.setInput('size', 'lg');
    f.componentRef.setInput('filled', true);
    f.detectChanges();
    const element = f.nativeElement as HTMLElement;
    expect(element.dataset['size']).toBe('lg');
    expect(element.classList.contains('filled')).toBe(true);
    f.componentRef.setInput('filled', false);
    f.detectChanges();
    expect(element.classList.contains('filled')).toBe(false);
  });
});
