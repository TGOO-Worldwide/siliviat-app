"use client";

import { useState } from "react";
import Link from "next/link";

interface AdminMetrics {
  totalVisits: number;
  totalSales: number;
  totalUsers: number;
  totalCompanies: number;
  totalTechnologies: number;
  conversionRate: number;
  salesRanking: {
    userId: string;
    userName: string | null;
    totalVisits: number;
    totalSales: number;
    totalDurationMinutes: number;
  }[];
  recentVisits: {
    id: string;
    checkInAt: string;
    checkOutAt: string | null;
    durationSeconds: number | null;
    user: { id: string; name: string | null; email: string | null };
    company: { id: string; name: string } | null;
  }[];
  recentSales: {
    id: string;
    createdAt: string;
    valueCents: number | null;
    user: { id: string; name: string | null; email: string | null };
    company: { id: string; name: string };
    technology: { id: string; name: string };
  }[];
  topTechnologies: {
    technologyId: string;
    technologyName: string;
    count: number;
    totalValue: number;
  }[];
  sentimentBreakdown: {
    positive: number;
    negative: number;
    neutral: number;
  };
}

interface AdminDashboardClientProps {
  initialData: AdminMetrics;
}

export default function AdminDashboardClient({ initialData }: AdminDashboardClientProps) {
  const [metrics, setMetrics] = useState<AdminMetrics>(initialData);
  const [loading, setLoading] = useState(false);

  // Função para recarregar dados
  const refreshData = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/dashboard");
      if (response.ok) {
        const data = await response.json();
        setMetrics(data);
      }
    } catch (error) {
      console.error("Erro ao recarregar métricas:", error);
    } finally {
      setLoading(false);
    }
  };

  // Formatar valor em euros
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency: "EUR",
    }).format(cents / 100);
  };

  // Formatar duração em horas e minutos
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}min`;
    }
    return `${mins}min`;
  };

  // Calcular total de vendas em valor
  const totalSalesValue = metrics.recentSales.reduce(
    (sum, sale) => sum + (sale.valueCents || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Header com botão de atualizar */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard Administrativo</h1>
        <button
          onClick={refreshData}
          disabled={loading}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {loading ? "A atualizar..." : "↻ Atualizar"}
        </button>
      </div>

      {/* Cards de Visão Geral */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
              Total de Visitas
            </p>
            <span className="text-2xl">📊</span>
          </div>
          <p className="mt-2 text-3xl font-bold">{metrics.totalVisits}</p>
          <Link
            href="/admin/visits"
            className="mt-1 text-xs text-emerald-600 hover:underline"
          >
            Ver todas →
          </Link>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
              Total de Vendas
            </p>
            <span className="text-2xl">💰</span>
          </div>
          <p className="mt-2 text-3xl font-bold">{metrics.totalSales}</p>
          <Link
            href="/admin/sales"
            className="mt-1 text-xs text-emerald-600 hover:underline"
          >
            Ver todas →
          </Link>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
              Comerciais
            </p>
            <span className="text-2xl">👥</span>
          </div>
          <p className="mt-2 text-3xl font-bold">{metrics.totalUsers}</p>
          <Link
            href="/admin/users"
            className="mt-1 text-xs text-emerald-600 hover:underline"
          >
            Gerir →
          </Link>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
              Tecnologias
            </p>
            <span className="text-2xl">🔧</span>
          </div>
          <p className="mt-2 text-3xl font-bold">{metrics.totalTechnologies}</p>
          <Link
            href="/admin/technologies"
            className="mt-1 text-xs text-emerald-600 hover:underline"
          >
            Gerir →
          </Link>
        </div>
      </div>

      {/* Cards de Métricas Secundárias */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
              Taxa de Conversão
            </p>
            <span className="text-2xl">📈</span>
          </div>
          <p className="mt-2 text-3xl font-bold">{metrics.conversionRate}%</p>
          <p className="mt-1 text-xs text-zinc-500">Visitas → Vendas</p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
              Empresas
            </p>
            <span className="text-2xl">🏢</span>
          </div>
          <p className="mt-2 text-3xl font-bold">{metrics.totalCompanies}</p>
          <Link
            href="/admin/companies"
            className="mt-1 text-xs text-emerald-600 hover:underline"
          >
            Ver todas →
          </Link>
        </div>
      </div>

      {/* Breakdown de Sentimentos */}
      <section className="rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900">
        <h2 className="mb-4 text-lg font-semibold">Sentimento das Visitas</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950">
            <p className="text-sm text-emerald-700 dark:text-emerald-300">Positivas</p>
            <p className="mt-1 text-2xl font-bold text-emerald-800 dark:text-emerald-200">
              {metrics.sentimentBreakdown.positive}
            </p>
          </div>
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
            <p className="text-sm text-red-700 dark:text-red-300">Negativas</p>
            <p className="mt-1 text-2xl font-bold text-red-800 dark:text-red-200">
              {metrics.sentimentBreakdown.negative}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
            <p className="text-sm text-zinc-700 dark:text-zinc-300">Neutras</p>
            <p className="mt-1 text-2xl font-bold text-zinc-800 dark:text-zinc-200">
              {metrics.sentimentBreakdown.neutral}
            </p>
          </div>
        </div>
      </section>

      {/* Ranking de Comerciais */}
      <section className="rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900">
        <h2 className="mb-4 text-lg font-semibold">Ranking de Comerciais</h2>
        <div className="space-y-3">
          {metrics.salesRanking.length === 0 ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Sem comerciais registados.
            </p>
          ) : (
            metrics.salesRanking.map((user, index) => (
              <div
                key={user.userId}
                className="flex items-center justify-between rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                    #{index + 1}
                  </div>
                  <div>
                    <p className="font-medium">{user.userName || "Sem nome"}</p>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      {user.totalVisits} visitas • {formatDuration(user.totalDurationMinutes)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-emerald-600">{user.totalSales}</p>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">vendas</p>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Tecnologias Mais Vendidas */}
      {metrics.topTechnologies.length > 0 && (
        <section className="rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Tecnologias Mais Vendidas</h2>
            <Link
              href="/admin/technologies"
              className="text-sm text-emerald-600 hover:underline"
            >
              Gerir tecnologias →
            </Link>
          </div>
          <div className="space-y-3">
            {metrics.topTechnologies.slice(0, 5).map((tech) => (
              <div
                key={tech.technologyId}
                className="flex items-center justify-between rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
              >
                <div>
                  <p className="font-medium">{tech.technologyName}</p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    {tech.count} {tech.count === 1 ? "venda" : "vendas"}
                  </p>
                </div>
                <p className="text-lg font-bold text-emerald-600">
                  {formatCurrency(tech.totalValue)}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Visitas Recentes */}
      <section className="rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Visitas Recentes</h2>
          <Link
            href="/admin/visits"
            className="text-sm text-emerald-600 hover:underline"
          >
            Ver todas →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="pb-2 text-left font-medium">Comercial</th>
                <th className="pb-2 text-left font-medium">Empresa</th>
                <th className="pb-2 text-left font-medium">Data</th>
                <th className="pb-2 text-left font-medium">Duração</th>
                <th className="pb-2 text-left font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {metrics.recentVisits.slice(0, 10).map((visit) => (
                <tr key={visit.id}>
                  <td className="py-2">{visit.user.name || visit.user.email}</td>
                  <td className="py-2">{visit.company?.name || "N/A"}</td>
                  <td className="py-2">
                    {new Date(visit.checkInAt).toLocaleDateString("pt-PT")}
                  </td>
                  <td className="py-2">
                    {visit.durationSeconds
                      ? formatDuration(Math.round(visit.durationSeconds / 60))
                      : "Em curso"}
                  </td>
                  <td className="py-2">
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
      </section>

      {/* Vendas Recentes */}
      <section className="rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Vendas Recentes</h2>
          <Link href="/admin/sales" className="text-sm text-emerald-600 hover:underline">
            Ver todas →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="pb-2 text-left font-medium">Comercial</th>
                <th className="pb-2 text-left font-medium">Empresa</th>
                <th className="pb-2 text-left font-medium">Tecnologia</th>
                <th className="pb-2 text-left font-medium">Valor</th>
                <th className="pb-2 text-left font-medium">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {metrics.recentSales.slice(0, 10).map((sale) => (
                <tr key={sale.id}>
                  <td className="py-2">{sale.user.name || sale.user.email}</td>
                  <td className="py-2">{sale.company.name}</td>
                  <td className="py-2">{sale.technology.name}</td>
                  <td className="py-2 font-medium">
                    {sale.valueCents ? formatCurrency(sale.valueCents) : "N/A"}
                  </td>
                  <td className="py-2">
                    {new Date(sale.createdAt).toLocaleDateString("pt-PT")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
