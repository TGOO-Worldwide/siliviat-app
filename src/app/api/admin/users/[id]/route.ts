import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig, AppSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import { z } from "zod";
import bcrypt from "bcrypt";

// Schema para atualização de usuário
const updateUserSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(255).optional(),
  email: z.string().email("Email inválido").optional(),
  password: z.string().min(6, "Password deve ter pelo menos 6 caracteres").optional(),
  role: z.enum(["ADMIN", "SALES"]).optional(),
});

/**
 * GET /api/admin/users/[id]
 * Busca um usuário específico (apenas ADMIN)
 */
export async function GET(
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
        { error: "Apenas administradores podem ver usuários" },
        { status: 403 }
      );
    }

    // 2. Obter ID do usuário
    const { id } = await context.params;

    // 3. Buscar usuário
    const user = await prisma.user.findUnique({
      where: { id },
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
    });

    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Erro ao buscar usuário:", error);
    return NextResponse.json(
      { error: "Erro interno ao buscar usuário" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/users/[id]
 * Atualiza um usuário (apenas ADMIN)
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
        { error: "Apenas administradores podem editar usuários" },
        { status: 403 }
      );
    }

    // 2. Obter ID do usuário
    const { id } = await context.params;

    // 3. Validar corpo da requisição
    const body = await req.json();
    const validation = updateUserSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Dados inválidos",
          details: validation.error.issues.map((i) => i.message),
        },
        { status: 400 }
      );
    }

    // 4. Verificar se usuário existe
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    // 5. Se está alterando o email, verificar duplicados
    if (validation.data.email && validation.data.email !== existingUser.email) {
      const duplicateUser = await prisma.user.findUnique({
        where: { email: validation.data.email },
      });

      if (duplicateUser && duplicateUser.id !== id) {
        return NextResponse.json(
          { error: "Já existe outro usuário com este email" },
          { status: 409 }
        );
      }
    }

    // 6. Preparar dados de atualização
    const updateData: any = {};

    if (validation.data.name) {
      updateData.name = validation.data.name;
    }

    if (validation.data.email) {
      updateData.email = validation.data.email;
    }

    if (validation.data.role) {
      updateData.role = validation.data.role;
    }

    if (validation.data.password) {
      updateData.passwordHash = await bcrypt.hash(validation.data.password, 10);
    }

    // 7. Atualizar usuário
    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        updatedAt: true,
      },
    });

    // 8. Registar em AuditLog
    await logAuditEvent({
      userId: session.user.id,
      action: "user.update",
      req,
      metadata: {
        updatedUserId: user.id,
        updatedUserEmail: user.email,
        changes: validation.data,
      },
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Erro ao atualizar usuário:", error);
    return NextResponse.json(
      { error: "Erro interno ao atualizar usuário" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/users/[id]
 * Remove um usuário (apenas ADMIN)
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
        { error: "Apenas administradores podem remover usuários" },
        { status: 403 }
      );
    }

    // 2. Obter ID do usuário
    const { id } = await context.params;

    // 3. Não permitir que o admin remova a si mesmo
    if (id === session.user.id) {
      return NextResponse.json(
        { error: "Não é possível remover o próprio usuário" },
        { status: 400 }
      );
    }

    // 4. Verificar se usuário existe
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            visits: true,
            sales: true,
            tasks: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    // 5. Verificar se tem dados associados
    if (user._count.visits > 0 || user._count.sales > 0 || user._count.tasks > 0) {
      return NextResponse.json(
        {
          error: "Não é possível remover usuário com visitas, vendas ou tarefas associadas",
          details: {
            visits: user._count.visits,
            sales: user._count.sales,
            tasks: user._count.tasks,
          },
        },
        { status: 400 }
      );
    }

    // 6. Remover usuário
    await prisma.user.delete({
      where: { id },
    });

    // 7. Registar em AuditLog
    await logAuditEvent({
      userId: session.user.id,
      action: "user.delete",
      req,
      metadata: {
        deletedUserId: user.id,
        deletedUserEmail: user.email,
      },
    });

    return NextResponse.json({ success: true, message: "Usuário removido com sucesso" });
  } catch (error) {
    console.error("Erro ao remover usuário:", error);
    return NextResponse.json(
      { error: "Erro interno ao remover usuário" },
      { status: 500 }
    );
  }
}
