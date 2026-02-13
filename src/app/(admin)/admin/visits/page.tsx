import { getServerSession } from "next-auth";
import { authConfig, AppSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import VisitsAdminClient from "./visits-admin-client";

export default async function AdminVisitsPage() {
  // Validar autenticação e role
  const session = (await getServerSession(authConfig)) as AppSession | null;

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/app/dashboard");
  }

  // Buscar visitas iniciais (primeiras 20)
  const [visits, total] = await Promise.all([
    prisma.visit.findMany({
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
        _count: {
          select: {
            sales: true,
          },
        },
      },
    }),
    prisma.visit.count(),
  ]);

  // Converter dates para strings
  const visitsFormatted = visits.map((v) => ({
    ...v,
    checkInAt: v.checkInAt.toISOString(),
    checkOutAt: v.checkOutAt?.toISOString() || null,
  }));

  return <VisitsAdminClient initialVisits={visitsFormatted} initialTotal={total} />;
}

