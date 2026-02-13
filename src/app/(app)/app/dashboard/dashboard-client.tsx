"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface SalesMetrics {
  totalVisits: number;
  totalDurationMinutes: number;
  averageDurationMinutes: number;
  visitsByWeek: { week: string; count: number }[];
  sentimentBreakdown: {
    positive: number;
    negative: number;
    neutral: number;
  };
  totalSales: number;
  totalSalesValue: number;
  salesByTechnology: {
    technologyId: string;
    technologyName: string;
    count: number;
    totalValue: number;
  }[];
  pendingTasks: number;
  pendingTasksList: {
    id: string;
    title: string;
    dueAt: string | null;
    source: string;
    company: { id: string; name: string } | null;
    visit: { id: string; checkInAt: string } | null;
  }[];
  upcomingFollowups: {
    id: string;
    checkInAt: string;
    suggestedFollowup: any;
    company: { id: string; name: string } | null;
  }[];
}

interface DashboardClientProps {
  initialData: SalesMetrics;
}

export default function DashboardClient({ initialData }: DashboardClientProps) {
  const [metrics, setMetrics] = useState<SalesMetrics>(initialData);
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

  // Calcular taxa de sentimento positivo
  const totalWithSentiment =
    metrics.sentimentBreakdown.positive +
    metrics.sentimentBreakdown.negative +
    metrics.sentimentBreakdown.neutral;
  const positiveRate =
    totalWithSentiment > 0
      ? Math.round((metrics.sentimentBreakdown.positive / totalWithSentiment) * 100)
      : 0;

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

  return (
    <div className="space-y-6">
      {/* Header com botão de atualizar */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard do Comercial</h1>
        <button
          onClick={refreshData}
          disabled={loading}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {loading ? "A atualizar..." : "↻ Atualizar"}
        </button>
      </div>

      {/* Cards de KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Visitas */}
        <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
              Total de Visitas
            </p>
            <span className="text-2xl">📊</span>
          </div>
          <p className="mt-2 text-3xl font-bold">{metrics.totalVisits}</p>
          <p className="mt-1 text-xs text-zinc-500">
            Média: {formatDuration(metrics.averageDurationMinutes)} por visita
          </p>
        </div>

        {/* Tempo em Cliente */}
        <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
              Tempo Total
            </p>
            <span className="text-2xl">⏱️</span>
          </div>
          <p className="mt-2 text-3xl font-bold">
            {formatDuration(metrics.totalDurationMinutes)}
          </p>
          <p className="mt-1 text-xs text-zinc-500">Tempo em clientes</p>
        </div>

        {/* Taxa de Sentimento Positivo */}
        <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
              Sentimento Positivo
            </p>
            <span className="text-2xl">😊</span>
          </div>
          <p className="mt-2 text-3xl font-bold">{positiveRate}%</p>
          <p className="mt-1 text-xs text-zinc-500">
            {metrics.sentimentBreakdown.positive} de {totalWithSentiment} visitas
          </p>
        </div>

        {/* Vendas */}
        <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
              Vendas Totais
            </p>
            <span className="text-2xl">💰</span>
          </div>
          <p className="mt-2 text-3xl font-bold">{metrics.totalSales}</p>
          <p className="mt-1 text-xs text-zinc-500">
            {formatCurrency(metrics.totalSalesValue)}
          </p>
        </div>
      </div>

      {/* Gráfico simples de visitas por semana */}
      {metrics.visitsByWeek.length > 0 && (
        <section className="rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900">
          <h2 className="mb-4 text-lg font-semibold">Visitas por Semana</h2>
          <div className="flex items-end justify-between gap-2" style={{ height: "200px" }}>
            {metrics.visitsByWeek.map((week) => {
              const maxCount = Math.max(...metrics.visitsByWeek.map((w) => w.count));
              const heightPercent = maxCount > 0 ? (week.count / maxCount) * 100 : 0;

              return (
                <div key={week.week} className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex w-full flex-col items-center gap-1">
                    <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      {week.count}
                    </span>
                    <div
                      className="w-full rounded-t-lg bg-emerald-500"
                      style={{ height: `${heightPercent}%`, minHeight: week.count > 0 ? "20px" : "0" }}
                    />
                  </div>
                  <span className="text-[10px] text-zinc-500">
                    {week.week.split("-W")[1]}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Vendas por Tecnologia */}
      {metrics.salesByTechnology.length > 0 && (
        <section className="rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900">
          <h2 className="mb-4 text-lg font-semibold">Vendas por Tecnologia</h2>
          <div className="space-y-3">
            {metrics.salesByTechnology.map((tech) => (
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

      {/* Tarefas Pendentes */}
      <section className="rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Tarefas Pendentes</h2>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-800 dark:bg-amber-900 dark:text-amber-200">
            {metrics.pendingTasks}
          </span>
        </div>

        {metrics.pendingTasksList.length === 0 ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Sem tarefas pendentes. Bom trabalho! 🎉
          </p>
        ) : (
          <div className="space-y-3">
            {metrics.pendingTasksList.map((task) => (
              <div
                key={task.id}
                className="flex items-start gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
              >
                <input type="checkbox" className="mt-1" disabled />
                <div className="flex-1">
                  <p className="font-medium">{task.title}</p>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                    {task.company && (
                      <span className="rounded bg-blue-100 px-2 py-0.5 dark:bg-blue-900">
                        {task.company.name}
                      </span>
                    )}
                    {task.source === "AI" && (
                      <span className="rounded bg-purple-100 px-2 py-0.5 dark:bg-purple-900">
                        Sugerida por IA
                      </span>
                    )}
                    {task.dueAt && (
                      <span className="rounded bg-amber-100 px-2 py-0.5 dark:bg-amber-900">
                        Vence: {new Date(task.dueAt).toLocaleDateString("pt-PT")}
                      </span>
                    )}
                  </div>
                  {task.visit && (
                    <Link
                      href={`/app/visit/${task.visit.id}`}
                      className="mt-1 text-xs text-emerald-600 hover:underline"
                    >
                      Ver visita relacionada →
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Próximos Follow-ups */}
      {metrics.upcomingFollowups.length > 0 && (
        <section className="rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900">
          <h2 className="mb-4 text-lg font-semibold">Próximos Follow-ups</h2>
          <div className="space-y-3">
            {metrics.upcomingFollowups.map((followup) => {
              const suggestion = followup.suggestedFollowup as any;
              return (
                <div
                  key={followup.id}
                  className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">
                        {followup.company?.name || "Empresa não especificada"}
                      </p>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        Visita em: {new Date(followup.checkInAt).toLocaleDateString("pt-PT")}
                      </p>
                      {suggestion?.channel && (
                        <p className="mt-1 text-xs text-zinc-500">
                          Canal: {suggestion.channel}
                        </p>
                      )}
                    </div>
                    <Link
                      href={`/app/visit/${followup.id}`}
                      className="text-sm text-emerald-600 hover:underline"
                    >
                      Ver detalhes →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
