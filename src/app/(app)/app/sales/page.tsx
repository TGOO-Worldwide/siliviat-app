import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SalesClient } from "./sales-client";

interface AuthSession {
  user: {
    id: string;
    role: "ADMIN" | "SALES";
    name?: string | null;
    email?: string | null;
  };
}

export default async function SalesPage() {
  // Verificar autenticação
  const session = (await getServerSession(authConfig)) as AuthSession | null;
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl bg-white p-4 shadow-sm dark:bg-zinc-900">
        <h1 className="text-lg font-semibold">💰 Minhas Vendas</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Histórico de vendas registadas
        </p>
      </section>

      <SalesClient />
    </div>
  );
}
