// The demo's service worker (tools/sync.mjs copies it to /sw.js). Its one
// job: answer fake/uploads/... from the Cache API, where fake/backend.js puts
// the files you upload. Everything else goes to the network untouched.
const UPLOADS = 'xoxd-demo-uploads';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || !url.pathname.includes('/fake/uploads/')) return;
  event.respondWith(
    caches
      .open(UPLOADS)
      .then((cache) => cache.match(url.href))
      .then((hit) => hit || new Response('Not found', { status: 404 })),
  );
});
