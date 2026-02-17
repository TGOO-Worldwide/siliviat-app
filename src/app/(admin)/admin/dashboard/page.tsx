import { getServerSession } from "next-auth";
import { authConfig, AppSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminDashboardClient from "./dashboard-client";
import { prisma } from "@/lib/prisma";

export default async function AdminDashboardPage() {
  // Validar autenticação e role
  const session = (await getServerSession(authConfig)) as AppSession | null;

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/app/dashboard");
  }

  try {
    // Buscar métricas diretamente do banco de dados
    const metrics = await getAdminMetrics();
    return <AdminDashboardClient initialData={metrics} />;
  } catch (error) {
    console.error("Erro ao buscar métricas:", error);

    // Retornar com dados vazios em caso de erro
    return (
      <AdminDashboardClient
        initialData={{
          totalVisits: 0,
          totalSales: 0,
          totalUsers: 0,
          totalCompanies: 0,
          totalTechnologies: 0,
          conversionRate: 0,
          salesRanking: [],
          recentVisits: [],
          recentSales: [],
          topTechnologies: [],
          sentimentBreakdown: { positive: 0, negative: 0, neutral: 0 },
        }}
      />
    );
  }
}

// Métricas para admin (visão global)
async function getAdminMetrics() {
  // 1. Métricas globais
  const [totalVisits, totalSales, totalUsers, totalCompanies, totalTechnologies] = await Promise.all([
    prisma.visit.count(),
    prisma.sale.count(),
    prisma.user.count({ where: { role: "SALES" } }),
    prisma.company.count(),
    prisma.technology.count({ where: { active: true } }),
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
  const recentVisitsRaw = await prisma.visit.findMany({
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

  // Serializar datas para string (compatível com AdminMetrics)
  const recentVisits = recentVisitsRaw.map((v) => ({
    id: v.id,
    checkInAt: v.checkInAt.toISOString(),
    checkOutAt: v.checkOutAt?.toISOString() ?? null,
    durationSeconds: v.durationSeconds,
    user: v.user
      ? { id: v.user.id, name: v.user.name, email: v.user.email }
      : { id: "", name: null, email: null },
    company: v.company
      ? { id: v.company.id, name: v.company.name }
      : null,
  }));

  // 4. Vendas recentes (últimas 20)
  const recentSalesRaw = await prisma.sale.findMany({
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

  const recentSales = recentSalesRaw.map((s) => ({
    id: s.id,
    createdAt: s.createdAt.toISOString(),
    valueCents: s.valueCents,
    user: s.user
      ? { id: s.user.id, name: s.user.name, email: s.user.email }
      : { id: "", name: null, email: null },
    company: s.company
      ? { id: s.company.id, name: s.company.name }
      : { id: "", name: "N/A" },
    technology: { id: s.technology.id, name: s.technology.name },
  }));

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
    totalTechnologies,
    conversionRate,
    salesRanking,
    recentVisits,
    recentSales,
    topTechnologies,
    sentimentBreakdown,
  };
}

