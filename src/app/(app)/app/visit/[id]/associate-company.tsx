"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CompanyPicker, type CompanyOption } from "@/components/company-picker";
import { CompanyCreateForm } from "@/components/company-create-form";

interface AssociateCompanyProps {
  visitId: string;
  onSuccess?: (company: { id: string; name: string }) => void;
  embedded?: boolean;
  mode?: "associate" | "change";
}

export function AssociateCompany({
  visitId,
  onSuccess,
  embedded = false,
  mode = "associate",
}: AssociateCompanyProps) {
  const router = useRouter();
  const [selectedCompany, setSelectedCompany] = useState<CompanyOption | null>(
    null
  );
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const associateWithCompany = useCallback(
    async (company: { id: string; name: string }) => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/visits/${visitId}/associate-company`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ companyId: company.id }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Erro ao associar empresa");
        }

        if (onSuccess && data.visit?.company) {
          onSuccess({
            id: data.visit.company.id,
            name: data.visit.company.name,
          });
        } else {
          setSuccess(true);
          setTimeout(() => {
            router.refresh();
          }, 1000);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Erro ao associar empresa"
        );
      } finally {
        setLoading(false);
      }
    },
    [visitId, onSuccess, router]
  );

  const handleAssociate = async () => {
    if (!selectedCompany) {
      setError("Por favor, selecione uma empresa");
      return;
    }

    await associateWithCompany(selectedCompany);
  };

  if (success) {
    return (
      <div className="rounded-2xl bg-emerald-50 p-4 shadow-sm dark:bg-emerald-900/20">
        <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
          ✅{" "}
          {mode === "change"
            ? "Empresa alterada com sucesso! A atualizar..."
            : "Empresa associada com sucesso! A atualizar..."}
        </p>
      </div>
    );
  }

  const isChangeMode = mode === "change";
  const title = isChangeMode ? "🏢 Alterar Empresa" : "🏢 Associar Empresa";
  const description = isChangeMode
    ? "Selecione a nova empresa para associar a esta visita."
    : "Esta visita ainda não tem uma empresa associada. Pesquise e selecione uma empresa para poder registar vendas.";
  const confirmLabel = isChangeMode ? "Alterar Empresa" : "Associar Empresa";
  const loadingLabel = isChangeMode ? "A alterar..." : "A associar...";

  const containerClass = embedded
    ? ""
    : "rounded-2xl bg-white p-4 shadow-sm dark:bg-zinc-900";

  return (
    <section className={containerClass}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
        {!selectedCompany && (
          <button
            type="button"
            onClick={() => setShowCreateForm((prev) => !prev)}
            disabled={loading}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 active:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {showCreateForm ? "Cancelar" : "+ Nova Empresa"}
          </button>
        )}
      </div>

      <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
        {description}
      </p>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {selectedCompany ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-800 dark:bg-emerald-900/20">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="font-semibold text-emerald-900 dark:text-emerald-100">
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
                onClick={() => setSelectedCompany(null)}
                disabled={loading}
                className="text-xs text-emerald-600 hover:text-emerald-700 disabled:opacity-50 dark:text-emerald-400"
              >
                Alterar
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAssociate}
            disabled={loading}
            className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? loadingLabel : confirmLabel}
          </button>
        </div>
      ) : showCreateForm ? (
        <CompanyCreateForm
          idPrefix="associate-company"
          onSuccess={(company) => {
            setShowCreateForm(false);
            associateWithCompany(company);
          }}
        />
      ) : (
        <div className="space-y-2">
          <label
            htmlFor="associate-company-search"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Selecionar Empresa
          </label>
          <CompanyPicker
            searchId="associate-company-search"
            onSelect={setSelectedCompany}
          />
        </div>
      )}
    </section>
  );
}
