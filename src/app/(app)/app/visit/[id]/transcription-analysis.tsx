"use client";

import { useState } from "react";

interface TranscriptionAnalysisProps {
  visitId: string;
  hasAudio: boolean;
  initialData?: {
    transcriptText: string | null;
    aiSentiment: string | null;
    aiTags: any;
    aiSummary: string | null;
    aiNextActions: any;
    suggestedFollowup: any;
  };
}

interface AnalysisResult {
  transcriptText: string;
  aiSentiment: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
  aiTags: string[];
  aiSummary: string;
  aiNextActions: Array<{
    title: string;
    priority: "high" | "medium" | "low";
    due_date: string | null;
  }>;
  suggestedFollowup: {
    channel: string;
    message?: string;
  } | null;
}

export function TranscriptionAnalysis({
  visitId,
  hasAudio,
  initialData,
}: TranscriptionAnalysisProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(
    initialData?.transcriptText
      ? {
          transcriptText: initialData.transcriptText,
          aiSentiment: initialData.aiSentiment as any,
          aiTags: initialData.aiTags || [],
          aiSummary: initialData.aiSummary || "",
          aiNextActions: initialData.aiNextActions || [],
          suggestedFollowup: initialData.suggestedFollowup,
        }
      : null
  );
  const [showTranscript, setShowTranscript] = useState(false);

  const handleTranscribeAndAnalyze = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/visits/${visitId}/transcribe-analyze`,
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao processar");
      }

      if (data.visit) {
        setResult({
          transcriptText: data.visit.transcriptText,
          aiSentiment: data.visit.aiSentiment,
          aiTags: data.visit.aiTags || [],
          aiSummary: data.visit.aiSummary,
          aiNextActions: data.visit.aiNextActions || [],
          suggestedFollowup: data.visit.suggestedFollowup,
        });
      }
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Erro ao processar análise"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Função para obter cor do sentimento
  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "POSITIVE":
        return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300";
      case "NEGATIVE":
        return "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300";
      default:
        return "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
    }
  };

  // Função para obter emoji do sentimento
  const getSentimentEmoji = (sentiment: string) => {
    switch (sentiment) {
      case "POSITIVE":
        return "😊";
      case "NEGATIVE":
        return "😟";
      default:
        return "😐";
    }
  };

  // Função para obter cor da prioridade
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300";
      case "medium":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300";
      default:
        return "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300";
    }
  };

  // Função para obter label da prioridade em português
  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case "high":
        return "Alta";
      case "medium":
        return "Média";
      default:
        return "Baixa";
    }
  };

  // Função para obter emoji do canal de follow-up
  const getChannelEmoji = (channel: string) => {
    switch (channel) {
      case "email":
        return "📧";
      case "phone":
        return "📞";
      case "whatsapp":
        return "💬";
      case "meeting":
        return "🤝";
      default:
        return "📬";
    }
  };

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm dark:bg-zinc-900">
      <h2 className="mb-3 text-lg font-semibold">🤖 Transcrição e Análise IA</h2>

      {!hasAudio && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          ⚠️ É necessário gravar um áudio antes de transcrever e analisar.
        </p>
      )}

      {hasAudio && !result && (
        <div className="space-y-3">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Transcreva e analise o áudio gravado para obter insights automáticos
            sobre a conversa.
          </p>

          <button
            onClick={handleTranscribeAndAnalyze}
            disabled={isProcessing}
            className="w-full rounded-xl bg-blue-600 px-4 py-3 font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {isProcessing ? "⏳ A processar... (pode demorar 30s-2min)" : "🚀 Transcrever e Analisar"}
          </button>

          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
              ❌ {error}
            </div>
          )}
        </div>
      )}

      {result && (
        <div className="space-y-4">
          {/* Sentimento */}
          <div>
            <p className="mb-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
              SENTIMENTO GERAL
            </p>
            <span
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${getSentimentColor(
                result.aiSentiment
              )}`}
            >
              {getSentimentEmoji(result.aiSentiment)}
              {result.aiSentiment === "POSITIVE" && "Positivo"}
              {result.aiSentiment === "NEGATIVE" && "Negativo"}
              {result.aiSentiment === "NEUTRAL" && "Neutro"}
            </span>
          </div>

          {/* Tags */}
          {result.aiTags && result.aiTags.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                TAGS
              </p>
              <div className="flex flex-wrap gap-2">
                {result.aiTags.map((tag: string, index: number) => (
                  <span
                    key={index}
                    className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Resumo */}
          {result.aiSummary && (
            <div>
              <p className="mb-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                RESUMO
              </p>
              <p className="rounded-lg bg-zinc-50 p-3 text-sm text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100">
                {result.aiSummary}
              </p>
            </div>
          )}

          {/* Próximas Ações */}
          {result.aiNextActions && result.aiNextActions.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                PRÓXIMAS AÇÕES SUGERIDAS
              </p>
              <ul className="space-y-2">
                {result.aiNextActions.map((action: any, index: number) => (
                  <li
                    key={index}
                    className="flex items-start gap-3 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800"
                  >
                    <span className="text-lg">☑️</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {action.title}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${getPriorityColor(
                            action.priority
                          )}`}
                        >
                          {getPriorityLabel(action.priority)}
                        </span>
                        {action.due_date && (
                          <span className="text-xs text-zinc-500 dark:text-zinc-400">
                            📅{" "}
                            {new Date(action.due_date).toLocaleDateString(
                              "pt-PT"
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Sugestão de Follow-up */}
          {result.suggestedFollowup && (
            <div>
              <p className="mb-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                SUGESTÃO DE FOLLOW-UP
              </p>
              <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-950">
                <p className="mb-2 text-sm font-medium text-blue-900 dark:text-blue-100">
                  {getChannelEmoji(result.suggestedFollowup.channel)} Canal:{" "}
                  {result.suggestedFollowup.channel}
                </p>
                {result.suggestedFollowup.message && (
                  <p className="whitespace-pre-line text-sm text-blue-800 dark:text-blue-200">
                    {result.suggestedFollowup.message}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Transcrição (colapsável) */}
          <div>
            <button
              onClick={() => setShowTranscript(!showTranscript)}
              className="mb-2 text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              {showTranscript ? "▼" : "▶"} VER TRANSCRIÇÃO COMPLETA
            </button>
            {showTranscript && (
              <p className="whitespace-pre-line rounded-lg bg-zinc-50 p-3 text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                {result.transcriptText}
              </p>
            )}
          </div>

          {/* Botão para re-análise */}
          <button
            onClick={handleTranscribeAndAnalyze}
            disabled={isProcessing}
            className="w-full rounded-xl border border-blue-600 bg-white px-4 py-2 text-sm font-medium text-blue-600 transition hover:bg-blue-50 disabled:opacity-50 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          >
            {isProcessing ? "⏳ A processar..." : "🔄 Re-analisar"}
          </button>

          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
              ❌ {error}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
