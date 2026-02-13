import { getServerSession } from "next-auth";
import { authConfig, AppSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import CompaniesAdminClient from "./companies-admin-client";

export default async function AdminCompaniesPage() {
  // Validar autenticação e role
  const session = (await getServerSession(authConfig)) as AppSession | null;

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/app/dashboard");
  }

  // Buscar empresas iniciais (primeiras 20)
  const [companies, total] = await Promise.all([
    prisma.company.findMany({
      orderBy: { name: "asc" },
      take: 20,
      select: {
        id: true,
        name: true,
        address: true,
        phone: true,
        email: true,
        nif: true,
        createdAt: true,
        _count: {
          select: {
            visits: true,
            sales: true,
          },
        },
      },
    }),
    prisma.company.count(),
  ]);

  // Converter dates para strings
  const companiesFormatted = companies.map((c) => ({
    ...c,
    createdAt: c.createdAt.toISOString(),
  }));

  return <CompaniesAdminClient initialCompanies={companiesFormatted} initialTotal={total} />;
}

