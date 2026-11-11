/* プッシュ通知を受け取って表示するだけの Service Worker(画面の読み込みやキャッシュには関わらない) */
self.addEventListener("install", function () { self.skipWaiting(); });
self.addEventListener("activate", function (e) { e.waitUntil(self.clients.claim()); });
self.addEventListener("push", function (e) {
  var d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { body: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.registration.showNotification(d.title || "NRボックス・スクラップ搬出", {
    body: d.body || "お知らせがあります", tag: d.tag || "nr", renotify: true,
    icon: "icon-192.png", badge: "icon-192.png", data: { url: d.url || self.registration.scope }
  }));
});
self.addEventListener("notificationclick", function (e) {
  e.notification.close();
  var url = (e.notification.data && e.notification.data.url) || self.registration.scope;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (list) {
    for (var i = 0; i < list.length; i++) { if (list[i].url.indexOf(url) === 0 && "focus" in list[i]) return list[i].focus(); }
    return self.clients.openWindow(url);
  }));
});
