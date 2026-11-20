/* Offline cache for the Dalian trip page. The build stamps VERSION so each deploy refreshes the cache. */
const VERSION = "20261121005442";
const CACHE = "dalian-" + VERSION;
const CORE = [
  "./", "./index.html", "./manifest.webmanifest", "./vendor/supabase.js",
  "./icon.svg", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png",
  "./images/countdown.jpg",
  "./images/fishmarket.jpg",
  "./images/lingjiao.jpg",
  "./images/mall.jpg",
  "./images/ride.jpg",
  "./images/tram.jpg",
  "./images/wharf.jpg",
  "./images/xinghai.jpg",
  "./images/zhongshan.jpg",
  "./fonts/fonts.css",
  "./fonts/ibmplexmono-latin-0.woff2",
  "./fonts/mali-latin-2.woff2",
  "./fonts/mali-latin-4.woff2",
  "./fonts/mali-latin-6.woff2",
  "./fonts/mali-thai-1.woff2",
  "./fonts/mali-thai-3.woff2",
  "./fonts/mali-thai-5.woff2",
  "./fonts/notosansthai-latin-8.woff2",
  "./fonts/notosansthai-thai-7.woff2"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("dalian-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Live data (hearts, expenses) always goes to the network.
  if (url.hostname.endsWith("supabase.co")) return;

  // The page itself: try the network first so updates show, fall back to the saved copy offline.
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put("./index.html", copy));
        return res;
      }).catch(() => caches.match("./index.html").then((r) => r || caches.match("./")))
    );
    return;
  }

  // Google Fonts: use the saved copy, refresh it in the background.
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(
      caches.open(CACHE).then((c) => c.match(req).then((hit) => {
        const net = fetch(req).then((res) => { c.put(req, res.clone()); return res; }).catch(() => hit);
        return hit || net;
      }))
    );
    return;
  }

  // Everything else on this site: saved copy first, then the network.
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
        return res;
      }))
    );
  }
});
