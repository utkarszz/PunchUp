// PunchUp Service Worker - Exclusively scoped to the PunchUp origin
// Handles Web Push notifications for PunchUp task reminders

self.addEventListener('install', (event) => {
  // Activate worker immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Claim all clients within PunchUp origin immediately
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload = {};
  try {
    payload = event.data.json();
  } catch (err) {
    payload = {
      title: 'PunchUp',
      body: event.data.text() || 'Task Reminder',
    };
  }

  const title = payload.title || 'PunchUp';
  const options = {
    body: payload.body || 'Task Reminder',
    icon: payload.icon || '/assets/logo.png',
    badge: payload.badge || '/assets/logo.png',
    data: payload.data || { url: '/tasks' },
    tag: payload.tag || 'punchup-task-reminder',
    renotify: true,
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/tasks';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Focus existing PunchUp window if open
      for (const client of windowClients) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
