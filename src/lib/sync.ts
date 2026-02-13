/**
 * Helper para sincronizar eventos offline com o servidor
 * Processa eventos pendentes do IndexedDB e envia para as APIs
 */

import {
  getAllPendingEvents,
  removePendingEvent,
  incrementRetryCount,
  type PendingEvent,
} from "./offline-store";

const MAX_RETRIES = 3;

export interface SyncResult {
  success: boolean;
  processed: number;
  failed: number;
  errors: Array<{ eventId: string; error: string }>;
}

/**
 * Sincroniza todos os eventos pendentes
 */
export async function syncPendingEvents(): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    processed: 0,
    failed: 0,
    errors: [],
  };

  try {
    const events = await getAllPendingEvents();

    if (events.length === 0) {
      return result;
    }

    // Processar eventos sequencialmente (importante para manter ordem)
    for (const event of events) {
      try {
        // Verificar limite de retry
        if ((event.retryCount || 0) >= MAX_RETRIES) {
          console.warn(`Evento ${event.id} excedeu limite de retries, removendo`);
          await removePendingEvent(event.id);
          result.failed++;
          result.errors.push({
            eventId: event.id,
            error: "Excedeu número máximo de tentativas",
          });
          continue;
        }

        // Processar evento baseado no tipo
        await processEvent(event);

        // Remover evento bem-sucedido
        await removePendingEvent(event.id);
        result.processed++;
      } catch (error) {
        console.error(`Erro ao processar evento ${event.id}:`, error);
        
        // Incrementar contador de retry
        await incrementRetryCount(event.id);
        
        result.failed++;
        result.errors.push({
          eventId: event.id,
          error: error instanceof Error ? error.message : "Erro desconhecido",
        });
      }
    }

    result.success = result.failed === 0;
  } catch (error) {
    console.error("Erro geral na sincronização:", error);
    result.success = false;
    result.errors.push({
      eventId: "general",
      error: error instanceof Error ? error.message : "Erro desconhecido",
    });
  }

  return result;
}

/**
 * Processa um evento individual baseado no tipo
 */
async function processEvent(event: PendingEvent): Promise<void> {
  switch (event.type) {
    case "checkin":
      await processCheckinEvent(event);
      break;
    case "checkout":
      await processCheckoutEvent(event);
      break;
    case "company":
      await processCompanyEvent(event);
      break;
    case "sale":
      await processSaleEvent(event);
      break;
    default:
      throw new Error(`Tipo de evento desconhecido: ${event.type}`);
  }
}

/**
 * Processa evento de check-in
 */
async function processCheckinEvent(event: PendingEvent): Promise<void> {
  const payload = event.payload as {
    companyId?: string;
    checkInLat?: number;
    checkInLng?: number;
    noGpsReason?: string;
  };

  const response = await fetch("/api/visits/checkin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || "Erro ao fazer check-in");
  }
}

/**
 * Processa evento de check-out
 */
async function processCheckoutEvent(event: PendingEvent): Promise<void> {
  const payload = event.payload as {
    checkOutLat?: number;
    checkOutLng?: number;
    noGpsReason?: string;
  };

  const response = await fetch("/api/visits/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || "Erro ao fazer check-out");
  }
}

/**
 * Processa evento de criação de empresa
 */
async function processCompanyEvent(event: PendingEvent): Promise<void> {
  const payload = event.payload as {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    nif?: string;
  };

  const response = await fetch("/api/companies", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || "Erro ao criar empresa");
  }
}

/**
 * Processa evento de criação de venda
 */
async function processSaleEvent(event: PendingEvent): Promise<void> {
  const payload = event.payload as {
    visitId?: string;
    companyId: string;
    technologyId: string;
    valueCents?: number;
    notes?: string;
  };

  const response = await fetch("/api/sales", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || "Erro ao registar venda");
  }
}

/**
 * Verifica se está online
 */
export function isOnline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine;
}

/**
 * Hook para escutar mudanças no estado de conexão
 */
export function setupOnlineListener(callback: (isOnline: boolean) => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  // Retornar função de cleanup
  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  };
}
