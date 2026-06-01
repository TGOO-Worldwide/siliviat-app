"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { addPendingEvent } from "@/lib/offline-store";
import { isOnline } from "@/lib/sync";
import { SlideButton } from "@/components/slide-button";
import { AssociateCompany } from "@/app/(app)/app/visit/[id]/associate-company";
import { CompanyPicker } from "@/components/company-picker";
import { CompanyCreateForm } from "@/components/company-create-form";
import { ActiveVisitCompanyCard } from "./active-visit-company-card";
import { PostCheckoutCompanyModal } from "./post-checkout-company-modal";

interface ActiveVisit {
  id: string;
  checkInAt: string;
  companyId?: string;
  companyName?: string;
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
  const router = useRouter();
  const [activeVisit, setActiveVisit] = useState<ActiveVisit | null>(initialActiveVisit);
  const [visitSynced, setVisitSynced] = useState(Boolean(initialActiveVisit));
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  // Pesquisa de empresa
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [showCompanyPicker, setShowCompanyPicker] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showAssociatePanel, setShowAssociatePanel] = useState(false);
  const [postCheckoutVisitId, setPostCheckoutVisitId] = useState<string | null>(
    null
  );

  const [now, setNow] = useState<Date | null>(null);

  const finishCheckout = useCallback(
    (visitId: string, hadCompany: boolean) => {
      setActiveVisit(null);
      setShowCompanyPicker(false);
      setShowCreateForm(false);
      setShowAssociatePanel(false);
      setStatus("success");

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("visitUpdated"));
      }

      if (hadCompany) {
        router.push(`/app/visit/${visitId}`);
        return;
      }

      setPostCheckoutVisitId(visitId);
    },
    [router]
  );

  const fetchActiveVisit = useCallback(async () => {
    try {
      const res = await fetch(`/api/visits/active?_=${Date.now()}`, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });
      if (!res.ok) return;

      const data = await res.json();
      const serverVisit: ActiveVisit | null = data.visit ?? null;

      setActiveVisit((current) => {
        if (current?.id.startsWith("temp-") && !serverVisit) {
          return current;
        }
        if (!serverVisit) return null;
        if (current && current.id === serverVisit.id) {
          return {
            ...serverVisit,
            companyId: serverVisit.companyId ?? current.companyId,
            companyName: serverVisit.companyName ?? current.companyName,
          };
        }
        return serverVisit;
      });
    } catch (err) {
      console.error("Erro ao sincronizar visita ativa:", err);
    } finally {
      setVisitSynced(true);
    }
  }, []);

  // Sincronizar com o servidor ao montar e ao voltar à página
  useEffect(() => {
    fetchActiveVisit();

    const handleVisitUpdate = () => {
      fetchActiveVisit();
    };

    const handlePageShow = () => {
      fetchActiveVisit();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchActiveVisit();
      }
    };

    window.addEventListener("visitUpdated", handleVisitUpdate);
    window.addEventListener("pageshow", handlePageShow);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("visitUpdated", handleVisitUpdate);
      window.removeEventListener("pageshow", handlePageShow);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchActiveVisit]);

  // Timer da visita ativa (now só é definido no cliente, após hidratação)
  useEffect(() => {
    if (!activeVisit) {
      setNow(null);
      return;
    }

    setNow(new Date());
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, [activeVisit]);

  const durationLabel = useMemo(() => {
    if (!visitSynced || !activeVisit || !now) return "00:00:00";
    const start = new Date(activeVisit.checkInAt).getTime();
    const diffSeconds = Math.max(0, Math.floor((now.getTime() - start) / 1000));

    const hours = String(Math.floor(diffSeconds / 3600)).padStart(2, "0");
    const minutes = String(Math.floor((diffSeconds % 3600) / 60)).padStart(
      2,
      "0"
    );
    const seconds = String(diffSeconds % 60).padStart(2, "0");

    return `${hours}:${minutes}:${seconds}`;
  }, [activeVisit, now, visitSynced]);

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
          companyName: selectedCompany?.name,
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
        visit: {
          id: string;
          checkInAt: string;
          companyId?: string;
          companyName?: string;
        };
      };

      setActiveVisit({
        id: data.visit.id,
        checkInAt: data.visit.checkInAt,
        companyId: data.visit.companyId,
        companyName: data.visit.companyName ?? selectedCompany?.name,
      });
      setShowCompanyPicker(false);
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

    const visitBeforeCheckout = activeVisit;
    const hadCompany = Boolean(visitBeforeCheckout?.companyId);

    try {
      const geo = await getGeolocation();

      const payload = {
        checkOutLat: geo.lat ?? undefined,
        checkOutLng: geo.lng ?? undefined,
        noGpsReason: geo.noGpsReason,
      };

      // Verificar se está offline
      if (!isOnline()) {
        await addPendingEvent("checkout", payload);

        setActiveVisit(null);
        setShowCompanyPicker(false);
        setShowCreateForm(false);
        setStatus("success");
        setError(
          "✓ Check-out guardado offline. Será sincronizado quando voltar online."
        );

        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("visitUpdated"));
        }
        return;
      }

      if (visitBeforeCheckout?.id.startsWith("temp-")) {
        throw new Error(
          "Visita offline ainda não sincronizada. Volte online para concluir o check-out."
        );
      }

      const res = await fetch("/api/visits/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const message = data?.error ?? "Falha no check-out.";
        if (message === "Não existe visita ativa para fazer check-out.") {
          setActiveVisit(null);
          window.dispatchEvent(new Event("visitUpdated"));
        }
        throw new Error(message);
      }

      const data = (await res.json()) as {
        visit: { id: string };
      };

      finishCheckout(data.visit.id, hadCompany);
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

  const hasActiveVisit = visitSynced && Boolean(activeVisit);
  const showCompanyCard =
    hasActiveVisit &&
    Boolean(activeVisit?.companyId) &&
    !activeVisit!.id.startsWith("temp-");
  const canAssociateCompany =
    hasActiveVisit &&
    activeVisit &&
    !activeVisit.companyId &&
    !activeVisit.id.startsWith("temp-");

  return (
    <div className="space-y-4">
      {postCheckoutVisitId && (
        <PostCheckoutCompanyModal
          visitId={postCheckoutVisitId}
          onClose={() => setPostCheckoutVisitId(null)}
        />
      )}

      {showCompanyCard && (
        <ActiveVisitCompanyCard
          visitId={activeVisit!.id}
          companyName={activeVisit!.companyName ?? "Empresa"}
        />
      )}

      {/* Associar empresa durante visita ativa */}
      {canAssociateCompany && (
        <section className="rounded-2xl bg-white p-4 shadow-sm dark:bg-zinc-900">
          {!showAssociatePanel ? (
            <button
              type="button"
              onClick={() => setShowAssociatePanel(true)}
              className="w-full rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300 dark:hover:bg-emerald-900/30"
            >
              Associar Empresa
            </button>
          ) : (
            <div className="space-y-3">
              <AssociateCompany
                visitId={activeVisit!.id}
                onSuccess={(company) => {
                  setActiveVisit((prev) =>
                    prev
                      ? {
                          ...prev,
                          companyId: company.id,
                          companyName: company.name,
                        }
                      : null
                  );
                  setShowAssociatePanel(false);
                  window.dispatchEvent(new Event("visitUpdated"));
                  router.refresh();
                }}
              />
              <button
                type="button"
                onClick={() => setShowAssociatePanel(false)}
                className="w-full rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                Cancelar
              </button>
            </div>
          )}
        </section>
      )}

      {/* Seleção de empresa (apenas se não houver visita ativa) */}
      {!hasActiveVisit && (
        <section className="rounded-2xl bg-white p-4 shadow-sm dark:bg-zinc-900">
          {selectedCompany ? (
            <>
              <h2 className="mb-3 text-sm font-semibold">Empresa a visitar</h2>
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
                    type="button"
                    onClick={() => {
                      setSelectedCompany(null);
                      setShowCompanyPicker(true);
                    }}
                    className="text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                  >
                    Alterar
                  </button>
                </div>
              </div>
            </>
          ) : !showCompanyPicker ? (
            <>
              <h2 className="mb-3 text-sm font-semibold">Empresa a visitar</h2>
              <button
                type="button"
                onClick={() => setShowCompanyPicker(true)}
                className="w-full rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300 dark:hover:bg-emerald-900/30"
              >
                Escolher empresa
              </button>
            </>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold">Empresa a visitar</h2>
                <button
                  type="button"
                  onClick={() => setShowCreateForm((prev) => !prev)}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 active:bg-emerald-800"
                >
                  {showCreateForm ? "Cancelar" : "+ Nova Empresa"}
                </button>
              </div>
              <div className="space-y-2">
                {showCreateForm ? (
                  <CompanyCreateForm
                    idPrefix="checkin-company"
                    onSuccess={(company) => {
                      setSelectedCompany(company);
                      setShowCreateForm(false);
                      setShowCompanyPicker(false);
                    }}
                  />
                ) : (
                  <>
                    <CompanyPicker onSelect={setSelectedCompany} />

                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      ℹ️ Opcional: pode fazer check-in sem associar empresa
                    </p>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setShowCompanyPicker(false);
                    setShowCreateForm(false);
                  }}
                  className="w-full rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
                >
                  Cancelar
                </button>
              </div>
            </>
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

