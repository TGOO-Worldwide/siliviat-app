import { getServerSession } from "next-auth";
import { authConfig, AppSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import UsersAdminClient from "./users-admin-client";

export default async function AdminUsersPage() {
  // Validar autenticação e role
  const session = (await getServerSession(authConfig)) as AppSession | null;

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/app/dashboard");
  }

  // Buscar usuários iniciais (primeiros 20)
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        passkeyEnabled: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            visits: true,
            sales: true,
            tasks: true,
          },
        },
      },
    }),
    prisma.user.count(),
  ]);

  // Converter dates para strings
  const usersFormatted = users.map((u) => ({
    ...u,
    createdAt: u.createdAt.toISOString(),
  }));

  return <UsersAdminClient initialUsers={usersFormatted} initialTotal={total} />;
}

