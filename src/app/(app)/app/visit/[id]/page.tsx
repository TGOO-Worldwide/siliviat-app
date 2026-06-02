import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { VisitAudioSection } from "./visit-audio-section";
import { SaleForm } from "./sale-form";
import { VisitCompanySection } from "./visit-company-section";

interface AuthSession {
  user: {
    id: string;
    role: "ADMIN" | "SALES";
    name?: string | null;
    email?: string | null;
  };
}

interface VisitPageProps {
  params: Promise<{ id: string }>;
}

export default async function VisitPage({ params }: VisitPageProps) {
  // 1. Verificar autenticação
  const session = (await getServerSession(authConfig)) as AuthSession | null;
  if (!session?.user) {
    redirect("/login");
  }

  // 2. Await params
  const { id } = await params;

  // 3. Buscar visita com relacionamentos
  const visit = await prisma.visit.findUnique({
    where: { id },
    include: {
      company: {
        select: {
          id: true,
          name: true,
          address: true,
          phone: true,
          email: true,
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      sales: {
        include: {
          technology: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!visit) {
    notFound();
  }

  // 3. Verificar permissões (apenas dono ou ADMIN)
  if (visit.userId !== session.user.id && session.user.role !== "ADMIN") {
    return (
      <div className="space-y-4">
        <section className="rounded-2xl bg-white p-4 shadow-sm dark:bg-zinc-900">
          <h1 className="mb-2 text-lg font-semibold text-red-600">
            ⛔ Acesso Negado
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Não tem permissão para ver esta visita.
          </p>
        </section>
      </div>
    );
  }

  // 4. Calcular duração (se check-out feito)
  const getDuration = () => {
    if (!visit.checkOutAt) return null;
    const durationMs =
      new Date(visit.checkOutAt).getTime() -
      new Date(visit.checkInAt).getTime();
    const minutes = Math.floor(durationMs / 1000 / 60);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${minutes}m`;
  };

  const duration = getDuration();

  return (
    <div className="space-y-4">
      {/* Header da Visita */}
      <section className="rounded-2xl bg-white p-4 shadow-sm dark:bg-zinc-900">
        <h1 className="mb-3 text-lg font-semibold">
          📍 Detalhe da Visita
        </h1>

        <div className="space-y-3">
          {/* Empresa */}
          <VisitCompanySection
            visitId={visit.id}
            company={visit.company}
          />

          {/* Comercial */}
          <div>
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              COMERCIAL
            </p>
            <p className="text-base text-zinc-900 dark:text-zinc-100">
              {visit.user?.name || visit.user?.email || "Desconhecido"}
            </p>
          </div>

          {/* Tempos */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                CHECK-IN
              </p>
              <p className="text-sm text-zinc-900 dark:text-zinc-100">
                {new Date(visit.checkInAt).toLocaleString("pt-PT", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>

            {visit.checkOutAt && (
              <div>
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  CHECK-OUT
                </p>
                <p className="text-sm text-zinc-900 dark:text-zinc-100">
                  {new Date(visit.checkOutAt).toLocaleString("pt-PT", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            )}
          </div>

          {/* Duração */}
          {duration && (
            <div>
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                DURAÇÃO
              </p>
              <p className="text-base font-semibold text-emerald-600">
                ⏱️ {duration}
              </p>
            </div>
          )}

          {/* Estado */}
          <div>
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              ESTADO
            </p>
            {visit.checkOutAt ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                ✅ Concluída
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                🟢 Em curso
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Gravação de áudio + transcrição IA */}
      <VisitAudioSection
        visitId={visit.id}
        initialAudioUrl={visit.audioUrl}
        transcriptionInitialData={{
          transcriptText: visit.transcriptText,
          aiSentiment: visit.aiSentiment,
          aiTags: visit.aiTags,
          aiSummary: visit.aiSummary,
          aiNextActions: visit.aiNextActions,
          suggestedFollowup: visit.suggestedFollowup,
        }}
      />

      {/* Registo de Vendas (Fase 7) */}
      {visit.company && (
        <section className="rounded-2xl bg-white p-4 shadow-sm dark:bg-zinc-900">
          <h2 className="mb-3 text-lg font-semibold">💰 Registo de Vendas</h2>
          
          {/* Vendas existentes */}
          {visit.sales && visit.sales.length > 0 && (
            <div className="mb-4 space-y-2">
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                VENDAS REGISTADAS ({visit.sales.length})
              </p>
              {visit.sales.map((sale) => (
                <div
                  key={sale.id}
                  className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-800 dark:bg-emerald-900/20"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-emerald-900 dark:text-emerald-100">
                        {sale.technology.name}
                      </p>
                      {sale.notes && (
                        <p className="text-sm text-emerald-700 dark:text-emerald-300">
                          {sale.notes}
                        </p>
                      )}
                      <p className="text-xs text-emerald-600 dark:text-emerald-400">
                        {new Date(sale.createdAt).toLocaleDateString("pt-PT", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    {sale.valueCents && (
                      <p className="text-lg font-bold text-emerald-900 dark:text-emerald-100">
                        {new Intl.NumberFormat("pt-PT", {
                          style: "currency",
                          currency: "EUR",
                        }).format(sale.valueCents / 100)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
            Registar nova venda associada a esta visita.
          </p>
          <SaleForm
            visitId={visit.id}
            companyId={visit.company.id}
            companyName={visit.company.name}
          />
        </section>
      )}
    </div>
  );
}

