import { Injectable } from '@angular/core';
import { MatDatepickerIntl } from '@angular/material/datepicker';
@Injectable()
export class SpanishDateRangeIntl extends MatDatepickerIntl {
  constructor() {
    super();
    this.calendarLabel = 'Seleccionar fechas de inicio y fin';
    this.openCalendarLabel = 'Elegir rango de fechas';
    this.closeCalendarLabel = 'Cerrar calendario';
    this.prevMonthLabel = 'Mes anterior';
    this.nextMonthLabel = 'Mes siguiente';
    this.prevYearLabel = 'Año anterior';
    this.nextYearLabel = 'Año siguiente';
    this.prevMultiYearLabel = 'Años anteriores';
    this.nextMultiYearLabel = 'Años siguientes';
    this.switchToMonthViewLabel = 'Elegir mes';
    this.switchToMultiYearViewLabel = 'Elegir año';
    this.startDateLabel = 'Fecha de inicio';
    this.endDateLabel = 'Fecha de fin';
    this.comparisonDateLabel = 'Fecha de comparación';
  }
  override formatYearRangeLabel(start: string, end: string) {
    return 'Del año ' + start + ' al ' + end;
  }
}
