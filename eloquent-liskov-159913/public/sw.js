/**
 * ZIVO Service Worker
 * Handles push notifications, caching, and offline support
 */

// Import Workbox from CDN
importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.4.1/workbox-sw.js');

// Precache manifest (injected by vite-plugin-pwa)
const precacheManifest = self.__WB_MANIFEST;

// Configure Workbox
if (workbox) {
  console.log('[SW] Workbox loaded successfully');

  workbox.precaching.precacheAndRoute(precacheManifest || []);

  // Cache Google Fonts stylesheets
  workbox.routing.registerRoute(
    /^https:\/\/fonts\.googleapis\.com\/.*/i,
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: 'google-fonts-stylesheets',
    })
  );

  // Cache Google Fonts webfonts
  workbox.routing.registerRoute(
    /^https:\/\/fonts\.gstatic\.com\/.*/i,
    new workbox.strategies.CacheFirst({
      cacheName: 'google-fonts-webfonts',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 30,
          maxAgeSeconds: 60 * 60 * 24 * 365,
        }),
      ],
    })
  );

  // Cache images (local assets only — cross-origin images are handled separately)
  workbox.routing.registerRoute(
    /\.(?:png|jpg|jpeg|svg|gif|webp|avif)$/i,
    new workbox.strategies.CacheFirst({
      cacheName: 'images-cache',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 200,
          maxAgeSeconds: 60 * 60 * 24 * 60, // 60 days
          purgeOnQuotaError: true,
        }),
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200],
        }),
      ],
    })
  );

  // Cache Supabase Storage media (user avatars, post images/videos thumbnails)
  // StaleWhileRevalidate: show cached instantly, refresh in background.
  workbox.routing.registerRoute(
    ({ url }) =>
      url.hostname.endsWith('.supabase.co') &&
      url.pathname.includes('/storage/v1/object/public/'),
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: 'supabase-storage-cache',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 300,
          maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
          purgeOnQuotaError: true,
        }),
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200],
        }),
      ],
    })
  );

  // Always fetch navigations from the network so published users don't get a stale app shell.
  // Skip OAuth callback routes — must always hit the network.
  const navigationHandler = workbox.precaching.createHandlerBoundToURL('/index.html');
  workbox.routing.registerRoute(
    ({ request, url }) => {
      if (request.mode !== 'navigate') return false;
      if (url.pathname.startsWith('/~oauth')) return false;
      return true;
    },
    async (options) => {
      try {
        return await new workbox.strategies.NetworkOnly().handle(options);
      } catch (error) {
        console.debug('[SW] Navigation request fell back to precache', {
          url: options.request.url,
          error,
        });
        return navigationHandler(options);
      }
    }
  );

  // NetworkFirst for Supabase API/auth/realtime calls (not storage — handled above)
  workbox.routing.registerRoute(
    ({ url }) =>
      url.hostname.endsWith('.supabase.co') &&
      !url.pathname.includes('/storage/v1/object/public/'),
    new workbox.strategies.NetworkFirst({
      cacheName: 'api-cache',
      networkTimeoutSeconds: 4, // was 5s — fail faster on mobile
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 50,
          maxAgeSeconds: 60 * 5, // 5 min stale fallback
        }),
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200],
        }),
      ],
    })
  );
} else {
  console.log('[SW] Workbox failed to load');
}

// =============================================
// PUSH NOTIFICATION HANDLERS
// =============================================

self.addEventListener('push', (event) => {
  let data = {};

  try {
    data = event.data?.json() || {};
  } catch (e) {
    data = { title: 'ZIVO', body: event.data?.text() || 'You have a new notification' };
  }

  const rawData = data.data && typeof data.data === 'object' ? data.data : {};
  const nestedData = rawData.data && typeof rawData.data === 'object' ? rawData.data : {};
  const notificationData = { ...nestedData, ...rawData };
  const type = String(notificationData.type || notificationData.notification_type || data.type || '').toLowerCase();
  const isIncomingCall = type === 'incoming_call';
  const callerId = notificationData.caller_id || notificationData.sender_id || notificationData.from_user_id;
  const callId = notificationData.call_id || notificationData.id || '';

  const options = {
    body: data.body || '',
    icon: notificationData.caller_avatar || data.image_url || '/pwa-icons/icon-192x192.png',
    badge: '/pwa-icons/icon-192x192.png',
    vibrate: isIncomingCall ? [280, 120, 280, 700, 280, 120, 280] : [100, 50, 100],
    data: notificationData,
    tag: data.tag || (isIncomingCall ? `incoming-call-${callId || callerId || 'unknown'}` : (notificationData.type || 'default')),
    renotify: true,
    requireInteraction: isIncomingCall || data.requireInteraction || false,
    actions: isIncomingCall
      ? [
          { action: 'answer', title: 'Answer' },
          { action: 'message', title: 'Message' },
        ]
      : (data.actions || []),
    silent: false,
    timestamp: Date.now(),
  };

  event.waitUntil(
    self.registration.showNotification(data.title || (isIncomingCall ? 'Incoming ZIVO call' : 'ZIVO'), options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const type = data.type || data.notification_type || '';
  let urlToOpen = '/';

  switch (type) {
    // Rides
    case 'driver_assigned':
    case 'driver_en_route':
    case 'driver_arrived':
    case 'trip_started':
      urlToOpen = data.trip_id ? `/rides/hub?tab=tracking` : '/rides/hub?tab=tracking';
      break;
    case 'trip_completed':
    case 'ride_completed':
      urlToOpen = '/rides/hub?tab=history';
      break;
    case 'ride_cancelled':
    case 'ride_no_drivers':
      urlToOpen = '/rides/hub';
      break;

    // Chat & Calls
    case 'chat_message':
    case 'new_message':
      urlToOpen = data.sender_id ? `/chat?with=${data.sender_id}` : '/chat';
      break;
    case 'incoming_call':
      {
        const callerId = data.caller_id || data.sender_id || data.from_user_id || '';
        const callId = data.call_id || '';
        const params = new URLSearchParams();
        if (callerId) params.set('with', callerId);
        if (callId) params.set('incomingCall', callId);
        params.set('call', event.action === 'answer' ? 'answer' : '1');
        urlToOpen = `/chat?${params.toString()}`;
      }
      break;

    // Orders / Eats
    case 'order_placed':
    case 'order_status_update':
    case 'order_ready':
    case 'order_delivered':
      urlToOpen = data.order_id ? `/eats/order/${data.order_id}` : '/eats';
      break;

    // Flights & Travel
    case 'price_drop':
    case 'flight_price_alert':
    case 'flight_status_update':
      urlToOpen = data.url || '/flights';
      break;

    // Hotels & Lodging
    case 'booking_update':
    case 'reservation_confirmed':
    case 'check_in_reminder':
      urlToOpen = data.booking_id ? `/bookings/${data.booking_id}` : '/bookings';
      break;

    // Payments & Wallet
    case 'payment_update':
    case 'payment_failed':
    case 'wallet_credited':
      urlToOpen = '/rides/hub?tab=wallet';
      break;

    // Loyalty & Rewards
    case 'loyalty_reward':
    case 'miles_earned':
    case 'promo_code':
      urlToOpen = '/rides/hub?tab=loyalty';
      break;

    // Delivery
    case 'delivery_placed':
    case 'delivery_picked_up':
    case 'delivery_en_route':
    case 'delivery_completed':
      urlToOpen = data.delivery_id ? `/delivery/${data.delivery_id}` : '/delivery';
      break;

    // Support
    case 'support_reply':
      urlToOpen = data.ticket_id ? `/support/tickets/${data.ticket_id}` : '/support';
      break;

    // Admin Broadcast
    case 'admin_broadcast':
      urlToOpen = data.url || '/';
      break;

    // Grocery / Store
    case 'store_order_update':
      urlToOpen = data.order_id ? `/orders/${data.order_id}` : '/grocery';
      break;

    default:
      urlToOpen = data.url || '/';
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      for (const client of clientList) {
        if ('focus' in client && 'navigate' in client) {
          return client.focus().then(() => client.navigate(urlToOpen));
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

self.addEventListener('notificationclose', () => {});

// =============================================
// SERVICE WORKER LIFECYCLE
// =============================================

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      const keepCaches = [
        'google-fonts-stylesheets',
        'google-fonts-webfonts',
        'images-cache',
        'supabase-storage-cache',
        'api-cache',
        'local-images',
        'unsplash-images',
      ];

      if (workbox?.core?.cacheNames?.precache) {
        keepCaches.push(workbox.core.cacheNames.precache);
      }

      return Promise.all(
        cacheNames
          .filter((name) => !keepCaches.includes(name))
          .map((name) => caches.delete(name))
      );
    }).then(() => clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
