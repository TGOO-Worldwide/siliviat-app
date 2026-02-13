import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth";
import { CheckinClient } from "./checkin-client";

interface AuthSession {
  user: {
    id: string;
    role: "ADMIN" | "SALES";
    name?: string | null;
    email?: string | null;
  };
}

export default async function CheckinPage() {
  const session = (await getServerSession(authConfig)) as AuthSession | null;

  const activeVisit = session
    ? await prisma.visit.findFirst({
        where: { userId: session.user.id, checkOutAt: null },
        select: {
          id: true,
          checkInAt: true,
          companyId: true,
        },
      })
    : null;

  return (
    <CheckinClient
      initialActiveVisit={
        activeVisit
          ? {
              id: activeVisit.id,
              checkInAt: activeVisit.checkInAt.toISOString(),
              companyId: activeVisit.companyId ?? undefined,
            }
          : null
      }
    />
  );
}

