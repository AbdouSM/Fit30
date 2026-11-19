/* =========================================================
   Service Worker – لياقتي 30
   يعمل التطبيق بالكامل دون إنترنت بعد أول زيارة.
   عند تعديل أي ملف: غيّر رقم الإصدار في CACHE ليحصل الهاتف على التحديث.
   ========================================================= */
const CACHE = 'fit30-v1';

const CORE = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png'
];

const EXTERNAL = [
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js',
  'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(CORE);
    await Promise.allSettled(EXTERNAL.map(url => cache.add(new Request(url, { mode: 'cors' }))));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

function isCacheable(response) {
  return response && (response.ok || response.type === 'opaque');
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (!url.protocol.startsWith('http')) return;
  if (url.hostname.includes('youtube.com')) return;

  /* صفحات التنقل: من الكاش فوراً ثم التحديث في الخلفية */
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match('./index.html');
      const network = fetch(req).then(res => {
        if (res && res.ok) cache.put('./index.html', res.clone());
        return res;
      }).catch(() => null);
      return cached || (await network) || new Response('<h1 dir="rtl">غير متصل بالإنترنت</h1>', { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    })());
    return;
  }

  /* باقي الملفات: Stale-While-Revalidate */
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req, { ignoreSearch: url.origin === self.location.origin });
    const network = fetch(req).then(res => {
      if (isCacheable(res)) cache.put(req, res.clone());
      return res;
    }).catch(() => null);
    if (cached) {
      event.waitUntil(network);
      return cached;
    }
    const res = await network;
    return res || new Response('', { status: 504, statusText: 'Offline' });
  })());
});
