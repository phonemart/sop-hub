/* Shell is refreshed on every deploy; manual pages are cached the first time
   they are opened, so a manual you have read once works with no signal. */
const V = 'sop-v1';
const SHELL = ['./', 'index.html', 'style.css', 'app.js', 'data.js', 'manifest.webmanifest'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(V).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET' || new URL(request.url).origin !== location.origin) return;

  const isAsset = /\/assets\/.*\.(webp|pdf)$/.test(request.url);

  if (isAsset) {
    // cache-first: manuals never change under you, and this is what makes them work offline
    e.respondWith(caches.match(request).then((hit) => hit || fetch(request).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(V).then((c) => c.put(request, copy)); }
      return res;
    })));
  } else {
    // network-first for the shell, so a redeploy lands immediately when online
    e.respondWith(fetch(request).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(V).then((c) => c.put(request, copy)); }
      return res;
    }).catch(() => caches.match(request).then((hit) => hit || caches.match('index.html'))));
  }
});
