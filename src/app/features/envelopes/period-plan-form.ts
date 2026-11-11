import { FormControl, FormGroup, Validators } from '@angular/forms';
import { validAmount } from '../../shared/utils/money';
export function periodPlanForm(required = false) {
  return new FormGroup(
    {
      periodId: new FormControl('', { nonNullable: true }),
      amount: new FormControl('', {
        nonNullable: true,
        validators: [
          ...(required ? [Validators.required] : []),
          (control) =>
            control.value === '' || validAmount(control.value, true) ? null : { amount: true },
        ],
      }),
    },
    {
      validators: (control) => {
        const { periodId, amount } = control.getRawValue();
        return amount !== '' && !periodId ? { period: true } : null;
      },
    },
  );
}
export type PeriodPlanForm = ReturnType<typeof periodPlanForm>;
