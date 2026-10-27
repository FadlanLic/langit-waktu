// Langit Waktu: file aplikasi diambil dari jaringan lebih dulu (supaya pembaruan langsung terlihat),
// lalu jatuh ke cache bila offline atau jaringan lambat (> 3 detik).
const CACHE = 'langit-waktu-v2';
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(FILES.map(f => c.add(new Request(f, { cache: 'reload' })))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function networkFirst(req) {
  return new Promise(resolve => {
    let settled = false;
    const done = v => { if (!settled) { settled = true; resolve(v); } };
    const timer = setTimeout(() => {
      caches.match(req, { ignoreSearch: true }).then(hit => { if (hit) done(hit); });
    }, 3000);
    fetch(req).then(res => {
      clearTimeout(timer);
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      done(res);
    }).catch(() => {
      clearTimeout(timer);
      caches.match(req, { ignoreSearch: true }).then(hit => done(hit || caches.match('index.html')));
    });
  });
}

function cacheFirst(req) {
  return caches.match(req).then(hit => hit || fetch(req).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  }));
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);
  if (u.origin === location.origin) e.respondWith(networkFirst(req));
  else if (u.host === 'fonts.googleapis.com' || u.host === 'fonts.gstatic.com') e.respondWith(cacheFirst(req));
});
