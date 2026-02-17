import { getServerSession } from "next-auth";
import { authConfig, AppSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import DashboardClient from "./dashboard-client";
import { prisma } from "@/lib/prisma";

export default async function AppDashboardPage() {
  // Validar autenticação
  const session = (await getServerSession(authConfig)) as AppSession | null;

  if (!session?.user) {
    redirect("/login");
  }

  // Se for ADMIN, redirecionar para dashboard admin
  if (session.user.role === "ADMIN") {
    redirect("/admin/dashboard");
  }

  const userId = session.user.id;

  try {
    // Buscar métricas diretamente do banco de dados
    const metrics = await getSalesMetrics(userId);
    return <DashboardClient initialData={metrics} />;
  } catch (error) {
    console.error("Erro ao buscar métricas:", error);
    
    // Retornar com dados vazios em caso de erro
    return (
      <DashboardClient
        initialData={{
          totalVisits: 0,
          totalDurationMinutes: 0,
          averageDurationMinutes: 0,
          visitsByWeek: [],
          sentimentBreakdown: { positive: 0, negative: 0, neutral: 0 },
          totalSales: 0,
          totalSalesValue: 0,
          salesByTechnology: [],
          pendingTasks: 0,
          pendingTasksList: [],
          upcomingFollowups: [],
        }}
      />
    );
  }
}

// Métricas para comerciais (SALES)
async function getSalesMetrics(userId: string) {
  // 1. Total de visitas e duração
  const visits = await prisma.visit.findMany({
    where: { userId },
    select: {
      id: true,
      checkInAt: true,
      checkOutAt: true,
      durationSeconds: true,
      aiSentiment: true,
      company: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  const totalVisits = visits.length;
  const totalDurationMinutes = Math.round(
    visits.reduce((sum, v) => sum + (v.durationSeconds || 0), 0) / 60
  );
  const averageDurationMinutes =
    totalVisits > 0 ? Math.round(totalDurationMinutes / totalVisits) : 0;

  // 2. Visitas por semana (últimas 8 semanas)
  const eightWeeksAgo = new Date();
  eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

  const visitsByWeek = await getVisitsByWeek(userId, eightWeeksAgo);

  // 3. Breakdown de sentimentos
  const sentimentBreakdown = {
    positive: visits.filter((v) => v.aiSentiment === "POSITIVE").length,
    negative: visits.filter((v) => v.aiSentiment === "NEGATIVE").length,
    neutral: visits.filter((v) => v.aiSentiment === "NEUTRAL").length,
  };

  // 4. Vendas
  const sales = await prisma.sale.findMany({
    where: { userId },
    include: {
      technology: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  const totalSales = sales.length;
  const totalSalesValue = sales.reduce((sum, s) => sum + (s.valueCents || 0), 0);

  // 5. Vendas por tecnologia
  const salesByTechnology = Object.values(
    sales.reduce((acc: any, sale) => {
      const techId = sale.technologyId;
      if (!acc[techId]) {
        acc[techId] = {
          technologyId: techId,
          technologyName: sale.technology.name,
          count: 0,
          totalValue: 0,
        };
      }
      acc[techId].count += 1;
      acc[techId].totalValue += sale.valueCents || 0;
      return acc;
    }, {})
  );

  // 6. Tarefas pendentes
  const pendingTasks = await prisma.task.findMany({
    where: {
      userId,
      status: "OPEN",
    },
    include: {
      company: {
        select: {
          id: true,
          name: true,
        },
      },
      visit: {
        select: {
          id: true,
          checkInAt: true,
        },
      },
    },
    orderBy: {
      dueAt: "asc",
    },
    take: 20,
  });

  // 7. Próximos follow-ups (visitas recentes com empresas)
  const upcomingFollowups = await prisma.visit.findMany({
    where: {
      userId,
      companyId: { not: null },
    },
    include: {
      company: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      checkInAt: "desc",
    },
    take: 10,
  });

  return {
    totalVisits,
    totalDurationMinutes,
    averageDurationMinutes,
    visitsByWeek,
    sentimentBreakdown,
    totalSales,
    totalSalesValue,
    salesByTechnology,
    pendingTasks: pendingTasks.length,
    pendingTasksList: pendingTasks,
    upcomingFollowups,
  };
}

// Helper: Agregar visitas por semana
async function getVisitsByWeek(userId: string, sinceDate: Date) {
  const visits = await prisma.visit.findMany({
    where: {
      userId,
      checkInAt: {
        gte: sinceDate,
      },
    },
    select: {
      checkInAt: true,
    },
  });

  // Agrupar por semana (número da semana do ano)
  const weekMap: Record<string, number> = {};

  visits.forEach((visit) => {
    const date = new Date(visit.checkInAt);
    const weekNumber = getWeekNumber(date);
    const key = `${date.getFullYear()}-W${weekNumber}`;
    weekMap[key] = (weekMap[key] || 0) + 1;
  });

  // Converter para array ordenado
  return Object.entries(weekMap)
    .map(([week, count]) => ({ week, count }))
    .sort((a, b) => a.week.localeCompare(b.week));
}

// Helper: Calcular número da semana do ano
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

