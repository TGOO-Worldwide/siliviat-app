import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig, type AppSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { transcribeAudio } from "@/lib/ai/transcribe";
import { analyzeTranscript } from "@/lib/ai/analyze";
import { logAuditEvent } from "@/lib/audit";

/**
 * POST /api/visits/[id]/transcribe-analyze
 * Transcreve o áudio da visita e analisa o conteúdo com IA
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Verificar autenticação
    const session = (await getServerSession(authConfig)) as AppSession | null;
    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // 2. Obter ID da visita
    const { id: visitId } = await context.params;

    // 3. Buscar visita
    const visit = await prisma.visit.findUnique({
      where: { id: visitId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        company: { select: { id: true, name: true } },
      },
    });

    if (!visit) {
      return NextResponse.json(
        { error: "Visita não encontrada" },
        { status: 404 }
      );
    }

    // 4. Validar ownership (apenas dono da visita ou ADMIN)
    const isOwner = visit.userId === session.user.id;
    const isAdmin = session.user.role === "ADMIN";

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: "Sem permissão para aceder esta visita" },
        { status: 403 }
      );
    }

    // 5. Verificar se há áudio disponível
    if (!visit.audioUrl) {
      return NextResponse.json(
        { error: "Esta visita não tem áudio gravado" },
        { status: 400 }
      );
    }

    // 6. Verificar se já foi transcrita (opcional: permitir re-transcrição)
    if (visit.transcriptText && visit.aiSummary) {
      // Já foi transcrita, mas permitir re-análise se solicitado
      const forceReAnalyze = request.nextUrl.searchParams.get("force") === "true";
      
      if (!forceReAnalyze) {
        return NextResponse.json(
          {
            message: "Visita já foi transcrita e analisada",
            visit: {
              id: visit.id,
              transcriptText: visit.transcriptText,
              aiSentiment: visit.aiSentiment,
              aiTags: visit.aiTags,
              aiSummary: visit.aiSummary,
              aiNextActions: visit.aiNextActions,
              suggestedFollowup: visit.suggestedFollowup,
            },
          },
          { status: 200 }
        );
      }
    }

    // 7. TRANSCRIÇÃO (provedor: AI_PROVIDER — openai ou gemini)
    console.log(`🎤 Iniciando transcrição de áudio: ${visit.audioUrl}`);
    const transcription = await transcribeAudio(visit.audioUrl);
    
    if (!transcription.text || transcription.text.trim().length === 0) {
      return NextResponse.json(
        { error: "Não foi possível transcrever o áudio (texto vazio)" },
        { status: 500 }
      );
    }

    console.log(`✅ Transcrição completa: ${transcription.text.length} caracteres`);

    // 8. ANÁLISE: Chamar LLM para análise estruturada
    console.log(`🤖 Iniciando análise da transcrição...`);
    const analysis = await analyzeTranscript({
      transcriptText: transcription.text,
      companyName: visit.company?.name,
      visitContext: `Visita realizada por ${visit.user?.name || visit.user?.email}`,
    });

    console.log(`✅ Análise completa: sentimento=${analysis.sentiment}, ${analysis.next_actions.length} ações`);

    // 9. PERSISTIR: Atualizar Visit com resultados
    const updatedVisit = await prisma.visit.update({
      where: { id: visitId },
      data: {
        transcriptText: transcription.text,
        aiSentiment: analysis.sentiment,
        aiTags: analysis.tags,
        aiSummary: analysis.summary,
        aiNextActions: analysis.next_actions,
        suggestedFollowup: analysis.suggested_followup || undefined,
      },
      include: {
        company: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    // 10. CRIAR TASKS AUTOMÁTICAS: Uma para cada ação sugerida
    const tasksCreated = [];
    for (const action of analysis.next_actions) {
      try {
        const task = await prisma.task.create({
          data: {
            userId: visit.userId,
            companyId: visit.companyId || undefined,
            visitId: visit.id,
            title: action.title,
            status: "OPEN",
            source: "AI",
            dueAt: action.due_date ? new Date(action.due_date) : null,
          },
        });
        tasksCreated.push(task);
      } catch (error) {
        console.error(`Erro ao criar task "${action.title}":`, error);
        // Continuar mesmo se uma task falhar
      }
    }

    console.log(`✅ ${tasksCreated.length} tarefas criadas automaticamente`);

    // 11. AUDIT LOG: Registar ação
    await logAuditEvent({
      userId: session.user.id,
      action: "visit.transcribe_analyze",
      req: request,
      metadata: {
        visitId: visit.id,
        companyId: visit.companyId,
        companyName: visit.company?.name,
        transcriptLength: transcription.text.length,
        sentiment: analysis.sentiment,
        tagsCount: analysis.tags.length,
        actionsCount: analysis.next_actions.length,
        tasksCreated: tasksCreated.length,
      },
    });

    // 12. RESPOSTA: Retornar resultados completos
    return NextResponse.json(
      {
        success: true,
        message: "Transcrição e análise concluídas com sucesso",
        visit: {
          id: updatedVisit.id,
          transcriptText: updatedVisit.transcriptText,
          aiSentiment: updatedVisit.aiSentiment,
          aiTags: updatedVisit.aiTags,
          aiSummary: updatedVisit.aiSummary,
          aiNextActions: updatedVisit.aiNextActions,
          suggestedFollowup: updatedVisit.suggestedFollowup,
        },
        tasks: tasksCreated.map((t) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          dueAt: t.dueAt,
        })),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ Erro ao transcrever e analisar visita:", error);

    return NextResponse.json(
      {
        error: "Erro ao processar transcrição e análise",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
