import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authConfig, type AppSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";

const checkinSchema = z.object({
  companyId: z.string().cuid().optional(),
  checkInLat: z.number().optional(),
  checkInLng: z.number().optional(),
  noGpsReason: z
    .string()
    .min(3, "Justifique a ausência de GPS.")
    .optional(),
});

export async function POST(req: NextRequest) {
  const session = (await getServerSession(authConfig)) as AppSession | null;

  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  if (session.user.role !== "SALES" && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  const json = await req.json().catch(() => null);
  const parseResult = checkinSchema.safeParse(json);

  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Dados inválidos.", details: parseResult.error.format() },
      { status: 422 }
    );
  }

  const payload = parseResult.data;

  const hasGps = typeof payload.checkInLat === "number" && typeof payload.checkInLng === "number";

  if (!hasGps && !payload.noGpsReason) {
    return NextResponse.json(
      {
        error: "GPS obrigatório ou justificação de ausência.",
      },
      { status: 400 }
    );
  }

  const existingActiveVisit = await prisma.visit.findFirst({
    where: {
      userId: session.user.id,
      checkOutAt: null,
    },
  });

  if (existingActiveVisit) {
    return NextResponse.json(
      { error: "Já existe uma visita ativa. Faça check-out primeiro." },
      { status: 400 }
    );
  }

  const now = new Date();

  const visit = await prisma.visit.create({
    data: {
      userId: session.user.id,
      companyId: payload.companyId,
      checkInAt: now,
      checkInLat: payload.checkInLat,
      checkInLng: payload.checkInLng,
    },
  });

  await logAuditEvent({
    userId: session.user.id,
    action: "visit.checkin",
    req,
    metadata: {
      visitId: visit.id,
      companyId: visit.companyId,
      hasGps,
      noGpsReason: payload.noGpsReason,
    },
  });

  return NextResponse.json(
    {
      visit: {
        id: visit.id,
        checkInAt: visit.checkInAt,
        companyId: visit.companyId,
      },
    },
    { status: 201 }
  );
}

