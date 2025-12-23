/**
 * 🔥 KILL SWITCH SERVICE WORKER
 * Version: 2025-12-23-ULTIMATE
 */

const KILL_VERSION = 'rigflow-kill-2025-12-23';

console.log('🔥🔥🔥 SW KILL VERSION LOADED:', KILL_VERSION);

// Install: sofort übernehmen
self.addEventListener('install', (event) => {
  console.log('[SW KILL] Installing', KILL_VERSION);
  self.skipWaiting();
});

// Activate: ALLES löschen
self.addEventListener('activate', (event) => {
  console.log('[SW KILL] Activating and nuking everything');

  event.waitUntil(
    (async () => {
      // 🔥 DELETE ALL CACHES
      const keys = await caches.keys();
      console.log('[SW KILL] Deleting caches:', keys);
      await Promise.all(keys.map(key => caches.delete(key)));

      // 🔥 CLAIM ALL CLIENTS
      await self.clients.claim();

      // 🔥 FORCE RELOAD ALL OPEN TABS / PWAs
      const clients = await self.clients.matchAll({ 
        type: 'window',
        includeUncontrolled: true 
      });
      
      console.log('[SW KILL] Found clients:', clients.length);
      
      for (const client of clients) {
        console.log('[SW KILL] Reloading client:', client.url);
        client.postMessage({ type: 'FORCE_RELOAD' });
        
        // Backup: auch per navigate
        try {
          client.navigate(client.url + '?sw-kill=' + Date.now());
        } catch (e) {
          console.log('[SW KILL] Navigate failed, client will use postMessage');
        }
      }

      console.log('[SW KILL] ✅ Done. Old SWs are dead.');
    })()
  );
});

// Fetch: PURE NETWORK (kein Cache!)
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});

// Message Handler
self.addEventListener('message', (event) => {
  console.log('[SW KILL] Message received:', event.data);
  
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('[SW KILL] Service Worker script executed');