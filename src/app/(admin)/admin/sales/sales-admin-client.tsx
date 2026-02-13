"use client";

import { useState } from "react";

interface Sale {
  id: string;
  createdAt: string;
  valueCents: number | null;
  notes: string | null;
  user: { id: string; name: string | null; email: string | null };
  company: { id: string; name: string };
  technology: { id: string; name: string };
  visit: { id: string; checkInAt: string } | null;
}

interface SalesAdminClientProps {
  initialSales: Sale[];
  initialTotal: number;
  technologies: { id: string; name: string }[];
}

export default function SalesAdminClient({
  initialSales,
  initialTotal,
  technologies,
}: SalesAdminClientProps) {
  const [sales, setSales] = useState<Sale[]>(initialSales);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [technologyFilter, setTechnologyFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const limit = 20;

  // Buscar vendas
  const fetchSales = async (pageNum: number = page, technologyId: string = technologyFilter) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: limit.toString(),
        ...(technologyId && { technologyId }),
      });

      const response = await fetch(`/api/sales?${params}`);
      if (response.ok) {
        const data = await response.json();
        setSales(data.sales);
        setTotal(data.pagination.total);
      } else {
        setError("Erro ao buscar vendas");
      }
    } catch (err) {
      setError("Erro ao buscar vendas");
    } finally {
      setLoading(false);
    }
  };

  // Formatar valor em euros
  const formatCurrency = (cents: number | null) => {
    if (!cents) return "N/A";
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency: "EUR",
    }).format(cents / 100);
  };

  // Paginação
  const totalPages = Math.ceil(total / limit);
  const handlePrevPage = () => {
    if (page > 1) {
      const newPage = page - 1;
      setPage(newPage);
      fetchSales(newPage);
    }
  };
  const handleNextPage = () => {
    if (page < totalPages) {
      const newPage = page + 1;
      setPage(newPage);
      fetchSales(newPage);
    }
  };

  // Calcular total de vendas em valor
  const totalValue = sales.reduce((sum, sale) => sum + (sale.valueCents || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Vendas</h1>
        <div className="rounded-lg bg-emerald-100 px-4 py-2 dark:bg-emerald-900">
          <p className="text-sm text-emerald-700 dark:text-emerald-300">Total da Página:</p>
          <p className="text-xl font-bold text-emerald-800 dark:text-emerald-200">
            {formatCurrency(totalValue)}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-100 p-3 text-red-800 dark:bg-red-900 dark:text-red-200">
          {error}
        </div>
      )}

      {/* Filtro por tecnologia */}
      <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-zinc-900">
        <label className="mb-2 block text-sm font-medium">Filtrar por Tecnologia:</label>
        <select
          value={technologyFilter}
          onChange={(e) => {
            setTechnologyFilter(e.target.value);
            setPage(1);
            fetchSales(1, e.target.value);
          }}
          className="w-full rounded-lg border border-zinc-300 px-4 py-2 dark:border-zinc-700 dark:bg-zinc-800"
        >
          <option value="">Todas</option>
          {technologies.map((tech) => (
            <option key={tech.id} value={tech.id}>
              {tech.name}
            </option>
          ))}
        </select>
      </div>

      {/* Lista de vendas */}
      <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900">
        {loading && <p className="text-center text-zinc-600">A carregar...</p>}

        {!loading && sales.length === 0 && (
          <p className="text-center text-zinc-600">Nenhuma venda encontrada.</p>
        )}

        {!loading && sales.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="pb-2 text-left font-medium">Comercial</th>
                  <th className="pb-2 text-left font-medium">Empresa</th>
                  <th className="pb-2 text-left font-medium">Tecnologia</th>
                  <th className="pb-2 text-left font-medium">Valor</th>
                  <th className="pb-2 text-left font-medium">Data</th>
                  <th className="pb-2 text-left font-medium">Notas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {sales.map((sale) => (
                  <tr key={sale.id}>
                    <td className="py-3">{sale.user.name || sale.user.email}</td>
                    <td className="py-3">{sale.company.name}</td>
                    <td className="py-3">
                      <span className="rounded bg-blue-100 px-2 py-1 text-xs dark:bg-blue-900">
                        {sale.technology.name}
                      </span>
                    </td>
                    <td className="py-3 font-medium text-emerald-600">
                      {formatCurrency(sale.valueCents)}
                    </td>
                    <td className="py-3">
                      {new Date(sale.createdAt).toLocaleDateString("pt-PT")}
                    </td>
                    <td className="py-3">
                      {sale.notes ? (
                        <span className="text-xs text-zinc-600" title={sale.notes}>
                          {sale.notes.length > 30
                            ? sale.notes.substring(0, 30) + "..."
                            : sale.notes}
                        </span>
                      ) : (
                        "—"
                      )}
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
              Página {page} de {totalPages} ({total} vendas)
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
