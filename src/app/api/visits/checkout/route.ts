import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authConfig, type AppSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";

const checkoutSchema = z.object({
  checkOutLat: z.number().optional(),
  checkOutLng: z.number().optional(),
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
  const parseResult = checkoutSchema.safeParse(json);

  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Dados inválidos.", details: parseResult.error.format() },
      { status: 422 }
    );
  }

  const payload = parseResult.data;

  const hasGps =
    typeof payload.checkOutLat === "number" &&
    typeof payload.checkOutLng === "number";

  if (!hasGps && !payload.noGpsReason) {
    return NextResponse.json(
      {
        error: "GPS obrigatório ou justificação de ausência.",
      },
      { status: 400 }
    );
  }

  const activeVisit = await prisma.visit.findFirst({
    where: {
      userId: session.user.id,
      checkOutAt: null,
    },
  });

  if (!activeVisit) {
    return NextResponse.json(
      { error: "Não existe visita ativa para fazer check-out." },
      { status: 400 }
    );
  }

  const now = new Date();
  const durationSeconds = Math.max(
    0,
    Math.floor((now.getTime() - activeVisit.checkInAt.getTime()) / 1000)
  );

  const updated = await prisma.visit.update({
    where: { id: activeVisit.id },
    data: {
      checkOutAt: now,
      durationSeconds,
      checkOutLat: payload.checkOutLat,
      checkOutLng: payload.checkOutLng,
    },
  });

  await logAuditEvent({
    userId: session.user.id,
    action: "visit.checkout",
    req,
    metadata: {
      visitId: updated.id,
      durationSeconds: updated.durationSeconds,
      hasGps,
      noGpsReason: payload.noGpsReason,
    },
  });

  return NextResponse.json(
    {
      visit: {
        id: updated.id,
        checkInAt: updated.checkInAt,
        checkOutAt: updated.checkOutAt,
        durationSeconds: updated.durationSeconds,
      },
    },
    { status: 200 }
  );
}

