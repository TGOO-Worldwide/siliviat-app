import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig, type AppSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { saveAudioFile } from "@/lib/storage";
import { logAuditEvent } from "@/lib/audit";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/visits/[id]/audio
 * Upload de ficheiro de áudio para uma visita
 * Auth: requer sessão SALES/ADMIN
 * Body: FormData com campo "audio" (ficheiro)
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    // 1. Verificar autenticação
    const session = (await getServerSession(authConfig)) as AppSession | null;
    if (!session?.user) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    // 2. Await params
    const { id: visitId } = await context.params;

    // 2. Buscar visita e validar ownership
    const visit = await prisma.visit.findUnique({
      where: { id: visitId },
      select: {
        id: true,
        userId: true,
        companyId: true,
        audioUrl: true,
      },
    });

    if (!visit) {
      return NextResponse.json(
        { error: "Visita não encontrada" },
        { status: 404 }
      );
    }

    // Apenas o dono da visita ou ADMIN pode fazer upload
    if (visit.userId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Sem permissão para fazer upload nesta visita" },
        { status: 403 }
      );
    }

    // 3. Processar FormData
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File | null;

    if (!audioFile) {
      return NextResponse.json(
        { error: "Ficheiro de áudio não fornecido" },
        { status: 400 }
      );
    }

    // Validar tipo de ficheiro (audio/*)
    if (!audioFile.type.startsWith("audio/")) {
      return NextResponse.json(
        { error: "Ficheiro deve ser de áudio" },
        { status: 400 }
      );
    }

    // Validar tamanho (máx 50MB)
    const MAX_SIZE = 50 * 1024 * 1024; // 50MB
    if (audioFile.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "Ficheiro demasiado grande (máx 50MB)" },
        { status: 400 }
      );
    }

    // 4. Converter File para Buffer
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 5. Guardar ficheiro no storage
    const { url, filename } = await saveAudioFile(buffer, audioFile.type);

    // 6. Atualizar Visit com URL do áudio
    const updatedVisit = await prisma.visit.update({
      where: { id: visitId },
      data: { audioUrl: url },
      select: {
        id: true,
        audioUrl: true,
        checkInAt: true,
        checkOutAt: true,
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // 7. Registar em Audit Log
    await logAuditEvent({
      userId: session.user.id,
      action: "visit.audio_upload",
      req: request,
      metadata: {
        visitId: visit.id,
        companyId: visit.companyId,
        filename,
        fileSize: audioFile.size,
        mimeType: audioFile.type,
      },
    });

    return NextResponse.json(
      {
        visit: updatedVisit,
        audioUrl: url,
        message: "Áudio carregado com sucesso",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Erro ao fazer upload de áudio:", error);
    return NextResponse.json(
      { error: "Erro interno ao processar áudio" },
      { status: 500 }
    );
  }
}
