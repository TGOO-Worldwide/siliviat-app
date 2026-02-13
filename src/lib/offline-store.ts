/**
 * Helper para armazenar eventos offline em IndexedDB
 * Permite guardar check-ins, check-outs, criação de empresas, etc.
 * enquanto o utilizador está sem conexão
 */

export interface PendingEvent {
  id: string;
  type: "checkin" | "checkout" | "company" | "audio" | "sale";
  payload: unknown;
  timestamp: number;
  retryCount?: number;
}

const DB_NAME = "tgoo-offline-db";
const DB_VERSION = 1;
const STORE_NAME = "pendingEvents";

/**
 * Abre a conexão com IndexedDB
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Criar object store se não existir
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("timestamp", "timestamp", { unique: false });
        store.createIndex("type", "type", { unique: false });
      }
    };
  });
}

/**
 * Adiciona um evento pendente ao store
 */
export async function addPendingEvent(
  type: PendingEvent["type"],
  payload: unknown
): Promise<string> {
  const db = await openDB();
  const id = `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const event: PendingEvent = {
    id,
    type,
    payload,
    timestamp: Date.now(),
    retryCount: 0,
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add(event);

    request.onsuccess = () => {
      db.close();
      resolve(id);
    };

    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

/**
 * Obtém todos os eventos pendentes, ordenados por timestamp
 */
export async function getAllPendingEvents(): Promise<PendingEvent[]> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      db.close();
      const events = request.result as PendingEvent[];
      // Ordenar por timestamp (mais antigos primeiro)
      events.sort((a, b) => a.timestamp - b.timestamp);
      resolve(events);
    };

    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

/**
 * Remove um evento pendente do store
 */
export async function removePendingEvent(id: string): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => {
      db.close();
      resolve();
    };

    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

/**
 * Incrementa o contador de retry de um evento
 */
export async function incrementRetryCount(id: string): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const event = getRequest.result as PendingEvent;
      if (event) {
        event.retryCount = (event.retryCount || 0) + 1;
        const putRequest = store.put(event);

        putRequest.onsuccess = () => {
          db.close();
          resolve();
        };

        putRequest.onerror = () => {
          db.close();
          reject(putRequest.error);
        };
      } else {
        db.close();
        resolve();
      }
    };

    getRequest.onerror = () => {
      db.close();
      reject(getRequest.error);
    };
  });
}

/**
 * Limpa todos os eventos pendentes
 */
export async function clearAllPendingEvents(): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => {
      db.close();
      resolve();
    };

    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

/**
 * Conta quantos eventos pendentes existem
 */
export async function countPendingEvents(): Promise<number> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.count();

    request.onsuccess = () => {
      db.close();
      resolve(request.result);
    };

    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}
