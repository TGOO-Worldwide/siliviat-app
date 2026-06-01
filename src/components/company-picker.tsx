"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export type CompanyOption = {
  id: string;
  name: string;
  address?: string | null;
  phone?: string | null;
};

type CompanyPickerProps = {
  onSelect: (company: CompanyOption) => void;
  searchId?: string;
  limit?: number;
  placeholder?: string;
  showCreateLink?: boolean;
};

export function CompanyPicker({
  onSelect,
  searchId = "company-search",
  limit = 10,
  placeholder = "🔍 Pesquisar empresa...",
  showCreateLink = true,
}: CompanyPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery]);

  useEffect(() => {
    const fetchCompanies = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(limit),
        });
        if (debouncedQuery.trim()) {
          params.set("query", debouncedQuery.trim());
        }

        const res = await fetch(`/api/companies?${params.toString()}`);
        if (!res.ok) return;

        const data = await res.json();
        setCompanies(data.companies || []);
        setTotalPages(data.pagination?.totalPages ?? 1);
      } catch (err) {
        console.error("Erro ao carregar empresas:", err);
        setCompanies([]);
        setTotalPages(1);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCompanies();
  }, [debouncedQuery, page, limit]);

  return (
    <div className="space-y-2">
      <input
        id={searchId}
        type="search"
        placeholder={placeholder}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
      />

      {isLoading ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">A carregar...</p>
      ) : companies.length > 0 ? (
        <div className="space-y-1">
          {companies.map((company) => (
            <button
              key={company.id}
              type="button"
              onClick={() => onSelect(company)}
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
              {company.phone && (
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  📞 {company.phone}
                </p>
              )}
            </button>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-center dark:border-zinc-700 dark:bg-zinc-800">
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            Nenhuma empresa encontrada.
          </p>
          {showCreateLink && (
            <Link
              href="/app/companies"
              className="mt-1 inline-block text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
            >
              Criar nova empresa
            </Link>
          )}
        </div>
      )}

      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            ← Anterior
          </button>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Página {page} de {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-lg px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Seguinte →
          </button>
        </div>
      )}
    </div>
  );
}
