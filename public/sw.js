/**
 * Service Worker para TGOO Visitas PWA
 * Estratégias: Cache-First para assets, Network-First para APIs
 */

const CACHE_NAME = "tgoo-visitas-v1";
const STATIC_CACHE = "tgoo-static-v1";
const DYNAMIC_CACHE = "tgoo-dynamic-v1";

// Assets para cachear na instalação
const STATIC_ASSETS = [
  "/",
  "/app/checkin",
  "/app/companies",
  "/app/dashboard",
  "/manifest.webmanifest",
  "/icons/icon-192x192.svg",
  "/icons/icon-512x512.svg",
];

// Instalar Service Worker e cachear assets estáticos
self.addEventListener("install", (event) => {
  console.log("[SW] Instalando Service Worker...");
  
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log("[SW] Cacheando assets estáticos");
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.error("[SW] Erro ao cachear assets:", err);
        // Não falhar se alguns assets não forem encontrados
        return Promise.resolve();
      });
    })
  );

  // Forçar ativação imediata
  self.skipWaiting();
});

// Ativar Service Worker e limpar caches antigos
self.addEventListener("activate", (event) => {
  console.log("[SW] Ativando Service Worker...");

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (
            cacheName !== STATIC_CACHE &&
            cacheName !== DYNAMIC_CACHE &&
            cacheName !== CACHE_NAME
          ) {
            console.log("[SW] Removendo cache antigo:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );

  // Assumir controle imediato de todas as páginas
  return self.clients.claim();
});

// Interceptar requests
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar requests não-GET
  if (request.method !== "GET") {
    return;
  }

  // Ignorar requests externos (CDNs, APIs externas)
  if (url.origin !== self.location.origin) {
    return;
  }

  // Estratégia para APIs: Network-First (sempre tentar rede primeiro)
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Estratégia para assets estáticos: Cache-First (usar cache se disponível)
  event.respondWith(cacheFirst(request));
});

/**
 * Estratégia Cache-First
 * Tenta buscar do cache primeiro, se não encontrar busca da rede
 */
async function cacheFirst(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const cached = await cache.match(request);

  if (cached) {
    console.log("[SW] Servindo do cache:", request.url);
    return cached;
  }

  try {
    const response = await fetch(request);
    
    // Cachear apenas respostas bem-sucedidas
    if (response.status === 200) {
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.error("[SW] Erro ao buscar da rede:", error);
    
    // Retornar página offline genérica se disponível
    const offlinePage = await cache.match("/");
    if (offlinePage) {
      return offlinePage;
    }
    
    // Retornar resposta de erro
    return new Response("Sem conexão", {
      status: 503,
      statusText: "Service Unavailable",
      headers: { "Content-Type": "text/plain" },
    });
  }
}

/**
 * Estratégia Network-First
 * Tenta buscar da rede primeiro, se falhar usa cache
 */
async function networkFirst(request) {
  const cache = await caches.open(DYNAMIC_CACHE);

  try {
    const response = await fetch(request);
    
    // Cachear apenas respostas bem-sucedidas
    if (response.status === 200) {
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log("[SW] Rede falhou, tentando cache:", request.url);
    const cached = await cache.match(request);
    
    if (cached) {
      return cached;
    }
    
    // Retornar resposta de erro
    return new Response(JSON.stringify({ error: "Sem conexão" }), {
      status: 503,
      statusText: "Service Unavailable",
      headers: { "Content-Type": "application/json" },
    });
  }
}

// Background Sync para sincronizar eventos offline (opcional)
self.addEventListener("sync", (event) => {
  console.log("[SW] Sync event:", event.tag);
  
  if (event.tag === "sync-offline-events") {
    event.waitUntil(syncOfflineEvents());
  }
});

async function syncOfflineEvents() {
  console.log("[SW] Sincronizando eventos offline...");
  
  try {
    // Notificar cliente para executar sincronização
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
