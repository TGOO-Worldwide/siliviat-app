"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { addPendingEvent } from "@/lib/offline-store";
import { isOnline } from "@/lib/sync";
import { SlideButton } from "@/components/slide-button";

interface ActiveVisit {
  id: string;
  checkInAt: string;
  companyId?: string;
}

interface CheckinClientProps {
  initialActiveVisit: ActiveVisit | null;
}

type Status = "idle" | "loading" | "error" | "success";

type Company = {
  id: string;
  name: string;
  address?: string | null;
  phone?: string | null;
};

export function CheckinClient({ initialActiveVisit }: CheckinClientProps) {
  const [activeVisit, setActiveVisit] = useState<ActiveVisit | null>(
    initialActiveVisit
  );
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  // Pesquisa de empresa
  const [companySearchQuery, setCompanySearchQuery] = useState("");
  const [companySearchResults, setCompanySearchResults] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [isSearchingCompany, setIsSearchingCompany] = useState(false);

  const [now, setNow] = useState<Date>(new Date());

  // Timer da visita ativa
  useEffect(() => {
    if (!activeVisit) return;

    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, [activeVisit]);

  // Debounce de pesquisa de empresa
  useEffect(() => {
    if (!companySearchQuery.trim()) {
      setCompanySearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingCompany(true);
      try {
        const params = new URLSearchParams({ query: companySearchQuery, limit: "5" });
        const res = await fetch(`/api/companies?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setCompanySearchResults(data.companies || []);
        }
      } catch (err) {
        console.error("Erro ao pesquisar empresas:", err);
      } finally {
        setIsSearchingCompany(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [companySearchQuery]);

  const durationLabel = useMemo(() => {
    if (!activeVisit) return "00:00:00";
    const start = new Date(activeVisit.checkInAt).getTime();
    const diffSeconds = Math.max(0, Math.floor((now.getTime() - start) / 1000));

    const hours = String(Math.floor(diffSeconds / 3600)).padStart(2, "0");
    const minutes = String(Math.floor((diffSeconds % 3600) / 60)).padStart(
      2,
      "0"
    );
    const seconds = String(diffSeconds % 60).padStart(2, "0");

    return `${hours}:${minutes}:${seconds}`;
  }, [activeVisit, now]);

  const getGeolocation = useCallback(
    () =>
      new Promise<
        | { lat: number; lng: number; noGpsReason?: string }
        | { lat: null; lng: null; noGpsReason: string }
      >((resolve, reject) => {
        if (typeof navigator === "undefined" || !navigator.geolocation) {
          // Fallback para ambientes sem suporte a prompt() (ex: testes automatizados)
          const reason = typeof window !== "undefined" && typeof window.prompt === "function"
            ? window.prompt(
                "Não foi possível aceder ao GPS. Justifique (ex: sem sinal, permissão negada):"
              ) ?? ""
            : "Ambiente de teste sem GPS";
          if (!reason.trim()) {
            reject(new Error("GPS obrigatório ou justificação."));
            return;
          }
          resolve({ lat: null, lng: null, noGpsReason: reason.trim() });
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (pos) => {
            resolve({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            });
          },
          (err) => {
            console.error("Erro GPS", err);
            // Fallback para ambientes sem suporte a prompt()
            const reason = typeof window !== "undefined" && typeof window.prompt === "function"
              ? window.prompt(
                  "Não foi possível obter GPS. Justifique (ex: sem sinal, permissão negada):"
                ) ?? ""
              : "GPS não disponível no navegador";
            if (!reason.trim()) {
              reject(new Error("GPS obrigatório ou justificação."));
              return;
            }
            resolve({ lat: null, lng: null, noGpsReason: reason.trim() });
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
      }),
    []
  );

  async function handleCheckin() {
    setError(null);
    setStatus("loading");

    try {
      const geo = await getGeolocation();

      const payload = {
        companyId: selectedCompany?.id,
        checkInLat: geo.lat ?? undefined,
        checkInLng: geo.lng ?? undefined,
        noGpsReason: geo.noGpsReason,
      };

      // Verificar se está offline
      if (!isOnline()) {
        // Guardar no IndexedDB para sincronização posterior
        await addPendingEvent("checkin", payload);
        
        // Criar visita "temporária" localmente
        const tempVisit: ActiveVisit = {
          id: `temp-${Date.now()}`,
          checkInAt: new Date().toISOString(),
          companyId: selectedCompany?.id,
        };
        
        setActiveVisit(tempVisit);
        setStatus("success");
        setError("✓ Check-in guardado offline. Será sincronizado quando voltar online.");

        // Disparar evento para atualizar indicador no header
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("visitUpdated"));
        }
        return;
      }

      // Modo online - processar normalmente
      const res = await fetch("/api/visits/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Falha no check-in.");
      }

      const data = (await res.json()) as {
        visit: { id: string; checkInAt: string; companyId?: string };
      };

      setActiveVisit({
        id: data.visit.id,
        checkInAt: data.visit.checkInAt,
        companyId: data.visit.companyId,
      });
      setStatus("success");

      // Disparar evento para atualizar indicador no header
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("visitUpdated"));
      }
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Ocorreu um erro no check-in."
      );
      setStatus("error");
    } finally {
      setStatus("idle");
    }
  }

  async function handleCheckout() {
    setError(null);
    setStatus("loading");

    try {
      const geo = await getGeolocation();

      const payload = {
        checkOutLat: geo.lat ?? undefined,
        checkOutLng: geo.lng ?? undefined,
        noGpsReason: geo.noGpsReason,
      };

      // Verificar se está offline
      if (!isOnline()) {
        // Guardar no IndexedDB para sincronização posterior
        await addPendingEvent("checkout", payload);
        
        setActiveVisit(null);
        setStatus("success");
        setError("✓ Check-out guardado offline. Será sincronizado quando voltar online.");

        // Disparar evento para atualizar indicador no header
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("visitUpdated"));
        }
        return;
      }

      // Modo online - processar normalmente
      const res = await fetch("/api/visits/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Falha no check-out.");
      }

      setActiveVisit(null);
      setStatus("success");

      // Disparar evento para atualizar indicador no header
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("visitUpdated"));
      }
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Ocorreu um erro no check-out."
      );
      setStatus("error");
    } finally {
      setStatus("idle");
    }
  }

  const hasActiveVisit = Boolean(activeVisit);

  return (
    <div className="space-y-4">
      {/* Seleção de empresa (apenas se não houver visita ativa) */}
      {!hasActiveVisit && (
        <section className="rounded-2xl bg-white p-4 shadow-sm dark:bg-zinc-900">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Empresa a visitar</h2>
            <Link
              href="/app/companies"
              className="text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
            >
              Ver todas
            </Link>
          </div>

          {selectedCompany ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-800 dark:bg-emerald-900/20">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-emerald-900 dark:text-emerald-100">
                    {selectedCompany.name}
                  </p>
                  {selectedCompany.address && (
                    <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">
                      📍 {selectedCompany.address}
                    </p>
                  )}
                  {selectedCompany.phone && (
                    <p className="text-xs text-emerald-700 dark:text-emerald-300">
                      📞 {selectedCompany.phone}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setSelectedCompany(null)}
                  className="text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                >
                  Alterar
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <input
                type="search"
                placeholder="🔍 Pesquisar empresa..."
                value={companySearchQuery}
                onChange={(e) => setCompanySearchQuery(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              />

              {isSearchingCompany && (
                <p className="text-xs text-zinc-500">A pesquisar...</p>
              )}

              {!isSearchingCompany && companySearchResults.length > 0 && (
                <div className="space-y-1">
                  {companySearchResults.map((company) => (
                    <button
                      key={company.id}
                      onClick={() => {
                        setSelectedCompany(company);
                        setCompanySearchQuery("");
                        setCompanySearchResults([]);
                      }}
                      className="w-full rounded-lg border border-zinc-200 bg-white p-2 text-left text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                    >
                      <p className="font-medium text-zinc-900 dark:text-zinc-100">
                        {company.name}
                      </p>
                      {company.address && (
                        <p className="text-xs text-zinc-600 dark:text-zinc-400">
                          {company.address}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {!isSearchingCompany &&
                companySearchQuery.trim() &&
                companySearchResults.length === 0 && (
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-center dark:border-zinc-700 dark:bg-zinc-800">
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">
                      Nenhuma empresa encontrada.
                    </p>
                    <Link
                      href="/app/companies"
                      className="mt-1 inline-block text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                    >
                      Criar nova empresa
                    </Link>
                  </div>
                )}

              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                ℹ️ Opcional: pode fazer check-in sem associar empresa
              </p>
            </div>
          )}
        </section>
      )}

      {/* Check-in/Check-out */}
      <section className="rounded-2xl bg-white p-4 shadow-sm dark:bg-zinc-900">
        <h1 className="mb-2 text-lg font-semibold">
          Check-in no Cliente
        </h1>
        <p className="mb-4 text-xs text-zinc-600 dark:text-zinc-400">
          Use este ecrã para registar a presença no cliente. O GPS é usado para
          validar a visita; se não for possível, terá de justificar.
        </p>

        <div className="flex flex-col items-center gap-4">
          <div className="text-center">
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              Tempo na visita
            </p>
            <p className="mt-1 font-mono text-3xl font-semibold">
              {durationLabel}
            </p>
          </div>

          {!hasActiveVisit ? (
            <SlideButton
              onConfirm={handleCheckin}
              disabled={status === "loading"}
              text="Check-in"
              variant="success"
            />
          ) : (
            <SlideButton
              onConfirm={handleCheckout}
              disabled={status === "loading"}
              text="Check-out"
              variant="danger"
            />
          )}
        </div>

        {error && (
          <p className={`mt-4 text-xs font-medium ${
            error.startsWith("✓") 
              ? "text-emerald-600 dark:text-emerald-400" 
              : "text-red-600 dark:text-red-400"
          }`}>
            {error}
          </p>
        )}
      </section>
    </div>
  );
}

