import type { NextRequest } from "next/server";
import { prisma } from "./prisma";

interface AuditMetadata {
  [key: string]: unknown;
}

export async function logAuditEvent(options: {
  userId?: string | null;
  action: string;
  req?: NextRequest;
  metadata?: AuditMetadata;
}) {
  const { userId, action, req, metadata } = options;

  try {
    await prisma.auditLog.create({
      data: {
        userId: userId ?? undefined,
        action,
        ip: req?.headers.get("x-forwarded-for") ?? null,
        userAgent: req?.headers.get("user-agent") ?? null,
        metadata: metadata as any,
      },
    });
  } catch (error) {
    // No MVP não queremos falhar a request se o audit falhar.
    console.error("Erro ao registar audit log", error);
  }
}

