"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Company {
  id: string;
  name: string;
  address: string | null;
}

interface Visit {
  id: string;
  checkInAt: string;
  checkOutAt: string | null;
  company: Company | null;
  _count: {
    sales: number;
  };
}

interface VisitsResponse {
  visits: Visit[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function VisitsClient() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("");

  // Carregar visitas
  useEffect(() => {
    const loadVisits = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: "20",
          ...(statusFilter && { status: statusFilter }),
        });

        const response = await fetch(`/api/visits?${params}`);
        const data: VisitsResponse = await response.json();

        if (!response.ok) {
          throw new Error(data.visits as any || "Erro ao carregar visitas");
        }

        setVisits(data.visits);
        setTotalPages(data.pagination.totalPages);
        setTotal(data.pagination.total);
      } catch (err: any) {
        setError(err.message || "Erro ao carregar visitas");
      } finally {
        setLoading(false);
      }
    };

    loadVisits();
  }, [page, statusFilter]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-PT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const calculateDuration = (checkIn: string, checkOut: string | null) => {
    if (!checkOut) return null;
    
    const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // Calcular estatísticas
  const activeVisits = visits.filter(v => !v.checkOutAt).length;
  const completedVisits = visits.filter(v => v.checkOutAt).length;
  const totalSales = visits.reduce((sum, visit) => sum + visit._count.sales, 0);

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <section className="rounded-2xl bg-white p-4 shadow-sm dark:bg-zinc-900">
        <h2 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          FILTROS
        </h2>
        <div>
          <label
            htmlFor="status-filter"
            className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1"
          >
            Estado
          </label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1); // Reset para página 1 ao filtrar
            }}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          >
            <option value="">Todas as visitas</option>
            <option value="active">Visitas ativas</option>
            <option value="completed">Visitas concluídas</option>
          </select>
        </div>
      </section>

      {/* Estatísticas */}
      {visits.length > 0 && (
        <section className="rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 p-4 text-white shadow-sm">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-xs font-medium opacity-90">TOTAL</p>
              <p className="text-2xl font-bold">{total}</p>
            </div>
            <div>
              <p className="text-xs font-medium opacity-90">ATIVAS</p>
              <p className="text-2xl font-bold">{activeVisits}</p>
            </div>
            <div>
              <p className="text-xs font-medium opacity-90">VENDAS</p>
              <p className="text-2xl font-bold">{totalSales}</p>
            </div>
          </div>
        </section>
      )}

      {/* Loading */}
      {loading && (
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm dark:bg-zinc-900">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            A carregar visitas...
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
      {!loading && !error && visits.length === 0 && (
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm dark:bg-zinc-900">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            🏢 Nenhuma visita registada ainda.
          </p>
          <Link
            href="/app/checkin"
            className="mt-4 inline-block rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600"
          >
            Fazer check-in
          </Link>
        </div>
      )}

      {/* Lista de visitas */}
      {!loading && !error && visits.length > 0 && (
        <div className="space-y-3">
          {visits.map((visit) => {
            const isActive = !visit.checkOutAt;
            const duration = calculateDuration(visit.checkInAt, visit.checkOutAt);

            return (
              <Link
                key={visit.id}
                href={`/app/visit/${visit.id}`}
                className="block rounded-2xl bg-white p-4 shadow-sm transition-all hover:shadow-md dark:bg-zinc-900"
              >
                <div className="mb-2 flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {visit.company?.name || "—"}
                      </h3>
                      {isActive && (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          ATIVA
                        </span>
                      )}
                    </div>
                    {visit.company?.address && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        📍 {visit.company.address}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-1 text-sm">
                  <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400">
                    <span>Check-in:</span>
                    <span className="font-medium">{formatDate(visit.checkInAt)}</span>
                  </div>
                  
                  {visit.checkOutAt && (
                    <>
                      <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400">
                        <span>Check-out:</span>
                        <span className="font-medium">{formatDate(visit.checkOutAt)}</span>
                      </div>
                      {duration && (
                        <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400">
                          <span>Duração:</span>
                          <span className="font-medium">{duration}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {visit._count.sales > 0 && (
                  <div className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-center text-sm dark:bg-emerald-900/20">
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                      💰 {visit._count.sales} venda{visit._count.sales !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}

                <div className="mt-3 text-right">
                  <span className="text-xs text-emerald-600 dark:text-emerald-400">
                    Ver detalhes →
                  </span>
                </div>
              </Link>
            );
          })}
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
