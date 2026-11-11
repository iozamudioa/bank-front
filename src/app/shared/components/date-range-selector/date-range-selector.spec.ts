import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { OverlayContainer } from '@angular/cdk/overlay';
import { MatDateRangePicker } from '@angular/material/datepicker';
import { describe, it, expect, vi } from 'vitest';
import { DateRangeSelector } from './date-range-selector';
describe('Selector único de rango', () => {
  it('emite las dos fechas locales solo cuando el rango está completo y ordenado', () => {
    const fixture = TestBed.createComponent(DateRangeSelector),
      component = fixture.componentInstance,
      changed = vi.fn();
    component.registerOnChange(changed);
    fixture.detectChanges();
    component.dates.controls.start.setValue(new Date(2026, 10, 15));
    expect(changed).toHaveBeenLastCalledWith(null);
    component.dates.controls.end.setValue(new Date(2026, 10, 30));
    expect(changed).toHaveBeenLastCalledWith({ startDate: '2026-11-15', endDate: '2026-11-30' });
    component.dates.controls.end.setValue(new Date(2026, 10, 14));
    expect(changed).toHaveBeenLastCalledWith(null);
  });
  it('recupera un rango y lo bloquea sin borrar ni emitir cambios', () => {
    const fixture = TestBed.createComponent(DateRangeSelector),
      component = fixture.componentInstance,
      changed = vi.fn();
    component.registerOnChange(changed);
    component.writeValue({ startDate: '2026-12-16', endDate: '2026-12-31' });
    component.setDisabledState(true);
    fixture.detectChanges();
    expect(component.dates.controls.start.value?.getDate()).toBe(16);
    expect(component.dates.controls.end.value?.getDate()).toBe(31);
    expect(component.dates.disabled).toBe(true);
    expect(changed).not.toHaveBeenCalled();
    component.setDisabledState(false);
    expect(component.dates.enabled).toBe(true);
  });
  it('selecciona inicio y fin dentro de un mismo calendario', async () => {
    const fixture = TestBed.createComponent(DateRangeSelector),
      component = fixture.componentInstance,
      changed = vi.fn();
    component.registerOnChange(changed);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('mat-date-range-input').length).toBe(1);
    expect(element.querySelectorAll('mat-datepicker-toggle').length).toBe(1);
    expect(element.querySelectorAll('input[type="date"]').length).toBe(0);
    const picker = fixture.debugElement.query(By.directive(MatDateRangePicker))
      .componentInstance as MatDateRangePicker<Date>;
    picker.startAt = new Date(2026, 10, 1);
    picker.open();
    fixture.detectChanges();
    await fixture.whenStable();
    const overlay = TestBed.inject(OverlayContainer).getContainerElement();
    expect(overlay.querySelectorAll('mat-calendar').length).toBe(1);
    const start = overlay.querySelector<HTMLButtonElement>(
      'button[aria-label="15 de noviembre de 2026"]',
    );
    expect(start).not.toBeNull();
    start!.click();
    fixture.detectChanges();
    expect(picker.opened).toBe(true);
    const end = overlay.querySelector<HTMLButtonElement>(
      'button[aria-label="30 de noviembre de 2026"]',
    );
    expect(end).not.toBeNull();
    end!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(changed).toHaveBeenLastCalledWith({ startDate: '2026-11-15', endDate: '2026-11-30' });
    await vi.waitFor(() => expect(picker.opened).toBe(false));
  });
});
