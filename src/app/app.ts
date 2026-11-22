import { ToastOutlet } from './shared/notifications/toast-outlet';
import { MobileQuickActions } from './shared/components/mobile-quick-actions/mobile-quick-actions';
import { Icon } from './shared/components/icon/icon';
import { ModalService } from './shared/dialogs/modal.service';
import { OperationSafety } from './core/config/operation-safety';
import { MatButton } from '@angular/material/button';
import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { Theme } from './core/theme/theme';
import { HouseholdStore } from './core/config/household-store';
import { Connectivity } from './core/config/connectivity';
import { errorMessage } from './core/errors/message';
import { firstValueFrom } from 'rxjs';
import { destroyKingdomSession } from './core/api/auth.interceptor';
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
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  readonly modals = inject(ModalService);
  readonly safety = inject(OperationSafety);
  readonly theme = inject(Theme);
  readonly username = signal('');
  readonly store = inject(HouseholdStore);
  readonly connection = inject(Connectivity);
  readonly logout = destroyKingdomSession;
  readonly ready = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly links = [
    ['/dashboard', 'dashboard', 'Resumen'],
    ['/accounts', 'account_balance_wallet', 'Cuentas'],
    ['/envelopes', 'mail', 'Sobres'],
    ['/budget-periods', 'calendar_month', 'Quincenas'],
    ['/movements', 'swap_horiz', 'Actividad'],
    ['/reports', 'bar_chart', 'Reportes'],
    ['/settings', 'settings', 'Configuración'],
  ] as const;
  ngOnInit() {
    void this.initialize();
  }
  async initialize() {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      const user = await firstValueFrom(this.store.api.getCurrentUser());
      this.username.set(user.username);
      await this.store.loadHouseholds();
      this.ready.set(true);
    } catch (e) {
      this.ready.set(false);
      this.error.set(errorMessage(e));
    } finally {
      this.busy.set(false);
    }
  }
}
