import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { SwPush } from '@angular/service-worker';
import { BehaviorSubject, Subject } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PushNotifications } from './push-notifications';
import { PUSH_BROWSER } from './push-browser';
import { HouseholdStore } from '../config/household-store';
import { Session } from '../auth/session';
import { authInterceptor } from '../api/auth.interceptor';
import { Notifications } from '../../features/settings/notifications/notifications';

const publicKey = btoa(String.fromCharCode(4, ...new Array(64).fill(1)))
  .replace(/\+/g, '-')
  .replace(/\//g, '_')
  .replace(/=+$/, '');
function subscription(keys = true): PushSubscription {
  return {
    endpoint: 'https://push.example/device',
    options: { applicationServerKey: null },
    toJSON: () => ({
      endpoint: 'https://push.example/device',
      keys: keys ? { p256dh: 'real-browser-key', auth: 'real-browser-secret' } : {},
    }),
  } as unknown as PushSubscription;
}
describe('Web Push del mismo origen', () => {
  let fixture: ComponentFixture<Notifications>;
  let http: HttpTestingController;
  let push: PushNotifications;
  let permission: NotificationPermission;
  let current: BehaviorSubject<PushSubscription | null>;
  let changes: Subject<{
    oldSubscription: PushSubscription | null;
    newSubscription: PushSubscription | null;
  }>;
  let clicks: Subject<unknown>;
  let sw: {
    isEnabled: boolean;
    subscription: typeof current;
    pushSubscriptionChanges: typeof changes;
    notificationClicks: typeof clicks;
    requestSubscription: ReturnType<typeof vi.fn>;
    unsubscribe: ReturnType<typeof vi.fn>;
  };
  function setup(
    supported = true,
    existing: PushSubscription | null = null,
    initial: NotificationPermission = 'default',
  ) {
    localStorage.clear();
    permission = initial;
    current = new BehaviorSubject(existing);
    changes = new Subject();
    clicks = new Subject();
    sw = {
      isEnabled: supported,
      subscription: current,
      pushSubscriptionChanges: changes,
      notificationClicks: clicks,
      requestSubscription: vi.fn(async () => {
        permission = 'granted';
        return subscription();
      }),
      unsubscribe: vi.fn(async () => {}),
    };
    TestBed.configureTestingModule({
      imports: [Notifications],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: SwPush, useValue: sw },
        {
          provide: PUSH_BROWSER,
          useValue: {
            supported,
            permission: () => permission,
            storage: () => localStorage,
            deviceName: 'Chrome en Android',
          },
        },
      ],
    });
    TestBed.inject(Session).set('olda', 'test-password');
    TestBed.inject(HouseholdStore).householdId.set('h');
    fixture = TestBed.createComponent(Notifications);
    push = TestBed.inject(PushNotifications);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  }
  async function ready(key = publicKey, role = 'OWNER', household = 'h') {
    http
      .expectOne('/api/v1/households/' + household + '/push-subscriptions/vapid-public-key')
      .flush({ publicKey: key });
    http.expectOne('/api/v1/me').flush({ username: 'olda' });
    http
      .expectOne('/api/v1/households/' + household + '/members')
      .flush([{ username: 'olda', active: true, role }]);
    await fixture.whenStable();
    fixture.detectChanges();
  }
  function registration(status = 201) {
    const req = http.expectOne('/api/v1/households/h/push-subscriptions');
    expect(req.request.headers.get('Authorization')).toBe(TestBed.inject(Session).authorization());
    expect(req.request.url.startsWith('/api/v1/')).toBe(true);
    expect(req.request.body).toMatchObject({
      endpoint: 'https://push.example/device',
      p256dh: 'real-browser-key',
      auth: 'real-browser-secret',
      deviceName: 'Chrome en Android',
    });
    req.flush(
      { active: true, householdId: 'h', installationId: req.request.body.installationId },
      { status, statusText: 'Created' },
    );
    return req.request.body.installationId;
  }
  afterEach(() => {
    http?.verify();
    fixture?.destroy();
    TestBed.resetTestingModule();
  });
  it('muestra no compatible sin solicitar permiso ni crear un registro', async () => {
    setup(false);
    await ready();
    await push.activate();
    expect(fixture.nativeElement.textContent).toContain('No compatible');
    expect(sw.requestSubscription).not.toHaveBeenCalled();
  });
  it('no vuelve a pedir un permiso bloqueado', async () => {
    setup(true, null, 'denied');
    await ready();
    await push.activate();
    expect(fixture.nativeElement.textContent).toContain('Permiso bloqueado');
    expect(sw.requestSubscription).not.toHaveBeenCalled();
  });
  it('rechaza VAPID inválida antes del permiso o POST', async () => {
    setup();
    await ready('not-a-key');
    await push.activate();
    expect(push.error()).toContain('clave pública');
    expect(sw.requestSubscription).not.toHaveBeenCalled();
  });
  it('crea una suscripción con gesto, bloquea dobles envíos y persiste UUID', async () => {
    setup();
    await ready();
    expect(sw.requestSubscription).not.toHaveBeenCalled();
    const first = push.activate();
    const duplicate = push.activate();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Activando');
    expect(fixture.nativeElement.querySelector('button.primary').disabled).toBe(true);
    await Promise.resolve();
    const id = registration();
    await first;
    await duplicate;
    expect(push.registered()).toBe(true);
    expect(sw.requestSubscription).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('bank.push.installation')).toBe(id);
    expect(localStorage.getItem('bank.push.last-registration') ?? '').not.toContain(
      'real-browser-secret',
    );
    const second = push.activate();
    expect(registration()).toBe(id);
    await second;
    push.reopen();
    fixture.detectChanges();
    expect(push.registered()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('registro remoto no verificado');
  });
  it('reutiliza una suscripción real y no solicita permiso otra vez', async () => {
    setup(true, subscription(), 'granted');
    await ready();
    const result = push.activate();
    registration();
    await result;
    expect(sw.requestSubscription).not.toHaveBeenCalled();
    expect(push.registered()).toBe(true);
  });
  it('rechaza claves faltantes sin enviar un registro ficticio', async () => {
    setup(true, subscription(false), 'granted');
    await ready();
    await push.activate();
    expect(push.error()).toContain('suscripción completa');
    expect(push.registered()).toBe(false);
  });
  for (const status of [401, 403, 404, 500])
    it('conserva la suscripción tras HTTP ' + status, async () => {
      setup(true, subscription(), 'granted');
      await ready();
      const result = push.activate();
      http
        .expectOne('/api/v1/households/h/push-subscriptions')
        .flush({}, { status, statusText: 'Failure' });
      await result;
      expect(push.error()).not.toBe('');
      expect(push.subscription()).not.toBeNull();
      expect(push.registered()).toBe(false);
    });
  it('solo OWNER activo puede solicitar la prueba; 202 sin body significa aceptación', async () => {
    setup();
    await ready();
    expect(fixture.nativeElement.textContent).toContain('Enviar notificación de prueba');
    const pending = push.sendTest();
    await push.sendTest();
    const req = http.expectOne('/api/v1/households/h/push-subscriptions/test-notification');
    expect(req.request.body.metadata.eventType).toBe('bank.notification.test');
    req.flush(null, { status: 202, statusText: 'Accepted' });
    await pending;
    expect(push.testNotice()).toContain('Solicitud aceptada por BANK');
    expect(push.testNotice()).toContain('No confirma la entrega');
  });
  it('no muestra prueba para EDITOR y aísla cambio de hogar y cierre de sesión', async () => {
    setup();
    await ready(publicKey, 'EDITOR');
    expect(fixture.nativeElement.textContent).not.toContain('Enviar notificación de prueba');
    await push.sendTest();
    TestBed.inject(HouseholdStore).householdId.set('other');
    fixture.detectChanges();
    await ready(publicKey, 'VIEWER', 'other');
    expect(push.owner()).toBe(false);
    expect(push.registered()).toBe(false);
    TestBed.inject(Session).clear();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Inicia sesión');
    expect(sw.unsubscribe).not.toHaveBeenCalled();
  });
  it('no registra una suscripción pendiente en otro usuario u hogar', async () => {
    setup();
    await ready();
    let resolve!: (sub: PushSubscription) => void;
    sw.requestSubscription.mockImplementation(
      () => new Promise<PushSubscription>((r) => (resolve = r)),
    );
    const pending = push.activate();
    TestBed.inject(Session).clear();
    fixture.detectChanges();
    await fixture.whenStable();
    resolve(subscription());
    await pending;
    expect(push.registered()).toBe(false);
  });
  it('invalida confirmación local cuando cambia la suscripción; nunca hace POST automático', async () => {
    setup(true, subscription(), 'granted');
    await ready();
    const pending = push.activate();
    registration();
    await pending;
    changes.next({ oldSubscription: subscription(), newSubscription: null });
    expect(push.registered()).toBe(false);
    expect(push.notice()).toContain('cambió');
  });
  it('rota la clave únicamente durante una activación explícita', async () => {
    const existing = subscription();
    Object.defineProperty(existing, 'options', {
      value: { applicationServerKey: new Uint8Array([1, 2]).buffer },
    });
    setup(true, existing, 'granted');
    await ready();
    expect(sw.unsubscribe).not.toHaveBeenCalled();
    const pending = push.activate();
    await Promise.resolve();
    await Promise.resolve();
    registration();
    await pending;
    expect(sw.unsubscribe).toHaveBeenCalledTimes(1);
    expect(sw.requestSubscription).toHaveBeenCalledTimes(1);
  });
  it('bloquea acciones inmediatamente al cambiar de hogar, antes de refrescar permisos', async () => {
    setup(true, subscription(), 'granted');
    await ready();
    TestBed.inject(HouseholdStore).householdId.set('other');
    expect(push.owner()).toBe(false);
    await push.sendTest();
    await push.activate();
    fixture.detectChanges();
    await ready(publicKey, 'VIEWER', 'other');
  });
  it('al reabrir detecta suscripción sin afirmar una consulta remota ni repetir el POST', async () => {
    setup(true, subscription(), 'granted');
    await ready();
    const pending = push.activate();
    registration();
    await pending;
    fixture.destroy();
    fixture = TestBed.createComponent(Notifications);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('registro remoto no verificado');
    expect(push.registered()).toBe(false);
  });
  it('ignora URLs arbitrarias al recibir un clic en un cliente abierto', async () => {
    setup();
    await ready();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    clicks.next({ notification: { data: { url: 'https://malicious.example' } } });
    expect(navigate).toHaveBeenCalledWith('/dashboard');
  });
});
