export interface DateRangeValue {
  startDate: string;
  endDate: string;
}
export function localDateString(date: Date): string {
  return [
    String(date.getFullYear()).padStart(4, '0'),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}
export function parseLocalDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (year < 1) return null;
  const date = new Date(0);
  date.setHours(0, 0, 0, 0);
  date.setFullYear(year, month - 1, day);
  return localDateString(date) === value ? date : null;
}
export function isDateRange(value: unknown): value is DateRangeValue {
  if (!value || typeof value !== 'object') return false;
  const range = value as Record<string, unknown>;
  return (
    typeof range['startDate'] === 'string' &&
    typeof range['endDate'] === 'string' &&
    !!parseLocalDate(range['startDate']) &&
    !!parseLocalDate(range['endDate']) &&
    range['endDate'] >= range['startDate']
  );
}
