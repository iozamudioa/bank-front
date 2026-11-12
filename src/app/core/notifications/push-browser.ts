import { InjectionToken, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
export interface PushBrowser {
  supported: boolean;
  permission(): NotificationPermission;
  storage(): Storage;
  deviceName: string;
}
export const PUSH_BROWSER = new InjectionToken<PushBrowser>('PUSH_BROWSER', {
  providedIn: 'root',
  factory: () => {
    const browser = isPlatformBrowser(inject(PLATFORM_ID));
    const ua = browser ? navigator.userAgent : '';
    const name = /Edg\//.test(ua)
      ? 'Edge'
      : /Firefox\//.test(ua)
        ? 'Firefox'
        : /Chrome\//.test(ua)
          ? 'Chrome'
          : /Safari\//.test(ua)
            ? 'Safari'
            : 'Navegador';
    const platform = /Android/.test(ua)
      ? 'Android'
      : /iPhone|iPad/.test(ua)
        ? 'iOS/iPadOS'
        : /Windows/.test(ua)
          ? 'Windows'
          : /Macintosh/.test(ua)
            ? 'macOS'
            : 'este dispositivo';
    return {
      supported:
        browser &&
        globalThis.isSecureContext === true &&
        'serviceWorker' in navigator &&
        'PushManager' in globalThis &&
        'Notification' in globalThis,
      permission: () =>
        browser && 'Notification' in globalThis ? Notification.permission : 'default',
      storage: () => {
        if (!browser) throw new Error('Sin almacenamiento');
        return localStorage;
      },
      deviceName: name + ' en ' + platform,
    };
  },
});
