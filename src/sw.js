import { precacheAndRoute } from "workbox-precaching";

precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener("push", (event) => {
  let data = { title: "🐷 Mealheiro", body: "Já atualizaste hoje?" };
  try { if (event.data) data = event.data.json(); } catch { /* usa o default */ }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clientList) => {
      for (const client of clientList) { if ("focus" in client) return client.focus(); }
      if (self.clients.openWindow) return self.clients.openWindow("/");
    })
  );
});

self.skipWaiting();
self.addEventListener("activate", () => self.clients.claim());
