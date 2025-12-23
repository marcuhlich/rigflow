/**
 * 🔥 AUTOMATIC KILL SWITCH SERVICE WORKER
 * Version: 2025-12-23-AUTO
 * Aktiviert sich selbst, ohne manuelle Klicks
 */

const KILL_VERSION = 'rigflow-kill-2025-12-23-AUTO';

console.log('🔥🔥🔥 SW KILL VERSION LOADED:', KILL_VERSION);

// Install: SOFORT übernehmen, kein Warten
self.addEventListener('install', (event) => {
  console.log('[SW KILL] Installing', KILL_VERSION);
  
  // Sofort aktivieren, nicht warten
  event.waitUntil(self.skipWaiting());
});

// Activate: ALLES löschen + ALLE Clients übernehmen
self.addEventListener('activate', (event) => {
  console.log('[SW KILL] 🔥 Activating and nuking everything');

  event.waitUntil(
    (async () => {
      // 1️⃣ DELETE ALL CACHES
      const keys = await caches.keys();
      console.log('[SW KILL] Deleting', keys.length, 'caches:', keys);
      await Promise.all(keys.map(key => caches.delete(key)));

      // 2️⃣ CLAIM ALL CLIENTS (übernimmt sofort alle Tabs/PWAs)
      await self.clients.claim();
      console.log('[SW KILL] Claimed all clients');

      // 3️⃣ FORCE RELOAD ALL CLIENTS
      const clients = await self.clients.matchAll({ 
        type: 'window',
        includeUncontrolled: true 
      });
      
      console.log('[SW KILL] Found', clients.length, 'client(s)');
      
      for (const client of clients) {
        console.log('[SW KILL] Force-reloading:', client.url);
        
        // Doppelte Strategie: postMessage + navigate
        client.postMessage({ 
          type: 'FORCE_RELOAD',
          version: KILL_VERSION 
        });
        
        // Backup: direkte Navigation
        setTimeout(() => {
          try {
            client.navigate(client.url + '?kill=' + Date.now());
          } catch (e) {
            console.log('[SW KILL] Navigate not possible, postMessage should work');
          }
        }, 100);
      }

      console.log('[SW KILL] ✅ Done. All caches deleted, all clients claimed.');
    })()
  );
});

// Fetch: PURE NETWORK (kein Cache, alles frisch vom Server)
self.addEventListener('fetch', (event) => {
  console.log('[SW KILL] Fetch:', event.request.url);
  event.respondWith(
    fetch(event.request).catch(() => {
      console.log('[SW KILL] Fetch failed (offline?)');
      return new Response('Offline - Kill-Switch active', { status: 503 });
    })
  );
});

// Message Handler
self.addEventListener('message', (event) => {
  console.log('[SW KILL] Message:', event.data);
  
  if (event.data?.type === 'SKIP_WAITING') {
    console.log('[SW KILL] Received SKIP_WAITING command');
    self.skipWaiting();
  }
});

console.log('[SW KILL] ✅ Script executed');