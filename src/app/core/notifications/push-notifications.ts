import { Injectable, computed, effect, inject, signal, DestroyRef } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom, forkJoin } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { Session } from '../auth/session';
import { HouseholdStore } from '../config/household-store';
import { createIdempotencyKey } from '../../shared/utils/idempotency-key';
import { PUSH_BROWSER } from './push-browser';

export function vapidBytes(key: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+={0,2}$/.test(key))
    throw new Error('La clave pública de notificaciones no es válida.');
  let bytes: Uint8Array;
  try {
    bytes = Uint8Array.from(atob(key.replace(/-/g, '+').replace(/_/g, '/')), (c) =>
      c.charCodeAt(0),
    );
  } catch {
    throw new Error('La clave pública de notificaciones no es válida.');
  }
  if (bytes.length !== 65 || bytes[0] !== 4)
    throw new Error('La clave pública de notificaciones no es válida.');
  return bytes;
}
export function pushError(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    return (
      (
        {
          0: 'No se pudo conectar con BANK. Reintenta cuando tengas conexión.',
          400: 'BANK rechazó los datos de la suscripción.',
          401: 'La sesión no es válida. Vuelve a iniciar sesión.',
          403: 'No tienes permiso para esta acción en el hogar.',
          404: 'Notificaciones no está disponible para este hogar.',
        } as Record<number, string>
      )[error.status] ?? 'BANK no pudo completar la solicitud. Puedes reintentar.'
    );
  }
  return error instanceof Error && error.name === 'Error'
    ? error.message
    : 'No se pudo activar Push. Revisa los permisos del navegador y vuelve a intentar.';
}
@Injectable({ providedIn: 'root' })
export class PushNotifications {
  private readonly sw = inject(SwPush, { optional: true });
  readonly browser = inject(PUSH_BROWSER);
  private readonly session = inject(Session);
  private readonly store = inject(HouseholdStore);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly supported = this.browser.supported && !!this.sw?.isEnabled;
  readonly permission = signal<NotificationPermission>(this.browser.permission());
  readonly subscription = signal<PushSubscription | null>(null);
  readonly subscriptionReady = signal(!this.supported);
  readonly busy = signal(false);
  readonly testing = signal(false);
  readonly loading = signal(false);
  private readonly ownerConfirmed = signal(false);
  private readonly configurationContext = signal('');
  readonly owner = computed(
    () => this.ownerConfirmed() && this.configurationContext() === this.context(),
  );
  readonly registered = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  readonly testNotice = signal('');
  readonly deviceName = signal(this.browser.deviceName);
  private readonly publicKey = signal('');
  private readonly reload = signal(0);
  private readonly context = computed(() =>
    this.session.authorization() && this.store.householdId()
      ? this.session.authorization() + '|' + this.store.householdId()
      : '',
  );
  readonly activeSession = computed(() => !!this.context());
  readonly canActivate = computed(
    () =>
      this.supported &&
      this.activeSession() &&
      this.configurationContext() === this.context() &&
      this.permission() !== 'denied' &&
      !this.busy() &&
      !this.loading() &&
      this.subscriptionReady() &&
      !!this.publicKey(),
  );
  constructor() {
    effect((onCleanup) => {
      const context = this.context();
      this.reload();
      this.registered.set(false);
      this.ownerConfirmed.set(false);
      this.publicKey.set('');
      this.configurationContext.set('');
      this.error.set('');
      this.notice.set('');
      this.testNotice.set('');
      this.loading.set(false);
      if (!context) return;
      this.loading.set(true);
      const household = this.store.householdId();
      const request = forkJoin({
        key: this.store.api.getPushVapidPublicKey(household),
        user: this.store.api.getCurrentUser(),
        members: this.store.api.listHouseholdMembers(household),
      }).subscribe({
        next: ({ key, user, members }) => {
          if (context !== this.context()) return;
          this.configurationContext.set(context);
          this.ownerConfirmed.set(
            members.some((m) => m.active && m.username === user.username && m.role === 'OWNER'),
          );
          try {
            vapidBytes(key.publicKey ?? '');
            this.publicKey.set(key.publicKey!);
          } catch (e) {
            this.error.set(pushError(e));
          }
        },
        error: (e) => {
          if (context === this.context()) {
            this.error.set(pushError(e));
            this.loading.set(false);
          }
        },
        complete: () => {
          if (context === this.context()) this.loading.set(false);
        },
      });
      onCleanup(() => request.unsubscribe());
    });
    if (!this.supported || !this.sw) return;
    this.sw.subscription.pipe(takeUntilDestroyed()).subscribe((sub) => {
      if (sub?.endpoint !== this.subscription()?.endpoint) this.registered.set(false);
      this.subscription.set(sub);
      this.subscriptionReady.set(true);
    });
    this.sw.pushSubscriptionChanges.pipe(takeUntilDestroyed()).subscribe(({ newSubscription }) => {
      this.subscription.set(newSubscription);
      this.registered.set(false);
      if (this.activeSession())
        this.notice.set(
          'La suscripción local cambió. Pulsa sincronizar para actualizar su registro en BANK.',
        );
    });
    this.sw.notificationClicks.pipe(takeUntilDestroyed()).subscribe(() => {
      // Never navigate to arbitrary URLs supplied in metadata.
      if (this.activeSession()) void this.router.navigateByUrl('/dashboard');
    });
    if (typeof window !== 'undefined') {
      const focus = () => this.permission.set(this.browser.permission());
      window.addEventListener('focus', focus);
      this.destroyRef.onDestroy(() => window.removeEventListener('focus', focus));
    }
  }
  reopen() {
    this.registered.set(false);
    this.testNotice.set('');
  }
  retry() {
    if (!this.busy() && !this.testing()) this.reload.update((v) => v + 1);
  }
  private installationId(): string {
    let storage: Storage;
    try {
      storage = this.browser.storage();
      const old = storage.getItem('bank.push.installation');
      if (old && /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(old)) return old;
      const id = createIdempotencyKey();
      storage.setItem('bank.push.installation', id);
      return id;
    } catch {
      throw new Error(
        'Permite el almacenamiento de BANK para conservar esta instalación y vuelve a intentar.',
      );
    }
  }
  async activate() {
    if (!this.canActivate()) return;
    this.busy.set(true);
    this.error.set('');
    this.notice.set('');
    this.registered.set(false);
    const context = this.context(),
      household = this.store.householdId();
    try {
      const installationId = this.installationId();
      const key = this.publicKey(),
        bytes = vapidBytes(key);
      let sub = this.subscription();
      const oldKey = sub?.options?.applicationServerKey;
      if (
        oldKey &&
        (oldKey.byteLength !== bytes.byteLength ||
          new Uint8Array(oldKey).some((b, i) => b !== bytes[i]))
      ) {
        await this.sw!.unsubscribe();
        if (context !== this.context()) return;
        sub = null;
      }
      if (!sub) sub = await this.sw!.requestSubscription({ serverPublicKey: key });
      if (context !== this.context()) return;
      this.subscription.set(sub);
      this.permission.set(this.browser.permission());
      const json = sub.toJSON();
      if (!json.endpoint || !json.keys?.['p256dh'] || !json.keys?.['auth'])
        throw new Error('El navegador no devolvió una suscripción completa. Vuelve a intentar.');
      let endpoint: URL;
      try {
        endpoint = new URL(json.endpoint);
      } catch {
        throw new Error('El navegador devolvió un destino Push inválido.');
      }
      if (endpoint.protocol !== 'https:') throw new Error('El destino Push debe ser HTTPS.');
      const deviceName = this.deviceName().trim().slice(0, 100) || this.browser.deviceName;
      const response = await firstValueFrom(
        this.store.api.registerPushSubscription(household, {
          installationId,
          deviceName,
          endpoint: json.endpoint,
          p256dh: json.keys['p256dh'],
          auth: json.keys['auth'],
        }),
      );
      if (context !== this.context()) return;
      if (
        !response.active ||
        response.householdId !== household ||
        response.installationId !== installationId
      )
        throw new Error(
          'BANK no confirmó el registro de esta instalación. Puedes volver a sincronizar.',
        );
      this.deviceName.set(deviceName);
      this.registered.set(true);
      // Local receipt only. No endpoint, auth key or remote verification is persisted.
      try {
        const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(json.endpoint));
        if (context === this.context())
          this.browser.storage().setItem(
            'bank.push.last-registration',
            JSON.stringify({
              householdId: household,
              installationId,
              endpointHash: Array.from(new Uint8Array(hash), (b) =>
                b.toString(16).padStart(2, '0'),
              ).join(''),
            }),
          );
      } catch {
        /* The successful server response remains valid for this session. */
      }
    } catch (e) {
      if (context === this.context()) {
        this.permission.set(this.browser.permission());
        this.error.set(pushError(e));
      }
    } finally {
      this.busy.set(false);
    }
  }
  async sendTest() {
    if (!this.activeSession() || !this.owner() || this.testing() || this.busy()) return;
    const context = this.context(),
      household = this.store.householdId();
    this.testing.set(true);
    this.error.set('');
    this.testNotice.set('');
    try {
      await firstValueFrom(
        this.store.api.sendTestPushNotification(household, {
          title: 'BANK · Prueba de notificación',
          message: '¡El cuervo ha despertado!',
          metadata: { eventType: 'bank.notification.test' },
        }),
      );
      if (context === this.context())
        this.testNotice.set(
          'Solicitud aceptada por BANK. No confirma la entrega; puede no haber dispositivos activos.',
        );
    } catch (e) {
      if (context === this.context()) this.error.set(pushError(e));
    } finally {
      this.testing.set(false);
    }
  }
}
