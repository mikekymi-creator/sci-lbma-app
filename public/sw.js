// Private pages and API responses are deliberately never cached.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('push', event => {
  let data; try { data = event.data.json(); } catch { return; }
  event.waitUntil(self.registration.showNotification(data.title || 'SCI LBMA', {
    body: data.body || 'Une nouvelle activité vous attend au camp.',
    icon: '/icon-192.png', badge: '/icon-192.png', tag: data.tag || 'lbma',
    data: { url: data.url || '/' }
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || '/', self.location.origin);
  if (url.origin !== self.location.origin) return;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async clients => {
    for (const client of clients) if ('focus' in client) { await client.navigate(url.href); return client.focus(); }
    return self.clients.openWindow(url.href);
  }));
});
