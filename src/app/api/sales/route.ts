import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig, AppSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import { z } from "zod";

// Schema de validação
const saleSchema = z.object({
  visitId: z.string().optional(),
  companyId: z.string().cuid(),
  technologyId: z.string().cuid(),
  valueCents: z.number().int().min(0).optional(),
  notes: z.string().max(1000).optional(),
});

export async function POST(req: NextRequest) {
  try {
    // 1. Validar autenticação
    const session = (await getServerSession(authConfig)) as AppSession | null;
    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // 2. Parsear e validar body
    const body = await req.json();
    const validation = saleSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Dados inválidos",
          details: validation.error.issues.map((i) => i.message),
        },
        { status: 400 }
      );
    }

    const { visitId, companyId, technologyId, valueCents, notes } = validation.data;

    // 3. Verificar se tecnologia existe e está ativa
    const technology = await prisma.technology.findUnique({
      where: { id: technologyId },
    });

    if (!technology) {
      return NextResponse.json({ error: "Tecnologia não encontrada" }, { status: 404 });
    }

    if (!technology.active) {
      return NextResponse.json({ error: "Tecnologia não está ativa" }, { status: 400 });
    }

    // 4. Verificar se empresa existe
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });
    }

    // 5. Se visitId fornecido, validar que existe e que pertence ao user
    if (visitId) {
      const visit = await prisma.visit.findUnique({
        where: { id: visitId },
      });

      if (!visit) {
        return NextResponse.json({ error: "Visita não encontrada" }, { status: 404 });
      }

      // Apenas o dono da visita ou ADMIN pode associar venda
      if (visit.userId !== session.user.id && session.user.role !== "ADMIN") {
        return NextResponse.json(
          { error: "Não tem permissão para associar venda a esta visita" },
          { status: 403 }
        );
      }
    }

    // 6. Criar registo de venda
    const sale = await prisma.sale.create({
      data: {
        userId: session.user.id,
        companyId,
        visitId: visitId || null,
        technologyId,
        valueCents: valueCents ?? null,
        notes: notes ?? null,
      },
      include: {
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
    });

    // 7. Registar em AuditLog
    await logAuditEvent({
      userId: session.user.id,
      action: "sale.create",
      req,
      metadata: {
        saleId: sale.id,
        companyId,
        technologyId,
        visitId: visitId ?? null,
        valueCents: valueCents ?? null,
      },
    });

    // 8. Retornar sucesso
    return NextResponse.json({ sale }, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar venda:", error);
    return NextResponse.json({ error: "Erro interno ao criar venda" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    // 1. Validar autenticação
    const session = (await getServerSession(authConfig)) as AppSession | null;
    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // 2. Extrair parâmetros de query
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const technologyId = searchParams.get("technologyId");

    // 3. Construir filtros
    const where: any = {
      // ADMIN vê todas, SALES vê apenas as suas
      ...(session.user.role === "SALES" && { userId: session.user.id }),
      ...(technologyId && { technologyId }),
    };

    // 4. Buscar vendas com paginação
    const [sales, total] = await Promise.all([
      prisma.sale.findMany({
        where,
        include: {
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
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.sale.count({ where }),
    ]);

    // 5. Retornar resultados
    return NextResponse.json({
      sales,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Erro ao buscar vendas:", error);
    return NextResponse.json({ error: "Erro interno ao buscar vendas" }, { status: 500 });
  }
}
