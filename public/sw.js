// Service Worker for BookLever - Offline Reading Support
const CACHE_NAME = 'booklever-v1';
const OFFLINE_CACHE = 'booklever-offline-v1';

// Files to cache for offline functionality
const STATIC_CACHE_URLS = [
  '/',
  '/library',
  '/login',
  '/offline',
  '/manifest.json'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        console.log('Service Worker: Installation complete');
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== OFFLINE_CACHE) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Activation complete');
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  event.respondWith(
    caches.match(request)
      .then((response) => {
        // Return cached version if available
        if (response) {
          console.log('Service Worker: Serving from cache:', request.url);
          return response;
        }

        // Try to fetch from network
        return fetch(request)
          .then((response) => {
            // Don't cache if not a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response
            const responseToCache = response.clone();

            // Cache the response for future use
            caches.open(CACHE_NAME)
              .then((cache) => {
                // Only cache certain types of requests
                if (shouldCacheRequest(request)) {
                  console.log('Service Worker: Caching new resource:', request.url);
                  cache.put(request, responseToCache);
                }
              });

            return response;
          })
          .catch(() => {
            // Network failed, try to serve offline page
            if (request.destination === 'document') {
              return caches.match('/offline');
            }
            
            // For other resources, return a basic offline response
            return new Response('Offline', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/plain'
              })
            });
          });
      })
  );
});

// Helper function to determine if a request should be cached
function shouldCacheRequest(request) {
  const url = new URL(request.url);
  
  // Cache API requests
  if (url.pathname.startsWith('/api/')) {
    return true;
  }
  
  // Cache static assets
  if (url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$/)) {
    return true;
  }
  
  // Cache book covers and thumbnails
  if (url.hostname.includes('drive.google.com') && url.pathname.includes('thumbnail')) {
    return true;
  }
  
  return false;
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync triggered:', event.tag);
  
  if (event.tag === 'reading-progress-sync') {
    event.waitUntil(syncReadingProgress());
  } else if (event.tag === 'bookmark-sync') {
    event.waitUntil(syncBookmarks());
  }
});

// Sync reading progress when back online
async function syncReadingProgress() {
  try {
    console.log('Service Worker: Syncing reading progress...');
    // Get pending reading progress from IndexedDB
    // This would be implemented with the actual sync logic
    console.log('Service Worker: Reading progress synced');
  } catch (error) {
    console.error('Service Worker: Failed to sync reading progress:', error);
  }
}

// Sync bookmarks when back online
async function syncBookmarks() {
  try {
    console.log('Service Worker: Syncing bookmarks...');
    // Get pending bookmarks from IndexedDB
    // This would be implemented with the actual sync logic
    console.log('Service Worker: Bookmarks synced');
  } catch (error) {
    console.error('Service Worker: Failed to sync bookmarks:', error);
  }
}

// Message handling for communication with main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (event.data && event.data.type === 'CACHE_BOOK') {
    // Cache a book for offline reading
    cacheBookForOffline(event.data.bookId, event.data.bookData);
  }
});

// Cache a book for offline reading
async function cacheBookForOffline(bookId, bookData) {
  try {
    const cache = await caches.open(OFFLINE_CACHE);
    const response = new Response(JSON.stringify(bookData), {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    await cache.put(`/offline-book/${bookId}`, response);
    console.log('Service Worker: Book cached for offline reading:', bookId);
  } catch (error) {
    console.error('Service Worker: Failed to cache book for offline:', error);
  }
}
