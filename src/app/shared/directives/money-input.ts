import { Directive, ElementRef, forwardRef, HostListener, inject } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/** Formats MXN for display while keeping a decimal string in the form and API payload. */
@Directive({
  selector: 'input[appMoneyInput]',
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => MoneyInput), multi: true },
  ],
  host: { inputmode: 'decimal', placeholder: '$0.00' },
})
export class MoneyInput implements ControlValueAccessor {
  private readonly element = inject<ElementRef<HTMLInputElement>>(ElementRef);
  private raw = '';
  private change: (value: string) => void = () => {};
  private touched: () => void = () => {};
  writeValue(value: string | number | null) {
    this.raw = value == null ? '' : String(value);
    this.render(true);
  }
  registerOnChange(fn: (value: string) => void) {
    this.change = fn;
  }
  registerOnTouched(fn: () => void) {
    this.touched = fn;
  }
  setDisabledState(disabled: boolean) {
    this.element.nativeElement.disabled = disabled;
  }
  @HostListener('input')
  onInput() {
    const input = this.element.nativeElement;
    const original = input.value;
    const caret = input.selectionStart ?? original.length;
    const prefix = original.slice(0, caret).replace(/[$,\s]/g, '');
    this.raw = original.replace(/[$,\s]/g, '');
    if (this.raw.startsWith('.')) this.raw = '0' + this.raw;
    this.change(this.raw);
    this.render(false);
    if (caret === original.length) input.setSelectionRange(input.value.length, input.value.length);
    else {
      let count = 0,
        position = 0;
      while (position < input.value.length && count < prefix.length) {
        if (/[\d.]/.test(input.value[position])) count++;
        position++;
      }
      input.setSelectionRange(position, position);
    }
  }
  @HostListener('blur')
  onBlur() {
    if (/^\d+(\.\d{0,2})?$/.test(this.raw)) {
      const [integer, fraction] = this.raw.split('.');
      const normalized = integer + '.' + (fraction || '').padEnd(2, '0');
      if (normalized !== this.raw) {
        this.raw = normalized;
        this.change(this.raw);
      }
    }
    this.render(true);
    this.touched();
  }
  private render(pad: boolean) {
    if (!this.raw) {
      this.element.nativeElement.value = '';
      return;
    }
    // Preserve invalid input for validation; never round or silently truncate money.
    if (!/^\d+(\.\d{0,2})?$/.test(this.raw)) {
      this.element.nativeElement.value = this.raw;
      return;
    }
    const [integer, fraction] = this.raw.split('.');
    const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    this.element.nativeElement.value =
      '$' +
      grouped +
      (pad ? '.' + (fraction || '').padEnd(2, '0') : fraction !== undefined ? '.' + fraction : '');
  }
}
