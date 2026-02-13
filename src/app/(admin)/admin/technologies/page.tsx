import { getServerSession } from "next-auth";
import { authConfig, AppSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import TechnologiesAdminClient from "./technologies-admin-client";

export default async function AdminTechnologiesPage() {
  // Validar autenticação e role
  const session = (await getServerSession(authConfig)) as AppSession | null;

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/app/dashboard");
  }

  // Buscar todas as tecnologias (ativas e inativas)
  const technologies = await prisma.technology.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      description: true,
      active: true,
      _count: {
        select: {
          sales: true,
        },
      },
    },
  });

  return <TechnologiesAdminClient initialTechnologies={technologies} />;
}

