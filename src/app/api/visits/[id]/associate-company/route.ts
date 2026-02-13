import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig, AppSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/visits/[id]/associate-company
 * Associa uma empresa a uma visita existente
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    // 1. Validar autenticação
    const session = (await getServerSession(authConfig)) as AppSession | null;
    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // 2. Await params
    const { id } = await params;

    // 3. Buscar visita
    const visit = await prisma.visit.findUnique({
      where: { id },
      select: { id: true, userId: true, companyId: true },
    });

    if (!visit) {
      return NextResponse.json({ error: "Visita não encontrada" }, { status: 404 });
    }

    // 4. Verificar permissões (apenas dono ou ADMIN)
    if (visit.userId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Sem permissão para modificar esta visita" },
        { status: 403 }
      );
    }

    // 5. Obter companyId do corpo da requisição
    const body = await req.json();
    const { companyId } = body;

    if (!companyId) {
      return NextResponse.json(
        { error: "Campo obrigatório: companyId" },
        { status: 400 }
      );
    }

    // 6. Verificar se a empresa existe
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });
    }

    // 7. Atualizar visita com a empresa
    const updatedVisit = await prisma.visit.update({
      where: { id },
      data: { companyId },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
      },
    });

    return NextResponse.json({
      message: "Empresa associada com sucesso",
      visit: updatedVisit,
    });
  } catch (error) {
    console.error("Erro ao associar empresa:", error);
    return NextResponse.json(
      { error: "Erro interno ao associar empresa" },
      { status: 500 }
    );
  }
}
