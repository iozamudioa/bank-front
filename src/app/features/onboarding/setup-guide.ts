import { Icon } from '../../shared/components/icon/icon';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HouseholdStore } from '../../core/config/household-store';
@Component({
  selector: 'app-setup-guide',
  imports: [Icon, RouterLink],
  templateUrl: './setup-guide.html',
  styleUrl: './setup-guide.scss',
})
export class SetupGuide {
  readonly s = inject(HouseholdStore);
  readonly step = signal(0);
  previous() {
    this.step.update((v) => v - 1);
  }
  next() {
    this.step.update((v) => v + 1);
  }
  readonly steps = [
    {
      name: 'Integrantes',
      path: '/settings',
      description: 'Agrega usuarios existentes en la sección Integrantes.',
    },
    {
      name: 'Cuentas',
      path: '/accounts',
      description: 'Crea tus cuentas físicas y digitales sin capturar saldos todavía.',
    },
    {
      name: 'Fuentes de ingreso',
      path: '/settings',
      description: 'Configura tus ingresos esperados. No se depositará dinero.',
    },
    {
      name: 'Sobres',
      path: '/envelopes',
      description: 'Crea un destino para cada parte de tu presupuesto.',
    },
    {
      name: 'Plan y quincena',
      path: '/budget-periods',
      description: 'Guarda los importes habituales y abre el periodo con las fechas que necesitas.',
    },
    {
      name: 'Saldos iniciales',
      path: '/movements',
      description:
        'Registra solo el dinero real existente mediante Saldo inicial. Después puedes apartarlo en sobres.',
    },
  ];
}
