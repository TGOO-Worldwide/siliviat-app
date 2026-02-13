import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig, AppSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import { z } from "zod";

// Schema para atualização
const updateTechnologySchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(255).optional(),
  description: z.string().max(500).optional().nullable(),
  active: z.boolean().optional(),
});

/**
 * GET /api/admin/technologies/[id]
 * Busca uma tecnologia específica
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Validar autenticação
    const session = (await getServerSession(authConfig)) as AppSession | null;
    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // 2. Obter ID da tecnologia
    const { id } = await context.params;

    // 3. Buscar tecnologia
    const technology = await prisma.technology.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            sales: true,
          },
        },
      },
    });

    if (!technology) {
      return NextResponse.json({ error: "Tecnologia não encontrada" }, { status: 404 });
    }

    return NextResponse.json({ technology });
  } catch (error) {
    console.error("Erro ao buscar tecnologia:", error);
    return NextResponse.json(
      { error: "Erro interno ao buscar tecnologia" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/technologies/[id]
 * Atualiza uma tecnologia (apenas ADMIN)
 */
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Validar autenticação e role
    const session = (await getServerSession(authConfig)) as AppSession | null;
    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Apenas administradores podem editar tecnologias" },
        { status: 403 }
      );
    }

    // 2. Obter ID da tecnologia
    const { id } = await context.params;

    // 3. Validar corpo da requisição
    const body = await req.json();
    const validation = updateTechnologySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Dados inválidos",
          details: validation.error.issues.map((i) => i.message),
        },
        { status: 400 }
      );
    }

    // 4. Verificar se tecnologia existe
    const existingTech = await prisma.technology.findUnique({
      where: { id },
    });

    if (!existingTech) {
      return NextResponse.json({ error: "Tecnologia não encontrada" }, { status: 404 });
    }

    // 5. Se está alterando o nome, verificar duplicados
    if (validation.data.name && validation.data.name !== existingTech.name) {
      const duplicateTech = await prisma.technology.findUnique({
        where: { name: validation.data.name },
      });

      if (duplicateTech && duplicateTech.id !== id) {
        return NextResponse.json(
          { error: "Já existe outra tecnologia com este nome" },
          { status: 409 }
        );
      }
    }

    // 6. Atualizar tecnologia
    const technology = await prisma.technology.update({
      where: { id },
      data: {
        ...validation.data,
        description: validation.data.description !== undefined 
          ? validation.data.description 
          : existingTech.description,
      },
    });

    // 7. Registar em AuditLog
    await logAuditEvent({
      userId: session.user.id,
      action: "technology.update",
      req,
      metadata: {
        technologyId: technology.id,
        technologyName: technology.name,
        changes: validation.data,
      },
    });

    return NextResponse.json({ technology });
  } catch (error) {
    console.error("Erro ao atualizar tecnologia:", error);
    return NextResponse.json(
      { error: "Erro interno ao atualizar tecnologia" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/technologies/[id]
 * Remove uma tecnologia (apenas ADMIN)
 * Nota: Não permite remover se houver vendas associadas
 */
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Validar autenticação e role
    const session = (await getServerSession(authConfig)) as AppSession | null;
    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Apenas administradores podem remover tecnologias" },
        { status: 403 }
      );
    }

    // 2. Obter ID da tecnologia
    const { id } = await context.params;

    // 3. Verificar se tecnologia existe
    const technology = await prisma.technology.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            sales: true,
          },
        },
      },
    });

    if (!technology) {
      return NextResponse.json({ error: "Tecnologia não encontrada" }, { status: 404 });
    }

    // 4. Verificar se tem vendas associadas
    if (technology._count.sales > 0) {
      return NextResponse.json(
        {
          error: "Não é possível remover tecnologia com vendas associadas",
          details: {
            sales: technology._count.sales,
          },
        },
        { status: 400 }
      );
    }

    // 5. Remover tecnologia
    await prisma.technology.delete({
      where: { id },
    });

    // 6. Registar em AuditLog
    await logAuditEvent({
      userId: session.user.id,
      action: "technology.delete",
      req,
      metadata: {
        technologyId: technology.id,
        technologyName: technology.name,
      },
    });

    return NextResponse.json({ success: true, message: "Tecnologia removida com sucesso" });
  } catch (error) {
    console.error("Erro ao remover tecnologia:", error);
    return NextResponse.json(
      { error: "Erro interno ao remover tecnologia" },
      { status: 500 }
    );
  }
}
