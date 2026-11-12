/* BANK Web Push bridge: support Raven's legacy payload without replacing Angular's PWA runtime. */
const BANK_PUSH_MARKER = '__bankRavenPush';

function bankNotificationUrl(candidate) {
  // Never let a notification redirect to a foreign origin or protocol.
  if (typeof candidate !== 'string' || !candidate.startsWith('/') ||
      candidate.startsWith('//') || candidate.includes('\\') ||
      /[\r\n]/.test(candidate)) return '/dashboard';
  return candidate;
}

// Register handlers BEFORE Angular's worker, so Raven payloads can be consumed
// without the Angular handler also processing them.
self.addEventListener('push', (event) => {
  let payload;
  try {
    payload = event.data ? event.data.json() : null;
  } catch {
    return; // Let Angular handle its own payloads.
  }
  if (!payload || typeof payload !== 'object' || payload.notification ||
      typeof payload.message !== 'string') return;

  event.stopImmediatePropagation();
  const title = typeof payload.title === 'string' && payload.title.trim()
    ? payload.title : 'BANK';
  const body = payload.message || 'Nueva notificación';
  const url = bankNotificationUrl(payload.url);
  const options = {
    body,
    icon: '/icons/icon-192.png',
    data: { [BANK_PUSH_MARKER]: true, url },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  if (!event.notification?.data?.[BANK_PUSH_MARKER]) return;

  event.stopImmediatePropagation();
  event.notification.close();
  const target = new URL(bankNotificationUrl(event.notification.data.url), self.location.origin);
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const current = windows.find((client) => new URL(client.url).origin === target.origin);
    if (current) {
      await current.focus();
      if ('navigate' in current) await current.navigate(target.href);
      return;
    }
    await self.clients.openWindow(target.href);
  })());
});

// Angular still owns installation, caching, fetch, updates, and Angular-style pushes.
importScripts('./ngsw-worker.js');
