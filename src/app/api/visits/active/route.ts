import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authConfig);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Buscar a visita ativa (sem check-out) do usuário
    const activeVisit = await prisma.visit.findFirst({
      where: {
        userId: session.user.id,
        checkOutAt: null,
      },
      include: {
        company: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        checkInAt: "desc",
      },
    });

    if (!activeVisit) {
      return NextResponse.json({ visit: null });
    }

    return NextResponse.json({
      visit: {
        id: activeVisit.id,
        checkInAt: activeVisit.checkInAt.toISOString(),
        companyId: activeVisit.companyId,
        companyName: activeVisit.company?.name,
      },
    });
  } catch (error) {
    console.error("Erro ao buscar visita ativa:", error);
    return NextResponse.json(
      { error: "Erro ao buscar visita ativa" },
      { status: 500 }
    );
  }
}
