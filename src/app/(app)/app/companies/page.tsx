import CompaniesClient from "./companies-client";
import { prisma } from "@/lib/prisma";

export default async function CompaniesPage() {
  // Buscar empresas iniciais (top 20 por ordem alfabética)
  const companies = await prisma.company.findMany({
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
  });

  // Converter Date para string para serialização
  const initialCompanies = companies.map((company) => ({
    ...company,
    createdAt: company.createdAt.toISOString(),
  }));

  return <CompaniesClient initialCompanies={initialCompanies} />;
}

