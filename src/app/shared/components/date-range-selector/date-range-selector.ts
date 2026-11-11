import { Component, DestroyRef, forwardRef, inject, signal } from '@angular/core';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
  ReactiveFormsModule,
  FormControl,
  FormGroup,
  Validators,
} from '@angular/forms';
import { MAT_DATE_LOCALE, provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule, MatDatepickerIntl } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Icon } from '../icon/icon';
import {
  DateRangeValue,
  isDateRange,
  localDateString,
  parseLocalDate,
} from '../../utils/date-range';
import { SpanishDateRangeIntl } from './spanish-date-range-intl';
@Component({
  selector: 'app-date-range-selector',
  imports: [ReactiveFormsModule, MatDatepickerModule, MatFormFieldModule, Icon],
  providers: [
    provideNativeDateAdapter(),
    { provide: MAT_DATE_LOCALE, useValue: 'es-MX' },
    { provide: MatDatepickerIntl, useClass: SpanishDateRangeIntl },
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => DateRangeSelector), multi: true },
  ],
  templateUrl: './date-range-selector.html',
  styleUrl: './date-range-selector.scss',
})
export class DateRangeSelector implements ControlValueAccessor {
  readonly disabled = signal(false);
  readonly dates = new FormGroup({
    start: new FormControl<Date | null>(null, Validators.required),
    end: new FormControl<Date | null>(null, Validators.required),
  });
  private changed: (value: DateRangeValue | null) => void = () => {};
  private touched: () => void = () => {};
  constructor() {
    this.dates.valueChanges.pipe(takeUntilDestroyed(inject(DestroyRef))).subscribe(() => {
      const { start, end } = this.dates.getRawValue();
      const range =
        start && end && !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())
          ? { startDate: localDateString(start), endDate: localDateString(end) }
          : null;
      this.changed(isDateRange(range) ? range : null);
    });
  }
  writeValue(value: DateRangeValue | null) {
    this.dates.setValue(
      {
        start: value ? parseLocalDate(value.startDate) : null,
        end: value ? parseLocalDate(value.endDate) : null,
      },
      { emitEvent: false },
    );
  }
  registerOnChange(fn: (value: DateRangeValue | null) => void) {
    this.changed = fn;
  }
  registerOnTouched(fn: () => void) {
    this.touched = fn;
  }
  setDisabledState(disabled: boolean) {
    this.disabled.set(disabled);
    if (disabled) this.dates.disable({ emitEvent: false });
    else this.dates.enable({ emitEvent: false });
  }
  touch() {
    this.dates.markAllAsTouched();
    this.touched();
  }
}
