/* Sır Bende: internetsiz açılış için basit önbellek.
   Sayfa ve simgeler yüklenince önbelleğe alınır. Sonraki açılışta önce önbellekten gelir, arkada güncellenir.
   Güncelleme sonrası eski sürüm bir kez daha görünebilir. Sürüm değiştirince V değerini artırın. */
var V = "sirbende-v1";
var CORE = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png", "icon-maskable-512.png", "apple-touch-icon.png"];
var FONT_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(V).then(function (c) { return c.addAll(CORE); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== V; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});
self.addEventListener("fetch", function (e) {
  var r = e.request;
  if (r.method !== "GET") return;
  var u = new URL(r.url);
  var same = u.origin === self.location.origin;
  if (!same && FONT_HOSTS.indexOf(u.hostname) < 0) return;
  e.respondWith(
    caches.open(V).then(function (cache) {
      var key = r.mode === "navigate" ? "index.html" : r;
      return cache.match(key, { ignoreSearch: true }).then(function (hit) {
        var net = fetch(r).then(function (res) {
          if (res && (res.ok || res.type === "opaque")) cache.put(key, res.clone());
          return res;
        }).catch(function () { return hit; });
        e.waitUntil(net.catch(function () {}));
        return hit || net;
      });
    })
  );
});
