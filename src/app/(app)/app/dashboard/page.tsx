import { getServerSession } from "next-auth";
import { authConfig, AppSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import DashboardClient from "./dashboard-client";

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

  // Buscar métricas do servidor
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  
  try {
    // Fazer fetch interno para API
    const response = await fetch(`${baseUrl}/api/dashboard`, {
      headers: {
        cookie: `next-auth.session-token=${session}`, // Passar sessão
      },
      cache: "no-store", // Sempre buscar dados frescos
    });

    // Se falhar, usar dados vazios
    let metrics = {
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
    };

    if (response.ok) {
      metrics = await response.json();
    }

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

