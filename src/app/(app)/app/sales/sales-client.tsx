"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Technology {
  id: string;
  name: string;
}

interface Company {
  id: string;
  name: string;
}

interface Visit {
  id: string;
  checkInAt: string;
}

interface User {
  id: string;
  name?: string | null;
  email?: string | null;
}

interface Sale {
  id: string;
  valueCents: number | null;
  notes: string | null;
  createdAt: string;
  company: Company;
  technology: Technology;
  visit: Visit | null;
  user: User;
}

interface SalesResponse {
  sales: Sale[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function SalesClient() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [technologies, setTechnologies] = useState<Technology[]>([]);
  const [selectedTech, setSelectedTech] = useState<string>("");

  // Carregar tecnologias para filtro
  useEffect(() => {
    fetch("/api/admin/technologies")
      .then((res) => res.json())
      .then((data) => {
        if (data.technologies) {
          setTechnologies(data.technologies);
        }
      })
      .catch((err) => {
        console.error("Erro ao carregar tecnologias:", err);
      });
  }, []);

  // Carregar vendas
  useEffect(() => {
    const loadSales = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: "20",
          ...(selectedTech && { technologyId: selectedTech }),
        });

        const response = await fetch(`/api/sales?${params}`);
        const data: SalesResponse = await response.json();

        if (!response.ok) {
          throw new Error(data.sales as any || "Erro ao carregar vendas");
        }

        setSales(data.sales);
        setTotalPages(data.pagination.totalPages);
        setTotal(data.pagination.total);
      } catch (err: any) {
        setError(err.message || "Erro ao carregar vendas");
      } finally {
        setLoading(false);
      }
    };

    loadSales();
  }, [page, selectedTech]);

  const formatCurrency = (cents: number | null) => {
    if (cents === null) return "N/A";
    const euros = cents / 100;
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency: "EUR",
    }).format(euros);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-PT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Calcular valor total
  const totalValue = sales.reduce((sum, sale) => {
    return sum + (sale.valueCents || 0);
  }, 0);

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <section className="rounded-2xl bg-white p-4 shadow-sm dark:bg-zinc-900">
        <h2 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          FILTROS
        </h2>
        <div>
          <label
            htmlFor="tech-filter"
            className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1"
          >
            Tecnologia
          </label>
          <select
            id="tech-filter"
            value={selectedTech}
            onChange={(e) => {
              setSelectedTech(e.target.value);
              setPage(1); // Reset para página 1 ao filtrar
            }}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          >
            <option value="">Todas as tecnologias</option>
            {technologies.map((tech) => (
              <option key={tech.id} value={tech.id}>
                {tech.name}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Estatísticas */}
      {sales.length > 0 && (
        <section className="rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-4 text-white shadow-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-medium opacity-90">TOTAL VENDAS</p>
              <p className="text-2xl font-bold">{total}</p>
            </div>
            <div>
              <p className="text-xs font-medium opacity-90">VALOR TOTAL</p>
              <p className="text-2xl font-bold">{formatCurrency(totalValue)}</p>
            </div>
          </div>
        </section>
      )}

      {/* Loading */}
      {loading && (
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm dark:bg-zinc-900">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            A carregar vendas...
          </p>
        </div>
      )}

      {/* Erro */}
      {error && (
        <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Lista vazia */}
      {!loading && !error && sales.length === 0 && (
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm dark:bg-zinc-900">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            📊 Nenhuma venda registada ainda.
          </p>
        </div>
      )}

      {/* Lista de vendas */}
      {!loading && !error && sales.length > 0 && (
        <div className="space-y-3">
          {sales.map((sale) => (
            <div
              key={sale.id}
              className="rounded-2xl bg-white p-4 shadow-sm dark:bg-zinc-900"
            >
              <div className="mb-2 flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {sale.company.name}
                  </h3>
                  <p className="text-sm text-emerald-600 dark:text-emerald-400">
                    {sale.technology.name}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                    {formatCurrency(sale.valueCents)}
                  </p>
                </div>
              </div>

              {sale.notes && (
                <p className="mb-2 text-sm text-zinc-600 dark:text-zinc-400">
                  📝 {sale.notes}
                </p>
              )}

              <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                <span>📅 {formatDate(sale.createdAt)}</span>
                {sale.visit && (
                  <Link
                    href={`/app/visit/${sale.visit.id}`}
                    className="text-emerald-600 hover:underline dark:text-emerald-400"
                  >
                    Ver visita →
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Paginação */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm dark:bg-zinc-900">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            ← Anterior
          </button>
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            Página {page} de {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Seguinte →
          </button>
        </div>
      )}
    </div>
  );
}
