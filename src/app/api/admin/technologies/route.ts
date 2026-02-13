import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig, AppSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
      },
    });

    return NextResponse.json({ technologies });
  } catch (error) {
    console.error("Erro ao buscar tecnologias:", error);
    return NextResponse.json({ error: "Erro interno ao buscar tecnologias" }, { status: 500 });
  }
}
