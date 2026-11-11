import { ToastService } from '../notifications/toast.service';
import { Theme } from '../../core/theme/theme';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { MAT_DIALOG_DEFAULT_OPTIONS, MatDialog, MatDialogState } from '@angular/material/dialog';
import { provideRouter, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ModalService } from './modal.service';
import { ModalShell } from './modal-shell';
import { OperationSafety } from '../../core/config/operation-safety';
import { HouseholdStore } from '../../core/config/household-store';
describe('Modales globales', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: MAT_DIALOG_DEFAULT_OPTIONS,
          useValue: { enterAnimationDuration: 0, exitAnimationDuration: 0 },
        },
      ],
    });
    TestBed.inject(HouseholdStore).householdId.set('h');
  });
  afterEach(() => {
    TestBed.inject(OperationSafety).locked.set(false);
    TestBed.inject(MatDialog).closeAll();
  });
  it('después de abrir la quincena cierra el formulario, notifica y abre la guía sin superponer modales', async () => {
    const s = TestBed.inject(HouseholdStore);
    s.periods.set([
      {
        id: 'p',
        householdId: 'h',
        startDate: '2026-11-16',
        endDate: '2026-11-30',
        status: 'OPEN',
        expectedIncome: 1000,
        lines: [],
      },
    ]);
    const service = TestBed.inject(ModalService);
    await service.period();
    await TestBed.inject(ApplicationRef).whenStable();
    const dialog = TestBed.inject(MatDialog);
    const previous = dialog.openDialogs[0];
    const closed = firstValueFrom(previous.afterClosed());
    (previous.componentInstance as ModalShell).state.complete(
      'Quincena abierta correctamente.',
      'p',
    );
    await closed;
    await vi.waitFor(() =>
      expect(dialog.openDialogs[0]?.componentInstance.data.title).toBe(
        'Cargar y distribuir saldos',
      ),
    );
    await TestBed.inject(ApplicationRef).whenStable();
    TestBed.inject(HttpTestingController)
      .expectOne('/api/v1/households/h/income-sources')
      .flush([]);
    expect(dialog.openDialogs).toHaveLength(1);
    expect(dialog.openDialogs[0]).not.toBe(previous);
    expect(s.periodId()).toBe('p');
    expect(
      TestBed.inject(ToastService)
        .messages()
        .map((m) => m.message),
    ).toEqual(['Quincena abierta correctamente.']);
  });
  it('abre creación de cuenta sin navegar y bloquea una segunda apertura', async () => {
    const service = TestBed.inject(ModalService),
      safety = TestBed.inject(OperationSafety),
      router = TestBed.inject(Router);
    const url = router.url;
    await service.account();
    await TestBed.inject(ApplicationRef).whenStable();
    expect(TestBed.inject(MatDialog).openDialogs.length).toBe(1);
    expect(safety.modalOpen()).toBe(true);
    expect(router.url).toBe(url);
    expect(document.querySelector('[role="dialog"]')?.getAttribute('aria-labelledby')).toBe(
      'bank-modal-title',
    );
    expect(document.body.textContent).toContain('Crear cuenta');
    await service.envelope();
    expect(TestBed.inject(MatDialog).openDialogs.length).toBe(1);
    const ref = TestBed.inject(MatDialog).openDialogs[0];
    const done = firstValueFrom(ref.afterClosed());
    ref.close();
    await done;
    expect(safety.modalOpen()).toBe(false);
  });
  it('impide cerrar mientras guarda o una operación financiera está pendiente', async () => {
    await TestBed.inject(ModalService).account();
    const ref = TestBed.inject(MatDialog).openDialogs[0];
    const shell = ref.componentInstance as ModalShell;
    shell.state.busy.set(true);
    shell.close();
    expect(ref.getState()).toBe(MatDialogState.OPEN);
    shell.state.busy.set(false);
    TestBed.inject(OperationSafety).locked.set(true);
    shell.escape(new Event('keydown'));
    expect(ref.getState()).toBe(MatDialogState.OPEN);
    TestBed.inject(OperationSafety).locked.set(false);
    const done = firstValueFrom(ref.afterClosed());
    shell.close();
    await done;
  });
  it('ofrece las operaciones en un modal desde cualquier ruta', async () => {
    await TestBed.inject(ModalService).movement();
    await TestBed.inject(ApplicationRef).whenStable();
    TestBed.inject(HttpTestingController).expectNone('/api/v1/households/h/income-sources');
    expect(document.querySelector<HTMLElement>('.cdk-overlay-pane')?.style.width).toBe('1050px');
    expect(TestBed.inject(MatDialog).openDialogs[0].componentInstance.data.framed).toBe(true);
    expect(document.querySelector('.movement-header')).not.toBeNull();
    expect(document.querySelector('.movement-footer')).not.toBeNull();
    expect(document.body.textContent).toContain('Nuevo movimiento');
    expect(document.body.textContent).toContain('Registrar ingreso');
    expect(document.body.textContent).toContain('Apartar dinero');
    expect(document.body.textContent).toContain('Transferir entre cuentas');
  });
  it('actualiza la paleta con un modal abierto sin destruirlo', async () => {
    await TestBed.inject(ModalService).account();
    const dialog = TestBed.inject(MatDialog),
      ref = dialog.openDialogs[0];
    const theme = TestBed.inject(Theme);
    theme.setPalette('yacht-club');
    theme.setMode('dark');
    expect(dialog.openDialogs[0]).toBe(ref);
    expect(document.documentElement.dataset['palette']).toBe('yacht-club');
    expect(document.documentElement.style.getPropertyValue('--bank-surface')).toBe(
      theme.palette().darkTokens.surface,
    );
  });
});
