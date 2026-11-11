import { ToastOutlet } from './shared/notifications/toast-outlet';
import { MobileQuickActions } from './shared/components/mobile-quick-actions/mobile-quick-actions';
import { Icon } from './shared/components/icon/icon';
import { ModalService } from './shared/dialogs/modal.service';
import { OperationSafety } from './core/config/operation-safety';
import { MatButton } from '@angular/material/button';
import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Theme } from './core/theme/theme';
import { Session } from './core/auth/session';
import { HouseholdStore } from './core/config/household-store';
import { Connectivity } from './core/config/connectivity';
import { errorMessage } from './core/errors/message';
import { firstValueFrom } from 'rxjs';
@Component({
  selector: 'app-root',
  imports: [
    ToastOutlet,
    MobileQuickActions,
    Icon,
    MatButton,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    ReactiveFormsModule,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  readonly modals = inject(ModalService);
  readonly safety = inject(OperationSafety);
  readonly theme = inject(Theme);
  readonly session = inject(Session);
  readonly store = inject(HouseholdStore);
  readonly connection = inject(Connectivity);
  readonly form = inject(FormBuilder).nonNullable.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
  });
  ready = false;
  busy = false;
  error = '';
  readonly links = [
    ['/dashboard', 'dashboard', 'Resumen'],
    ['/accounts', 'account_balance_wallet', 'Cuentas'],
    ['/envelopes', 'mail', 'Sobres'],
    ['/budget-periods', 'calendar_month', 'Quincenas'],
    ['/movements', 'swap_horiz', 'Actividad'],
    ['/reports', 'bar_chart', 'Reportes'],
    ['/settings', 'settings', 'Configuración'],
  ] as const;
  async login() {
    if (this.form.invalid || this.busy) return;
    this.busy = true;
    this.error = '';
    const v = this.form.getRawValue();
    this.session.set(v.username, v.password);
    try {
      await firstValueFrom(this.store.api.getCurrentUser());
      await this.store.loadHouseholds();
      this.ready = true;
      this.form.controls.password.reset();
    } catch (e) {
      this.session.clear();
      this.error = errorMessage(e);
    } finally {
      this.busy = false;
    }
  }
  logout() {
    this.session.clear();
    this.store.clear();
    this.ready = false;
  }
}
