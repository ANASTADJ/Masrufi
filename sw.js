// Service worker: يجعل التطبيق يعمل بدون إنترنت ويحدّث نفسه عند توفر نسخة جديدة.
// غيّر رقم VERSION عند كل تحديث للملفات لإجبار الهواتف على أخذ النسخة الجديدة.
const VERSION = 'masrufi-v1';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png'];
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // الخطوط: من الذاكرة أولاً مع تحديثها في الخلفية
  if (FONT_HOSTS.includes(url.hostname)) {
    e.respondWith(
      caches.open(VERSION).then(async c => {
        const hit = await c.match(req);
        const net = fetch(req).then(r => { c.put(req, r.clone()); return r; }).catch(() => hit);
        return hit || net;
      })
    );
    return;
  }

  // أي طلب خارجي آخر (Google Drive وتسجيل الدخول): لا نتدخل فيه
  if (url.origin !== location.origin) return;

  // ملفات التطبيق: من الإنترنت أولاً (لتصل التحديثات)، ثم من الذاكرة عند انقطاعه
  e.respondWith(
    fetch(req)
      .then(r => { const copy = r.clone(); caches.open(VERSION).then(c => c.put(req, copy)); return r; })
      .catch(() => caches.match(req).then(r => r || caches.match('index.html')))
  );
});
