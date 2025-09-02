const CACHE_NAME = 'sales-system-v1';
const OFFLINE_URL = '/offline.html';

// Files to cache for offline functionality
const CACHE_URLS = [
  '/',
  '/dashboard',
  '/login',
  '/products',
  '/sales',
  '/employees',
  '/offline.html',
  '/manifest.json',
  // Add static assets
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  // CSS and JS will be cached dynamically
];

// API endpoints that should work offline (with cached data)
const CACHE_API_PATTERNS = [
  '/api/products',
  '/api/users',
  '/api/sales'
];

// Install event - cache essential resources
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Install event');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[ServiceWorker] Caching app shell');
        return cache.addAll(CACHE_URLS);
      })
      .then(() => {
        // Take control immediately
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[ServiceWorker] Cache failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activate event');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[ServiceWorker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        // Take control of all pages
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle different types of requests with appropriate caching strategies
  
  // 1. Handle navigation requests (pages)
  if (request.mode === 'navigate') {
    event.respondWith(
      networkFirstThenCache(request)
        .catch(() => {
          // If both network and cache fail, show offline page
          return caches.match(OFFLINE_URL);
        })
    );
    return;
  }

  // 2. Handle API requests
  if (url.pathname.startsWith('/api/')) {
    // Check if this API should be cached
    const shouldCache = CACHE_API_PATTERNS.some(pattern => 
      url.pathname.startsWith(pattern)
    );

    if (shouldCache) {
      // For GET requests, use cache-first strategy
      if (request.method === 'GET') {
        event.respondWith(cacheFirstThenNetwork(request));
      } else {
        // For POST/PUT/DELETE, use network-only but cache successful GET responses
        event.respondWith(networkOnlyWithBackgroundSync(request));
      }
    } else {
      // Network-only for non-cacheable API requests
      event.respondWith(fetch(request));
    }
    return;
  }

  // 3. Handle static assets (CSS, JS, images)
  if (request.destination === 'style' || 
      request.destination === 'script' || 
      request.destination === 'image') {
    event.respondWith(cacheFirstThenNetwork(request));
    return;
  }

  // 4. Default: network-first for everything else
  event.respondWith(networkFirstThenCache(request));
});

// Caching strategies

// Network-first, then cache (good for dynamic content)
async function networkFirstThenCache(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Clone the response before caching
      const responseClone = networkResponse.clone();
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, responseClone);
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[ServiceWorker] Network failed, trying cache:', error);
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

// Cache-first, then network (good for static assets)
async function cacheFirstThenNetwork(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    // Return cached version immediately
    return cachedResponse;
  }
  
  // Not in cache, fetch from network
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache the new response
      const responseClone = networkResponse.clone();
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, responseClone);
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[ServiceWorker] Network and cache failed:', error);
    throw error;
  }
}

// Network-only with background sync for write operations
async function networkOnlyWithBackgroundSync(request) {
  try {
    const response = await fetch(request);
    
    // If successful and it's a GET response, cache it
    if (response.ok && request.method === 'GET') {
      const responseClone = response.clone();
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, responseClone);
    }
    
    return response;
  } catch (error) {
    // For failed write operations, we could implement background sync
    console.error('[ServiceWorker] Network request failed:', error);
    
    // TODO: Implement background sync for failed requests
    // This would store the request and retry when network is available
    
    throw error;
  }
}

// Background sync event (for retrying failed requests)
self.addEventListener('sync', (event) => {
  console.log('[ServiceWorker] Background sync:', event.tag);
  
  if (event.tag === 'retry-failed-requests') {
    event.waitUntil(retryFailedRequests());
  }
});

async function retryFailedRequests() {
  // TODO: Implement retry logic for failed requests
  // This would read from IndexedDB and retry stored requests
  console.log('[ServiceWorker] Retrying failed requests...');
}

// Push notification event (for future enhancement)
self.addEventListener('push', (event) => {
  console.log('[ServiceWorker] Push received:', event);
  
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-96x96.png',
      vibrate: [200, 100, 200],
      data: data.data,
      actions: data.actions || []
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[ServiceWorker] Notification clicked:', event);
  
  event.notification.close();
  
  // Handle notification action
  if (event.action) {
    // Handle specific action
    console.log('[ServiceWorker] Notification action:', event.action);
  }
  
  // Navigate to the app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if app is already open
        for (let client of clientList) {
          if (client.url.includes(self.location.origin)) {
            return client.focus();
          }
        }
        
        // Open new window if app is not open
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
  );
});

// Message event (for communication with main app)
self.addEventListener('message', (event) => {
  console.log('[ServiceWorker] Message received:', event.data);
  
  if (event.data && event.data.type) {
    switch (event.data.type) {
      case 'SKIP_WAITING':
        self.skipWaiting();
        break;
      case 'CACHE_UPDATE':
        // Force cache update
        event.waitUntil(updateCache());
        break;
      default:
        console.log('[ServiceWorker] Unknown message type:', event.data.type);
    }
  }
});

async function updateCache() {
  console.log('[ServiceWorker] Updating cache...');
  const cache = await caches.open(CACHE_NAME);
  await cache.addAll(CACHE_URLS);
  console.log('[ServiceWorker] Cache updated');
}