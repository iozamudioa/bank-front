import { operationGuard } from './core/config/operation-safety';
import { Routes } from '@angular/router';
export const routes: Routes = [
  {
    path: 'reports',
    canDeactivate: [operationGuard],
    loadComponent: () => import('./features/reports/reports').then((m) => m.Reports),
  },
  {
    path: 'setup',
    canDeactivate: [operationGuard],
    loadComponent: () => import('./features/onboarding/setup-wizard').then((m) => m.SetupWizard),
  },
  {
    path: 'dashboard',
    canDeactivate: [operationGuard],
    loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
  },
  {
    path: 'expenses',
    canDeactivate: [operationGuard],
    loadComponent: () => import('./features/expenses/expense-page').then((m) => m.ExpensePage),
  },
  {
    path: 'accounts',
    canDeactivate: [operationGuard],
    loadComponent: () => import('./features/accounts/accounts').then((m) => m.Accounts),
  },
  {
    path: 'envelopes',
    canDeactivate: [operationGuard],
    loadComponent: () => import('./features/envelopes/envelopes').then((m) => m.Envelopes),
  },
  {
    path: 'budget-periods',
    canDeactivate: [operationGuard],
    loadComponent: () => import('./features/budget-periods/periods').then((m) => m.Periods),
  },
  {
    path: 'movements',
    canDeactivate: [operationGuard],
    loadComponent: () => import('./features/movements/movements').then((m) => m.Movements),
  },
  {
    path: 'settings',
    canDeactivate: [operationGuard],
    loadComponent: () => import('./features/settings/settings').then((m) => m.Settings),
  },
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: '**', redirectTo: 'dashboard' },
];
