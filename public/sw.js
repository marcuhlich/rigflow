/**
 * Service Worker for RigFlow
 * Handles background sync, caching, and offline support
 */

const CACHE_NAME = 'rigflow-v1';
const RUNTIME_CACHE = 'rigflow-runtime';
const API_CACHE = 'rigflow-api';

console.log('[SW] Service Worker Version:', SW_VERSION);

// Install event
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker');
  // Entferne self.skipWaiting() hier - wir wollen kontrolliert updaten
  // self.skipWaiting(); 
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker');

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            return (
              cacheName !== CACHE_NAME &&
              cacheName !== RUNTIME_CACHE &&
              cacheName !== API_CACHE
            );
          })
          .map((cacheName) => {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    }).then(() => {
      // Claim all clients sofort nach Aktivierung
      console.log('[SW] Claiming all clients');
      return self.clients.claim();
    })
  );
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

  // Static assets - network only (let browser handle caching)
  event.respondWith(
    fetch(request).catch(() => {
      return caches.match(request);
    })
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