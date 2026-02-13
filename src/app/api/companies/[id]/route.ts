import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig, AppSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import { z } from "zod";

// Schema para atualização
const updateCompanySchema = z.object({
  name: z.string().min(1, "Nome é obrigatório.").max(255).optional(),
  address: z.string().max(500).optional(),
  phone: z.string().max(50).optional(),
  email: z.string().email("Email inválido.").optional().or(z.literal("")),
  nif: z.string().max(20).optional(),
});

/**
 * GET /api/companies/[id]
 * Busca uma empresa específica
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

    // 2. Obter ID da empresa
    const { id } = await context.params;

    // 3. Buscar empresa
    const company = await prisma.company.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            visits: true,
            sales: true,
          },
        },
      },
    });

    if (!company) {
      return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });
    }

    return NextResponse.json({ company });
  } catch (error) {
    console.error("Erro ao buscar empresa:", error);
    return NextResponse.json(
      { error: "Erro interno ao buscar empresa" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/companies/[id]
 * Atualiza uma empresa (apenas ADMIN)
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
        { error: "Apenas administradores podem editar empresas" },
        { status: 403 }
      );
    }

    // 2. Obter ID da empresa
    const { id } = await context.params;

    // 3. Validar corpo da requisição
    const body = await req.json();
    const validation = updateCompanySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Dados inválidos",
          details: validation.error.issues.map((i) => i.message),
        },
        { status: 400 }
      );
    }

    // 4. Verificar se empresa existe
    const existingCompany = await prisma.company.findUnique({
      where: { id },
    });

    if (!existingCompany) {
      return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });
    }

    // 5. Se está alterando o nome, verificar duplicados
    if (validation.data.name && validation.data.name !== existingCompany.name) {
      const duplicateCompany = await prisma.company.findFirst({
        where: {
          name: validation.data.name,
          id: { not: id }, // Excluir a empresa atual
        },
      });

      if (duplicateCompany) {
        return NextResponse.json(
          { error: "Já existe outra empresa com este nome" },
          { status: 409 }
        );
      }
    }

    // 6. Atualizar empresa
    const company = await prisma.company.update({
      where: { id },
      data: {
        ...validation.data,
        email: validation.data.email || undefined,
      },
    });

    // 7. Registar em AuditLog
    await logAuditEvent({
      userId: session.user.id,
      action: "company.update",
      req,
      metadata: {
        companyId: company.id,
        companyName: company.name,
        changes: validation.data,
      },
    });

    return NextResponse.json({ company });
  } catch (error) {
    console.error("Erro ao atualizar empresa:", error);
    return NextResponse.json(
      { error: "Erro interno ao atualizar empresa" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/companies/[id]
 * Remove uma empresa (apenas ADMIN)
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
        { error: "Apenas administradores podem remover empresas" },
        { status: 403 }
      );
    }

    // 2. Obter ID da empresa
    const { id } = await context.params;

    // 3. Verificar se empresa existe
    const company = await prisma.company.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            visits: true,
            sales: true,
          },
        },
      },
    });

    if (!company) {
      return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });
    }

    // 4. Verificar se tem visitas ou vendas associadas
    if (company._count.visits > 0 || company._count.sales > 0) {
      return NextResponse.json(
        {
          error: "Não é possível remover empresa com visitas ou vendas associadas",
          details: {
            visits: company._count.visits,
            sales: company._count.sales,
          },
        },
        { status: 400 }
      );
    }

    // 5. Remover empresa
    await prisma.company.delete({
      where: { id },
    });

    // 6. Registar em AuditLog
    await logAuditEvent({
      userId: session.user.id,
      action: "company.delete",
      req,
      metadata: {
        companyId: company.id,
        companyName: company.name,
      },
    });

    return NextResponse.json({ success: true, message: "Empresa removida com sucesso" });
  } catch (error) {
    console.error("Erro ao remover empresa:", error);
    return NextResponse.json(
      { error: "Erro interno ao remover empresa" },
      { status: 500 }
    );
  }
}
