import { Observable } from 'rxjs';
import { FinancialCommand } from '../financial-command';
export interface MovementFormView {
  readonly c: FinancialCommand;
  readonly form: {
    readonly invalid: boolean;
    readonly statusChanges: Observable<unknown>;
    getRawValue(): Record<string, string>;
    markAllAsTouched(): void;
  };
  review(): void;
}
