import { afterNextRender, DestroyRef, Directive, ElementRef, inject } from '@angular/core';

/** Keeps every modal inside the visible area, including when a mobile keyboard covers the layout viewport. */
@Directive({ selector: '[appModalViewport]' })
export class ModalViewport {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    afterNextRender(() => this.observe());
  }

  private observe() {
    const pane = this.host.closest<HTMLElement>('.cdk-overlay-pane');
    const wrapper = pane?.closest<HTMLElement>('.cdk-global-overlay-wrapper');
    if (!pane || !wrapper) return;
    const viewport = window.visualViewport;
    let frame = 0;
    let focusFrame = 0;
    const revealFocus = () => {
      focusFrame = 0;
      const focused = document.activeElement;
      if (!(focused instanceof HTMLElement) || !this.host.contains(focused)) return;
      // Scroll only the modal's own containers, never the page underneath it.
      for (
        let parent = focused.parentElement;
        parent && parent !== this.host;
        parent = parent.parentElement
      ) {
        if (!/(auto|scroll)/.test(getComputedStyle(parent).overflowY)) continue;
        const field = focused.getBoundingClientRect();
        const bounds = parent.getBoundingClientRect();
        if (field.bottom > bounds.bottom - 16)
          parent.scrollTop += field.bottom - bounds.bottom + 16;
        else if (field.top < bounds.top + 16) parent.scrollTop -= bounds.top + 16 - field.top;
      }
    };
    const update = () => {
      frame = 0;
      const height = viewport?.height ?? window.innerHeight;
      const width = viewport?.width ?? window.innerWidth;
      wrapper.style.height = height + 'px';
      wrapper.style.width = width + 'px';
      wrapper.style.top = (viewport?.offsetTop ?? 0) + 'px';
      wrapper.style.left = (viewport?.offsetLeft ?? 0) + 'px';
      pane.style.maxWidth = Math.max(0, width - 24) + 'px';
      pane.style.setProperty('--bank-dialog-viewport-height', height + 'px');
      pane.style.setProperty('--bank-dialog-max-height', Math.max(0, height - 24) + 'px');
      this.host.classList.toggle('compact-viewport', height < 500);
      if (focusFrame) cancelAnimationFrame(focusFrame);
      focusFrame = requestAnimationFrame(revealFocus);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    viewport?.addEventListener('resize', schedule);
    viewport?.addEventListener('scroll', schedule);
    window.addEventListener('resize', schedule);
    this.host.addEventListener('focusin', schedule);
    this.destroyRef.onDestroy(() => {
      viewport?.removeEventListener('resize', schedule);
      viewport?.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      this.host.removeEventListener('focusin', schedule);
      if (frame) cancelAnimationFrame(frame);
      if (focusFrame) cancelAnimationFrame(focusFrame);
    });
  }
}
