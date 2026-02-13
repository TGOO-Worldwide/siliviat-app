"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { syncPendingEvents, setupOnlineListener } from "@/lib/sync";
import { countPendingEvents } from "@/lib/offline-store";
import { useTheme } from "@/hooks/use-theme";
import { ActiveVisitIndicator } from "@/components/active-visit-indicator";

export function TopBar() {
  const { data: session } = useSession();
  const { theme, toggleTheme, mounted } = useTheme();
  const [online, setOnline] = useState<boolean>(true);
  const [clientMounted, setClientMounted] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Inicializar estado online após montagem no cliente
  useEffect(() => {
    setClientMounted(true);
    setOnline(navigator.onLine);
  }, []);

  // Atualizar contador de eventos pendentes
  const updatePendingCount = useCallback(async () => {
    try {
      const count = await countPendingEvents();
      setPendingCount(count);
    } catch (error) {
      console.error("Erro ao contar eventos pendentes:", error);
    }
  }, []);

  // Função de sincronização
  const handleSync = useCallback(async () => {
    if (syncing || !online) return;

    setSyncing(true);
    setSyncMessage(null);

    try {
      const result = await syncPendingEvents();

      if (result.processed > 0) {
        setSyncMessage(`✓ ${result.processed} evento(s) sincronizado(s)`);
      } else {
        setSyncMessage("Sem eventos para sincronizar");
      }

      if (result.failed > 0) {
        console.warn("Alguns eventos falharam:", result.errors);
        setSyncMessage(`⚠ ${result.failed} evento(s) falharam`);
      }

      // Atualizar contador
      await updatePendingCount();

      // Limpar mensagem após 3 segundos
      setTimeout(() => setSyncMessage(null), 3000);
    } catch (error) {
      console.error("Erro durante sincronização:", error);
      setSyncMessage("✗ Erro na sincronização");
      setTimeout(() => setSyncMessage(null), 3000);
    } finally {
      setSyncing(false);
    }
  }, [syncing, online, updatePendingCount]);

  // Sincronização automática quando volta online
  useEffect(() => {
    const cleanup = setupOnlineListener(async (isOnline) => {
      setOnline(isOnline);

      // Se voltou online, sincronizar automaticamente
      if (isOnline && !syncing) {
        console.log("Voltou online, sincronizando automaticamente...");
        await handleSync();
      }
    });

    return cleanup;
  }, [handleSync, syncing]);

  // Atualizar contador de eventos pendentes ao montar
  useEffect(() => {
    updatePendingCount();
    // Atualizar a cada 10 segundos
    const interval = setInterval(updatePendingCount, 10000);
    return () => clearInterval(interval);
  }, [updatePendingCount]);

  const userName = session?.user?.name ?? session?.user?.email ?? "Utilizador";

  return (
    <header className="flex items-center justify-between gap-2 border-b border-zinc-200 bg-white/80 px-3 py-3 text-sm shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {clientMounted && (
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${
                online ? "bg-emerald-500" : "bg-zinc-400"
              }`}
            />
            <span className="hidden text-xs font-medium uppercase tracking-wide text-zinc-600 sm:inline dark:text-zinc-300">
              {online ? "Online" : "Offline"}
            </span>
          </div>
        )}

        {/* Indicador de visita ativa */}
        <ActiveVisitIndicator />
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {/* Botão de alternância de tema */}
        {mounted && (
          <button
            type="button"
            onClick={toggleTheme}
            className="rounded-full p-2 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 active:scale-95 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            aria-label={theme === "light" ? "Mudar para modo escuro" : "Mudar para modo claro"}
          >
            {theme === "light" ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="h-5 w-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="h-5 w-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
                />
              </svg>
            )}
          </button>
        )}
        
        <div className="flex flex-col items-end gap-1">
          {syncMessage && (
            <span className="text-[10px] text-zinc-600 dark:text-zinc-400">
              {syncMessage}
            </span>
          )}
          <button
            type="button"
            disabled={syncing || !online}
            className="relative rounded-full bg-zinc-900 px-3 py-1 text-xs font-semibold text-white shadow-sm hover:bg-zinc-800 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            onClick={handleSync}
          >
            {syncing ? "A sincronizar..." : "Sync"}
            {pendingCount > 0 && !syncing && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] text-white">
                {pendingCount}
              </span>
            )}
          </button>
        </div>
        <div className="flex flex-col items-end">
          <span className="max-w-[140px] truncate text-xs font-medium text-zinc-900 dark:text-zinc-50">
            {userName}
          </span>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-[11px] text-zinc-500 underline-offset-2 hover:underline"
          >
            Sair
          </button>
        </div>
      </div>
    </header>
  );
}

