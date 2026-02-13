import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig, AppSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import { z } from "zod";

// Schema para criar/atualizar tecnologia
const technologySchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(255),
  description: z.string().max(500).optional(),
  active: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  try {
    // 1. Validar autenticação
    const session = (await getServerSession(authConfig)) as AppSession | null;
    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // 2. Buscar tecnologias (apenas ativas por padrão, ou todas se query param activeOnly=false)
    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get("activeOnly") !== "false";

    const technologies = await prisma.technology.findMany({
      where: activeOnly ? { active: true } : undefined,
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
        description: true,
        active: true,
        _count: {
          select: {
            sales: true,
          },
        },
      },
    });

    return NextResponse.json({ technologies });
  } catch (error) {
    console.error("Erro ao buscar tecnologias:", error);
    return NextResponse.json({ error: "Erro interno ao buscar tecnologias" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // 1. Validar autenticação e role
    const session = (await getServerSession(authConfig)) as AppSession | null;
    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Apenas administradores podem criar tecnologias" },
        { status: 403 }
      );
    }

    // 2. Parsear e validar body
    const body = await req.json();
    const validation = technologySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Dados inválidos",
          details: validation.error.issues.map((i) => i.message),
        },
        { status: 400 }
      );
    }

    const { name, description, active } = validation.data;

    // 3. Verificar se já existe tecnologia com o mesmo nome
    const existingTech = await prisma.technology.findUnique({
      where: { name },
    });

    if (existingTech) {
      return NextResponse.json(
        { error: "Já existe uma tecnologia com este nome" },
        { status: 409 }
      );
    }

    // 4. Criar tecnologia
    const technology = await prisma.technology.create({
      data: {
        name,
        description: description || null,
        active: active !== undefined ? active : true,
      },
    });

    // 5. Registar em AuditLog
    await logAuditEvent({
      userId: session.user.id,
      action: "technology.create",
      req,
      metadata: {
        technologyId: technology.id,
        technologyName: technology.name,
      },
    });

    return NextResponse.json({ technology }, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar tecnologia:", error);
    return NextResponse.json(
      { error: "Erro interno ao criar tecnologia" },
      { status: 500 }
    );
  }
}
