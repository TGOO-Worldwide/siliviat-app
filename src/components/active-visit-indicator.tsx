"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

interface ActiveVisit {
  id: string;
  checkInAt: string;
  companyId?: string;
  companyName?: string;
}

export function ActiveVisitIndicator() {
  const [activeVisit, setActiveVisit] = useState<ActiveVisit | null>(null);
  const [duration, setDuration] = useState("00:00:00");
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const fetchActiveVisit = useCallback(async () => {
    try {
      const res = await fetch("/api/visits/active");
      if (res.ok) {
        const data = await res.json();
        setActiveVisit(data.visit || null);
      } else {
        setActiveVisit(null);
      }
    } catch (error) {
      console.error("Erro ao buscar visita ativa:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Buscar visita ativa ao montar e a cada 30 segundos
  useEffect(() => {
    fetchActiveVisit();
    const interval = setInterval(fetchActiveVisit, 30000);

    // Escutar evento customizado de atualização de visita
    const handleVisitUpdate = () => {
      fetchActiveVisit();
    };
    window.addEventListener("visitUpdated", handleVisitUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener("visitUpdated", handleVisitUpdate);
    };
  }, [fetchActiveVisit]);

  // Atualizar duração a cada segundo
  useEffect(() => {
    if (!activeVisit) return;

    const updateDuration = () => {
      const start = new Date(activeVisit.checkInAt).getTime();
      const now = Date.now();
      const diffSeconds = Math.max(0, Math.floor((now - start) / 1000));

      const hours = String(Math.floor(diffSeconds / 3600)).padStart(2, "0");
      const minutes = String(Math.floor((diffSeconds % 3600) / 60)).padStart(2, "0");
      const seconds = String(diffSeconds % 60).padStart(2, "0");

      setDuration(`${hours}:${minutes}:${seconds}`);
    };

    updateDuration();
    const interval = setInterval(updateDuration, 1000);
    return () => clearInterval(interval);
  }, [activeVisit]);

  if (isLoading || !activeVisit) {
    return null;
  }

  return (
    <button
      onClick={() => router.push("/app/checkin")}
      className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-800 shadow-sm transition-all hover:bg-emerald-200 active:scale-95 dark:bg-emerald-900/30 dark:text-emerald-300 dark:hover:bg-emerald-900/50 sm:gap-2 sm:px-3 sm:py-1.5"
      title="Clique para ver detalhes da visita"
    >
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
      </span>
      <div className="flex flex-col items-start">
        <span className="text-[10px] font-medium uppercase leading-tight">
          Visita ativa
        </span>
        <span className="font-mono text-[11px] font-bold leading-tight sm:text-xs">
          {duration}
        </span>
      </div>
    </button>
  );
}
