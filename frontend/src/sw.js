// PunchUp Service Worker - Exclusively scoped to the PunchUp origin
// Handles Web Push notifications for PunchUp task reminders and ongoing Focus Timer notifications

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle incoming Web Push notifications (Task reminders)
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
    renotify: payload.tag !== 'punchup-focus-timer',
    silent: payload.silent || false,
    requireInteraction: payload.requireInteraction || false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle messages from the client window (Focus timer updates)
self.addEventListener('message', (event) => {
  if (!event.data) return;

  const { type, title, options } = event.data;

  if (type === 'SHOW_FOCUS_TIMER_NOTIFICATION') {
    event.waitUntil(
      self.registration.showNotification(title || 'PunchUp', {
        ...options,
        icon: '/assets/logo.png',
        badge: '/assets/logo.png',
        tag: 'punchup-focus-timer',
        data: { url: '/tasks', type: 'focus-timer' },
      })
    );
  } else if (type === 'CLOSE_FOCUS_TIMER_NOTIFICATION') {
    event.waitUntil(
      self.registration.getNotifications({ tag: 'punchup-focus-timer' }).then((notifications) => {
        notifications.forEach((notification) => notification.close());
      })
    );
  }
});

// Handle notification click: Open/focus PunchUp Focus section safely
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/tasks';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Focus existing PunchUp window if on or containing targetUrl
      for (const client of windowClients) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      // If any PunchUp window is open, navigate to targetUrl and focus
      for (const client of windowClients) {
        if ('focus' in client) {
          if ('navigate' in client) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      // Otherwise open a new window to targetUrl
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

