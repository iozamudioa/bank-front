import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ModalViewport } from './modal-viewport';

@Component({
  imports: [ModalViewport],
  template: `<div class="cdk-global-overlay-wrapper">
    <div class="cdk-overlay-pane">
      <section appModalViewport>
        <div class="scroll-body" style="overflow-y:auto"><input aria-label="Nombre" /></div>
      </section>
    </div>
  </div>`,
})
class Host {}
class Viewport extends EventTarget {
  height = 844;
  width = 390;
  offsetTop = 0;
  offsetLeft = 0;
}
const originalViewport = Object.getOwnPropertyDescriptor(window, 'visualViewport');
afterEach(() => {
  if (originalViewport) Object.defineProperty(window, 'visualViewport', originalViewport);
  else Reflect.deleteProperty(window, 'visualViewport');
  vi.restoreAllMocks();
});
function setup(viewport: Viewport | null = new Viewport()) {
  Object.defineProperty(window, 'visualViewport', {
    configurable: true,
    value: viewport ?? undefined,
  });
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  const element = fixture.nativeElement as HTMLElement;
  return {
    fixture,
    viewport: viewport!,
    wrapper: element.querySelector<HTMLElement>('.cdk-global-overlay-wrapper')!,
    pane: element.querySelector<HTMLElement>('.cdk-overlay-pane')!,
    host: element.querySelector<HTMLElement>('section')!,
    scroll: element.querySelector<HTMLElement>('.scroll-body')!,
    input: element.querySelector<HTMLInputElement>('input')!,
  };
}
describe('Modales sobre el teclado móvil', () => {
  it('se limita al área visible y se desplaza con el teclado, incluso si no cambia el viewport de layout', async () => {
    const { viewport, wrapper, pane, host } = setup();
    expect(wrapper.style.height).toBe('844px');
    viewport.height = 390;
    viewport.offsetTop = 45;
    viewport.dispatchEvent(new Event('resize'));
    await vi.waitFor(() => expect(wrapper.style.height).toBe('390px'));
    expect(wrapper.style.top).toBe('45px');
    expect(pane.style.getPropertyValue('--bank-dialog-max-height')).toBe('366px');
    expect(pane.style.maxWidth).toBe('366px');
    expect(host.classList.contains('compact-viewport')).toBe(true);
    viewport.height = 844;
    viewport.offsetTop = 0;
    viewport.dispatchEvent(new Event('resize'));
    await vi.waitFor(() => expect(wrapper.style.height).toBe('844px'));
    expect(host.classList.contains('compact-viewport')).toBe(false);
  });
  it('sigue los desplazamientos del viewport mientras el navegador enfoca campos', async () => {
    const { viewport, wrapper } = setup();
    viewport.offsetTop = 70;
    viewport.dispatchEvent(new Event('scroll'));
    await vi.waitFor(() => expect(wrapper.style.top).toBe('70px'));
  });
  it('hace visible el campo enfocado desplazando solo el contenido del modal', async () => {
    const { viewport, scroll, input } = setup();
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    vi.spyOn(scroll, 'getBoundingClientRect').mockReturnValue({ top: 100, bottom: 300 } as DOMRect);
    vi.spyOn(input, 'getBoundingClientRect').mockReturnValue({ top: 330, bottom: 374 } as DOMRect);
    const pageScroll = vi.spyOn(window, 'scrollTo');
    input.focus();
    viewport.height = 400;
    viewport.dispatchEvent(new Event('resize'));
    await vi.waitFor(() => expect(scroll.scrollTop).toBeGreaterThanOrEqual(90));
    expect(pageScroll).not.toHaveBeenCalled();
  });
  it('usa innerHeight cuando VisualViewport no está disponible', () => {
    const { wrapper, pane } = setup(null);
    expect(wrapper.style.height).toBe(window.innerHeight + 'px');
    expect(pane.style.getPropertyValue('--bank-dialog-max-height')).toBe(
      Math.max(0, window.innerHeight - 24) + 'px',
    );
  });
  it('elimina sus listeners y frames al cerrar, sin afectar otros diálogos', async () => {
    const { fixture, viewport, wrapper } = setup();
    const remove = vi.spyOn(viewport, 'removeEventListener');
    fixture.destroy();
    expect(remove).toHaveBeenCalledWith('resize', expect.any(Function));
    expect(remove).toHaveBeenCalledWith('scroll', expect.any(Function));
    viewport.height = 200;
    viewport.dispatchEvent(new Event('resize'));
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    expect(wrapper.style.height).toBe('844px');
  });
});
