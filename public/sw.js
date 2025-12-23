/**
 * Service Worker for RigFlow
 * Handles background sync, caching, and offline support
 */

const CACHE_NAME = `rigflow-${self.registration.scope}-${Date.now()}`;
const RUNTIME_CACHE = 'rigflow-runtime';
const API_CACHE = 'rigflow-api';

console.log('🔥🔥🔥 SW KILL VERSION 2025-12-23 🔥🔥🔥');

// Install event
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker');
  self.skipWaiting();
});

// Activate event
sself.addEventListener('activate', (event) => {
  console.log('[SW] 🔥 KILL SWITCH ACTIVATE');

  event.waitUntil(
    (async () => {
      // 1️⃣ ALLE CACHES LÖSCHEN
      const cacheKeys = await caches.keys();
      await Promise.all(
        cacheKeys.map((key) => {
          console.log('[SW] Deleting cache:', key);
          return caches.delete(key);
        })
      );

      // 2️⃣ ALLE CLIENTS HOLEN
      const clientsArr = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      // 3️⃣ ALLE CLIENTS ZWANGS-RELOADEN
      for (const client of clientsArr) {
        console.log('[SW] Forcing reload:', client.url);
        client.navigate(client.url + '?sw-kill=' + Date.now());
      }
    })()
  );
});

// Handle messages from app
self.addEventListener('message', (event) => {
  const { type, data } = event.data || {};
  console.log('[SW] Message received:', type);

  // Handle app update request
  if (type === 'SKIP_WAITING') {
    console.log('[SW] Received SKIP_WAITING - activating new version immediately');
    self.skipWaiting();
    return;
  }

  // Handle notification request
  if (type === 'SHOW_NOTIFICATION') {
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/pwa-192x192.png',
      badge: data.badge || '/favicon-32x32.png',
      tag: data.tag || 'default',
      requireInteraction: data.requireInteraction || false,
    });
  }
});

// Fetch event - simplified
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome extensions and non-http(s)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return;
  }

  // API calls - network first
  if (url.pathname.includes('/rest/v1/')) {
    event.respondWith(
      fetch(request)
        .then((response) => response)
        .catch(() => {
          return caches.match(request).then((cached) => {
            return (
              cached ||
              new Response('Offline', { status: 503 })
            );
          });
        })
    );
    return;
  }

  /* // Static assets - network only (let browser handle caching)
  event.respondWith(
    fetch(request).catch(() => {
      return caches.match(request);
    })
  ); */

  // Static assets – FORCE NETWORK
  event.respondWith(fetch(request));
});

// Notification handlers
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed:', event.notification.tag);
});

console.log('[SW] Service Worker loaded');