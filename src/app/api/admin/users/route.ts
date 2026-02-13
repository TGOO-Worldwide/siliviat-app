import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig, AppSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import { z } from "zod";
import bcrypt from "bcrypt";

// Schema para criação de usuário
const createUserSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(255),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Password deve ter pelo menos 6 caracteres"),
  role: z.enum(["ADMIN", "SALES"]),
});

/**
 * GET /api/admin/users
 * Lista todos os usuários (apenas ADMIN)
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
        { error: "Apenas administradores podem listar usuários" },
        { status: 403 }
      );
    }

    // 2. Extrair parâmetros de query
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const role = searchParams.get("role");

    // 3. Construir filtros
    const where: any = {};
    if (role && (role === "ADMIN" || role === "SALES")) {
      where.role = role;
    }

    // 4. Buscar usuários com paginação
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
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
        orderBy: {
          createdAt: "desc",
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    // 5. Retornar resultados
    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Erro ao buscar usuários:", error);
    return NextResponse.json(
      { error: "Erro interno ao buscar usuários" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/users
 * Cria um novo usuário (apenas ADMIN)
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Validar autenticação e role
    const session = (await getServerSession(authConfig)) as AppSession | null;
    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Apenas administradores podem criar usuários" },
        { status: 403 }
      );
    }

    // 2. Parsear e validar body
    const body = await req.json();
    const validation = createUserSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Dados inválidos",
          details: validation.error.issues.map((i) => i.message),
        },
        { status: 400 }
      );
    }

    const { name, email, password, role } = validation.data;

    // 3. Verificar se email já existe
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Já existe um usuário com este email" },
        { status: 409 }
      );
    }

    // 4. Hash da password
    const passwordHash = await bcrypt.hash(password, 10);

    // 5. Criar usuário
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    // 6. Registar em AuditLog
    await logAuditEvent({
      userId: session.user.id,
      action: "user.create",
      req,
      metadata: {
        createdUserId: user.id,
        createdUserEmail: user.email,
        createdUserRole: user.role,
      },
    });

    // 7. Retornar sucesso
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar usuário:", error);
    return NextResponse.json(
      { error: "Erro interno ao criar usuário" },
      { status: 500 }
    );
  }
}
