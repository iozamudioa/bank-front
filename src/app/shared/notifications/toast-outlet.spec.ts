import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ToastOutlet } from './toast-outlet';
import { ToastService } from './toast.service';
afterEach(() => {
  TestBed.resetTestingModule();
  vi.useRealTimers();
});
describe('Notificaciones de éxito', () => {
  it('muestra un estado accesible que se puede cerrar', () => {
    const fixture = TestBed.createComponent(ToastOutlet);
    const service = TestBed.inject(ToastService);
    service.success('Cuenta creada correctamente.');
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('[role="status"]')?.textContent).toBe(
      'Cuenta creada correctamente.',
    );
    element.querySelector<HTMLButtonElement>('[aria-label="Cerrar notificación"]')!.click();
    fixture.detectChanges();
    expect(service.messages()).toEqual([]);
  });
  it('retira el toast automáticamente y conserva como máximo tres mensajes', () => {
    vi.useFakeTimers();
    const service = TestBed.inject(ToastService);
    for (let i = 0; i < 4; i++) service.success('Operación ' + i);
    expect(service.messages().length).toBe(3);
    expect(service.messages()[0].message).toBe('Operación 1');
    vi.advanceTimersByTime(6000);
    expect(service.messages()).toEqual([]);
  });
});
