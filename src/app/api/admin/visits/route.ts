import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig, AppSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/visits
 * Lista todas as visitas com filtros (apenas ADMIN)
 */
export async function GET(req: NextRequest) {
  try {
    // 1. Validar autenticação e role
    const session = (await getServerSession(authConfig)) as AppSession | null;
    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Apenas administradores podem listar todas as visitas" },
        { status: 403 }
      );
    }

    // 2. Extrair parâmetros de query
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const userId = searchParams.get("userId");
    const companyId = searchParams.get("companyId");
    const status = searchParams.get("status"); // "active" ou "completed"

    // 3. Construir filtros
    const where: any = {};

    if (userId) {
      where.userId = userId;
    }

    if (companyId) {
      where.companyId = companyId;
    }

    if (status === "active") {
      where.checkOutAt = null;
    } else if (status === "completed") {
      where.checkOutAt = { not: null };
    }

    // 4. Buscar visitas com paginação
    const [visits, total] = await Promise.all([
      prisma.visit.findMany({
        where,
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
        orderBy: {
          checkInAt: "desc",
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.visit.count({ where }),
    ]);

    // 5. Retornar resultados
    return NextResponse.json({
      visits,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Erro ao buscar visitas:", error);
    return NextResponse.json(
      { error: "Erro interno ao buscar visitas" },
      { status: 500 }
    );
  }
}
