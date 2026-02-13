"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Company {
  id: string;
  name: string;
  address: string | null;
  phone?: string | null;
}

interface AssociateCompanyProps {
  visitId: string;
}

export function AssociateCompany({ visitId }: AssociateCompanyProps) {
  const router = useRouter();
  const [companySearchQuery, setCompanySearchQuery] = useState("");
  const [companySearchResults, setCompanySearchResults] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [isSearchingCompany, setIsSearchingCompany] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Debounce de pesquisa de empresa
  useEffect(() => {
    if (!companySearchQuery.trim()) {
      setCompanySearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingCompany(true);
      try {
        const params = new URLSearchParams({ 
          query: companySearchQuery, 
          limit: "10" 
        });
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

  const handleAssociate = async () => {
    if (!selectedCompany) {
      setError("Por favor, selecione uma empresa");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/visits/${visitId}/associate-company`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ companyId: selectedCompany.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao associar empresa");
      }

      setSuccess(true);
      
      // Atualizar a página após 1 segundo
      setTimeout(() => {
        router.refresh();
      }, 1000);
    } catch (err: any) {
      setError(err.message || "Erro ao associar empresa");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="rounded-2xl bg-emerald-50 p-4 shadow-sm dark:bg-emerald-900/20">
        <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
          ✅ Empresa associada com sucesso! A atualizar...
        </p>
      </div>
    );
  }

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm dark:bg-zinc-900">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">🏢 Associar Empresa</h2>
        <Link
          href="/app/companies"
          className="text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
        >
          Ver todas
        </Link>
      </div>
      
      <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
        Esta visita ainda não tem uma empresa associada. Pesquise e selecione uma empresa para poder registar vendas.
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
                onClick={() => setSelectedCompany(null)}
                disabled={loading}
                className="text-xs text-emerald-600 hover:text-emerald-700 disabled:opacity-50 dark:text-emerald-400"
              >
                Alterar
              </button>
            </div>
          </div>

          <button
            onClick={handleAssociate}
            disabled={loading}
            className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "A associar..." : "Associar Empresa"}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <label
            htmlFor="company-search"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Pesquisar Empresa
          </label>
          <input
            id="company-search"
            type="search"
            placeholder="🔍 Digite o nome da empresa..."
            value={companySearchQuery}
            onChange={(e) => setCompanySearchQuery(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          />

          {isSearchingCompany && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              A pesquisar...
            </p>
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
                  className="w-full rounded-lg border border-zinc-200 bg-white p-3 text-left hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                >
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">
                    {company.name}
                  </p>
                  {company.address && (
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">
                      📍 {company.address}
                    </p>
                  )}
                  {company.phone && (
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">
                      📞 {company.phone}
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

          {!companySearchQuery.trim() && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              💡 Dica: comece a digitar para pesquisar empresas
            </p>
          )}
        </div>
      )}
    </section>
  );
}
