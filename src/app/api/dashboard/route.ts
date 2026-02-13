import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig, AppSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    // 1. Validar autenticação
    const session = (await getServerSession(authConfig)) as AppSession | null;
    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const userId = session.user.id;
    const isAdmin = session.user.role === "ADMIN";

    // 2. Se for SALES, retornar métricas próprias
    if (!isAdmin) {
      const metrics = await getSalesMetrics(userId);
      return NextResponse.json(metrics);
    }

    // 3. Se for ADMIN, retornar métricas globais
    const metrics = await getAdminMetrics();
    return NextResponse.json(metrics);
  } catch (error) {
    console.error("Erro ao buscar métricas:", error);
    return NextResponse.json(
      { error: "Erro interno ao buscar métricas" },
      { status: 500 }
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
    take: 20, // Limite de 20 tarefas
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
    take: 10, // Limite de 10 follow-ups
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

// Métricas para admin (visão global)
async function getAdminMetrics() {
  // 1. Métricas globais
  const [totalVisits, totalSales, totalUsers, totalCompanies] = await Promise.all([
    prisma.visit.count(),
    prisma.sale.count(),
    prisma.user.count({ where: { role: "SALES" } }),
    prisma.company.count(),
  ]);

  // 2. Ranking de comerciais por visitas
  const salesUsersWithVisits = await prisma.user.findMany({
    where: { role: "SALES" },
    select: {
      id: true,
      name: true,
      email: true,
      _count: {
        select: {
          visits: true,
          sales: true,
        },
      },
      visits: {
        select: {
          durationSeconds: true,
        },
      },
    },
  });

  const salesRanking = salesUsersWithVisits
    .map((user) => ({
      userId: user.id,
      userName: user.name || user.email,
      totalVisits: user._count.visits,
      totalSales: user._count.sales,
      totalDurationMinutes: Math.round(
        user.visits.reduce((sum, v) => sum + (v.durationSeconds || 0), 0) / 60
      ),
    }))
    .sort((a, b) => b.totalVisits - a.totalVisits);

  // 3. Visitas recentes (últimas 20)
  const recentVisits = await prisma.visit.findMany({
    orderBy: { checkInAt: "desc" },
    take: 20,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      company: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  // 4. Vendas recentes (últimas 20)
  const recentSales = await prisma.sale.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      company: {
        select: {
          id: true,
          name: true,
        },
      },
      technology: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  // 5. Tecnologias mais vendidas
  const salesByTechnology = await prisma.sale.groupBy({
    by: ["technologyId"],
    _count: {
      id: true,
    },
    _sum: {
      valueCents: true,
    },
  });

  const technologyIds = salesByTechnology.map((s) => s.technologyId);
  const technologies = await prisma.technology.findMany({
    where: { id: { in: technologyIds } },
    select: { id: true, name: true },
  });

  const techMap = technologies.reduce((acc: any, tech) => {
    acc[tech.id] = tech.name;
    return acc;
  }, {});

  const topTechnologies = salesByTechnology
    .map((s) => ({
      technologyId: s.technologyId,
      technologyName: techMap[s.technologyId] || "Desconhecida",
      count: s._count.id,
      totalValue: s._sum.valueCents || 0,
    }))
    .sort((a, b) => b.count - a.count);

  // 6. Taxa de conversão (visitas com empresa → vendas)
  const visitsWithCompany = await prisma.visit.count({
    where: { companyId: { not: null } },
  });
  const conversionRate =
    visitsWithCompany > 0
      ? Math.round((totalSales / visitsWithCompany) * 100)
      : 0;

  // 7. Breakdown de sentimentos (global)
  const sentimentCounts = await prisma.visit.groupBy({
    by: ["aiSentiment"],
    _count: {
      id: true,
    },
  });

  const sentimentBreakdown = {
    positive:
      sentimentCounts.find((s) => s.aiSentiment === "POSITIVE")?._count.id || 0,
    negative:
      sentimentCounts.find((s) => s.aiSentiment === "NEGATIVE")?._count.id || 0,
    neutral:
      sentimentCounts.find((s) => s.aiSentiment === "NEUTRAL")?._count.id || 0,
  };

  return {
    totalVisits,
    totalSales,
    totalUsers,
    totalCompanies,
    conversionRate,
    salesRanking,
    recentVisits,
    recentSales,
    topTechnologies,
    sentimentBreakdown,
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
