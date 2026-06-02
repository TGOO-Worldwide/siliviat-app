import { z } from "zod";
import {
  getAiProvider,
  getApiKeyForProvider,
  getEnvKeyName,
} from "@/lib/ai/config";
import { getSimulatedAnalysis } from "@/lib/ai/mock";
import { analyzeWithGemini } from "@/lib/ai/providers/gemini-analyze";
import { analyzeWithOpenAI } from "@/lib/ai/providers/openai-analyze";

/**
 * Análise de transcrições com LLM (OpenAI GPT ou Gemini).
 * Provedor ativo: AI_PROVIDER no .env (openai | gemini).
 */

export const AnalysisResultSchema = z.object({
  sentiment: z.enum(["POSITIVE", "NEGATIVE", "NEUTRAL"]),
  tags: z.array(z.string()).max(10),
  summary: z.string().min(10).max(500),
  next_actions: z
    .array(
      z.object({
        title: z.string().min(3).max(200),
        priority: z.enum(["high", "medium", "low"]),
        due_date: z.string().nullable().optional(),
      })
    )
    .max(5),
  suggested_followup: z
    .object({
      channel: z.enum(["email", "phone", "whatsapp", "meeting"]),
      message: z.string().min(20).max(1000).optional(),
    })
    .nullable()
    .optional(),
});

export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;

export interface AnalyzeOptions {
  transcriptText: string;
  companyName?: string;
  visitContext?: string;
}

/**
 * Analisa uma transcrição de visita e extrai sentimento, tags, resumo e ações.
 */
export async function analyzeTranscript(
  options: AnalyzeOptions
): Promise<AnalysisResult> {
  const provider = getAiProvider();
  const apiKey = getApiKeyForProvider(provider);

  if (!apiKey) {
    console.warn(
      `⚠️  ${getEnvKeyName(provider)} não configurada (AI_PROVIDER=${provider}). Usando análise simulada.`
    );
    return getSimulatedAnalysis();
  }

  try {
    const raw =
      provider === "gemini"
        ? await analyzeWithGemini(options, apiKey)
        : await analyzeWithOpenAI(options, apiKey);

    return AnalysisResultSchema.parse(raw);
  } catch (error) {
    console.error(`Erro ao analisar transcrição (${provider}):`, error);

    if (error instanceof z.ZodError) {
      console.error("Erros de validação:", error.issues);
      throw new Error("Resposta da IA não seguiu o formato esperado");
    }

    throw new Error(
      `Falha na análise: ${
        error instanceof Error ? error.message : "Erro desconhecido"
      }`
    );
  }
}
