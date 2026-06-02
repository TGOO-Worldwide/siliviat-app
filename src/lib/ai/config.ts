export type AiProvider = "openai" | "gemini";

const VALID_PROVIDERS: AiProvider[] = ["openai", "gemini"];

/**
 * Provedor ativo para transcrição e análise de áudio.
 * Definir em .env: AI_PROVIDER=openai | gemini (padrão: openai)
 */
export function getAiProvider(): AiProvider {
  const raw = process.env.AI_PROVIDER?.trim().toLowerCase();
  if (raw && VALID_PROVIDERS.includes(raw as AiProvider)) {
    return raw as AiProvider;
  }
  return "openai";
}

export function getApiKeyForProvider(provider: AiProvider): string | undefined {
  const key =
    provider === "gemini"
      ? process.env.GEMINI_API_KEY
      : process.env.OPENAI_API_KEY;
  const trimmed = key?.trim();
  return trimmed || undefined;
}

export function getEnvKeyName(provider: AiProvider): string {
  return provider === "gemini" ? "GEMINI_API_KEY" : "OPENAI_API_KEY";
}

/** Modelo Gemini estável com suporte a áudio (gemini-2.0-flash foi descontinuado). */
export const GEMINI_DEFAULT_MODEL = "gemini-2.5-flash";

export function getGeminiTranscribeModel(): string {
  return process.env.GEMINI_TRANSCRIBE_MODEL?.trim() || GEMINI_DEFAULT_MODEL;
}

export function getGeminiAnalyzeModel(): string {
  return process.env.GEMINI_ANALYZE_MODEL?.trim() || GEMINI_DEFAULT_MODEL;
}
