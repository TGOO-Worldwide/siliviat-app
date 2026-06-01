import { unstable_noStore as noStore } from "next/cache";
import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth";
import { CheckinClient } from "./checkin-client";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

interface AuthSession {
  user: {
    id: string;
    role: "ADMIN" | "SALES";
    name?: string | null;
    email?: string | null;
  };
}

export default async function CheckinPage() {
  noStore();
  await connection();

  const session = (await getServerSession(authConfig)) as AuthSession | null;

  const activeVisit = session
    ? await prisma.visit.findFirst({
        where: { userId: session.user.id, checkOutAt: null },
        select: {
          id: true,
          checkInAt: true,
          companyId: true,
          company: {
            select: { name: true },
          },
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
              companyName: activeVisit.company?.name,
            }
          : null
      }
    />
  );
}
