/* ============================================================
   sw.js — Service Worker: يجعل التطبيق يعمل بلا إنترنت
   الاستراتيجية: تخزين مسبق لكل ملفات التطبيق (هيكل ثابت وصغير)،
   ثم الخدمة من الذاكرة أولًا مع تحديث خلفي هادئ.
   البيانات نفسها في localStorage ولا تمرّ من هنا إطلاقًا.
   ⚠️ ارفع رقم النسخة عند أي تعديل في الملفات لتُحدَّث النسخة المخزّنة.
   ============================================================ */

const VERSION = 'duyuni-v1';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/css/01-tokens.css',
  './assets/css/02-base.css',
  './assets/css/03-components.css',
  './assets/css/04-views.css',
  './assets/css/05-desktop.css',
  './assets/js/core/config.js',
  './assets/js/core/utils.js',
  './assets/js/core/format.js',
  './assets/js/core/store.js',
  './assets/js/core/calc.js',
  './assets/js/core/backup.js',
  './assets/js/core/router.js',
  './assets/js/ui/dom.js',
  './assets/js/ui/toast.js',
  './assets/js/ui/sheet.js',
  './assets/js/ui/widgets.js',
  './assets/js/forms/loan-form.js',
  './assets/js/forms/payment-form.js',
  './assets/js/forms/income-form.js',
  './assets/js/views/home.js',
  './assets/js/views/summary.js',
  './assets/js/views/loans.js',
  './assets/js/views/loan-detail.js',
  './assets/js/views/history.js',
  './assets/js/views/settings.js',
  './assets/js/app.js',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-maskable-512.png',
  './assets/icons/apple-touch-icon.png',
  './sample/example-backup.json'
];

/* التثبيت: خزّن كل الهيكل */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

/* التنشيط: احذف النسخ القديمة */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* الجلب: الذاكرة أولًا، ثم الشبكة، وتحديث هادئ في الخلفية */
self.addEventListener('fetch', (event) => {
  const req = event.request;

  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;

  // التنقّل: أعِد الصفحة المخزّنة فورًا (التطبيق يوجّه نفسه بالـhash)
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html').then((cached) => cached || fetch(req))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(VERSION).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);

      return cached || network;
    })
  );
});
