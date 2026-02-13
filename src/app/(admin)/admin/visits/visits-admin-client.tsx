"use client";

import { useState } from "react";
import Link from "next/link";

interface Visit {
  id: string;
  checkInAt: string;
  checkOutAt: string | null;
  durationSeconds: number | null;
  aiSentiment: string | null;
  user: { id: string; name: string | null; email: string | null } | null;
  company: { id: string; name: string } | null;
  _count: {
    sales: number;
  };
}

interface VisitsAdminClientProps {
  initialVisits: Visit[];
  initialTotal: number;
}

export default function VisitsAdminClient({
  initialVisits,
  initialTotal,
}: VisitsAdminClientProps) {
  const [visits, setVisits] = useState<Visit[]>(initialVisits);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const limit = 20;

  // Buscar visitas
  const fetchVisits = async (pageNum: number = page, status: string = statusFilter) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: limit.toString(),
        ...(status && { status }),
      });

      const response = await fetch(`/api/admin/visits?${params}`);
      if (response.ok) {
        const data = await response.json();
        setVisits(data.visits);
        setTotal(data.pagination.total);
      } else {
        setError("Erro ao buscar visitas");
      }
    } catch (err) {
      setError("Erro ao buscar visitas");
    } finally {
      setLoading(false);
    }
  };

  // Formatar duração
  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "—";
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}min`;
    }
    return `${mins}min`;
  };

  // Paginação
  const totalPages = Math.ceil(total / limit);
  const handlePrevPage = () => {
    if (page > 1) {
      const newPage = page - 1;
      setPage(newPage);
      fetchVisits(newPage);
    }
  };
  const handleNextPage = () => {
    if (page < totalPages) {
      const newPage = page + 1;
      setPage(newPage);
      fetchVisits(newPage);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Visitas</h1>

      {error && (
        <div className="rounded-lg bg-red-100 p-3 text-red-800 dark:bg-red-900 dark:text-red-200">
          {error}
        </div>
      )}

      {/* Filtro por status */}
      <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-zinc-900">
        <label className="mb-2 block text-sm font-medium">Filtrar por Status:</label>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
            fetchVisits(1, e.target.value);
          }}
          className="w-full rounded-lg border border-zinc-300 px-4 py-2 dark:border-zinc-700 dark:bg-zinc-800"
        >
          <option value="">Todas</option>
          <option value="active">Em Curso</option>
          <option value="completed">Concluídas</option>
        </select>
      </div>

      {/* Lista de visitas */}
      <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900">
        {loading && <p className="text-center text-zinc-600">A carregar...</p>}

        {!loading && visits.length === 0 && (
          <p className="text-center text-zinc-600">Nenhuma visita encontrada.</p>
        )}

        {!loading && visits.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="pb-2 text-left font-medium">Comercial</th>
                  <th className="pb-2 text-left font-medium">Empresa</th>
                  <th className="pb-2 text-left font-medium">Check-in</th>
                  <th className="pb-2 text-left font-medium">Duração</th>
                  <th className="pb-2 text-left font-medium">Sentimento</th>
                  <th className="pb-2 text-left font-medium">Vendas</th>
                  <th className="pb-2 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {visits.map((visit) => (
                  <tr key={visit.id}>
                    <td className="py-3">{visit.user?.name || visit.user?.email || "—"}</td>
                    <td className="py-3">{visit.company?.name || "—"}</td>
                    <td className="py-3">
                      {new Date(visit.checkInAt).toLocaleString("pt-PT")}
                    </td>
                    <td className="py-3">
                      {visit.checkOutAt ? formatDuration(visit.durationSeconds) : "Em curso"}
                    </td>
                    <td className="py-3">
                      {visit.aiSentiment ? (
                        <span
                          className={`rounded px-2 py-1 text-xs ${
                            visit.aiSentiment === "POSITIVE"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
                              : visit.aiSentiment === "NEGATIVE"
                              ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                              : "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
                          }`}
                        >
                          {visit.aiSentiment === "POSITIVE"
                            ? "Positivo"
                            : visit.aiSentiment === "NEGATIVE"
                            ? "Negativo"
                            : "Neutro"}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-3">{visit._count.sales}</td>
                    <td className="py-3 text-right">
                      <Link
                        href={`/app/visit/${visit.id}`}
                        className="text-emerald-600 hover:underline"
                      >
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-zinc-600">
              Página {page} de {totalPages} ({total} visitas)
            </p>
            <div className="flex gap-2">
              <button
                onClick={handlePrevPage}
                disabled={page === 1}
                className="rounded-lg bg-zinc-200 px-4 py-2 text-sm disabled:opacity-50 dark:bg-zinc-800"
              >
                Anterior
              </button>
              <button
                onClick={handleNextPage}
                disabled={page === totalPages}
                className="rounded-lg bg-zinc-200 px-4 py-2 text-sm disabled:opacity-50 dark:bg-zinc-800"
              >
                Seguinte
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
