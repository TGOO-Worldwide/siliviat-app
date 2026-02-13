import { getServerSession } from "next-auth";
import { authConfig, AppSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import SalesAdminClient from "./sales-admin-client";

export default async function AdminSalesPage() {
  // Validar autenticação e role
  const session = (await getServerSession(authConfig)) as AppSession | null;

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/app/dashboard");
  }

  // Buscar vendas iniciais (primeiras 20) e tecnologias para filtro
  const [sales, total, technologies] = await Promise.all([
    prisma.sale.findMany({
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
        visit: {
          select: {
            id: true,
            checkInAt: true,
          },
        },
      },
    }),
    prisma.sale.count(),
    prisma.technology.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  // Converter dates para strings
  const salesFormatted = sales.map((s) => ({
    ...s,
    createdAt: s.createdAt.toISOString(),
    visit: s.visit
      ? {
          ...s.visit,
          checkInAt: s.visit.checkInAt.toISOString(),
        }
      : null,
  }));

  return (
    <SalesAdminClient
      initialSales={salesFormatted}
      initialTotal={total}
      technologies={technologies}
    />
  );
}

