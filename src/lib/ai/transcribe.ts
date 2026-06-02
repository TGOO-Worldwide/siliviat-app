import {
  getAiProvider,
  getApiKeyForProvider,
  getEnvKeyName,
} from "@/lib/ai/config";
import { getSimulatedTranscription } from "@/lib/ai/mock";
import { transcribeWithGemini } from "@/lib/ai/providers/gemini-transcribe";
import { transcribeWithOpenAI } from "@/lib/ai/providers/openai-transcribe";

/**
 * Transcrição de áudio (OpenAI Whisper ou Gemini multimodal).
 * Provedor ativo: AI_PROVIDER no .env (openai | gemini).
 */

export interface TranscriptionResult {
  text: string;
  duration?: number;
  language?: string;
}

/**
 * Transcreve um ficheiro de áudio para texto.
 * @param audioUrl - URL relativo do ficheiro (ex: /uploads/audio/file.webm)
 */
export async function transcribeAudio(
  audioUrl: string
): Promise<TranscriptionResult> {
  const provider = getAiProvider();
  const apiKey = getApiKeyForProvider(provider);

  if (!apiKey) {
    console.warn(
      `⚠️  ${getEnvKeyName(provider)} não configurada (AI_PROVIDER=${provider}). Usando transcrição simulada.`
    );
    return getSimulatedTranscription();
  }

  try {
    if (provider === "gemini") {
      return await transcribeWithGemini(audioUrl, apiKey);
    }
    return await transcribeWithOpenAI(audioUrl, apiKey);
  } catch (error) {
    console.error(`Erro ao transcrever áudio (${provider}):`, error);
    throw new Error(
      `Falha na transcrição: ${
        error instanceof Error ? error.message : "Erro desconhecido"
      }`
    );
  }
}
