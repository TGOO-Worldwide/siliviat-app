import { getServerSession } from "next-auth";
import { authConfig, AppSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminDashboardClient from "./dashboard-client";

export default async function AdminDashboardPage() {
  // Validar autenticação e role
  const session = (await getServerSession(authConfig)) as AppSession | null;

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/app/dashboard");
  }

  // Buscar métricas do servidor
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

  try {
    // Fazer fetch interno para API
    const response = await fetch(`${baseUrl}/api/dashboard`, {
      headers: {
        cookie: `next-auth.session-token=${session}`,
      },
      cache: "no-store",
    });

    // Se falhar, usar dados vazios
    let metrics = {
      totalVisits: 0,
      totalSales: 0,
      totalUsers: 0,
      totalCompanies: 0,
      conversionRate: 0,
      salesRanking: [],
      recentVisits: [],
      recentSales: [],
      topTechnologies: [],
      sentimentBreakdown: { positive: 0, negative: 0, neutral: 0 },
    };

    if (response.ok) {
      metrics = await response.json();
    }

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

