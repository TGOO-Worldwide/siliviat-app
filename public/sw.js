/**
 * Service Worker para TGOO Visitas PWA
 * Estratégias:
 * - Network-Only: APIs e páginas com dados do utilizador (sem cache)
 * - Cache-First: apenas assets estáticos (ícones, manifest, _next/static)
 */

const STATIC_CACHE = "tgoo-static-v2";

const STATIC_ASSETS = [
  "/manifest.webmanifest",
  "/icons/icon-192x192.svg",
  "/icons/icon-512x512.svg",
];

self.addEventListener("install", (event) => {
  console.log("[SW] Instalando Service Worker...");

  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log("[SW] Cacheando assets estáticos");
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.error("[SW] Erro ao cachear assets:", err);
        return Promise.resolve();
      });
    })
  );

  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("[SW] Ativando Service Worker...");

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE) {
            console.log("[SW] Removendo cache antigo:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );

  return self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET") {
    return;
  }

  if (url.origin !== self.location.origin) {
    return;
  }

  // APIs: nunca cachear (dados sempre frescos)
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkOnly(request));
    return;
  }

  // Chunks estáticos do Next.js: cache-first
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Ícones e manifest
  if (
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.webmanifest"
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Payloads RSC / navegação Next.js: nunca cachear
  if (
    request.headers.get("RSC") === "1" ||
    request.headers.get("Next-Router-Prefetch") === "1" ||
    url.pathname.startsWith("/_next/")
  ) {
    event.respondWith(networkOnly(request));
    return;
  }

  // Páginas da app (dados por utilizador): nunca cachear
  if (
    url.pathname.startsWith("/app/") ||
    url.pathname.startsWith("/admin/") ||
    url.pathname === "/"
  ) {
    event.respondWith(networkOnly(request));
    return;
  }

  event.respondWith(networkOnly(request));
});

async function networkOnly(request) {
  return fetch(request);
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);

  if (cached) {
    return cached;
  }

  const response = await fetch(request);

  if (response.status === 200) {
    cache.put(request, response.clone());
  }

  return response;
}

self.addEventListener("sync", (event) => {
  console.log("[SW] Sync event:", event.tag);

  if (event.tag === "sync-offline-events") {
    event.waitUntil(syncOfflineEvents());
  }
});

async function syncOfflineEvents() {
  console.log("[SW] Sincronizando eventos offline...");

  try {
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({
        type: "SYNC_REQUESTED",
        timestamp: Date.now(),
      });
    });
  } catch (error) {
    console.error("[SW] Erro ao sincronizar:", error);
  }
}

console.log("[SW] Service Worker carregado");
