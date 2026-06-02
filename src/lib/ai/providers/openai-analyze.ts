import {
  getAnalysisSystemPrompt,
  getAnalysisUserPrompt,
} from "../analysis-prompts";
import type { AnalyzeOptions, AnalysisResult } from "../analyze";

const OPENAI_ANALYZE_MODEL =
  process.env.OPENAI_ANALYZE_MODEL?.trim() || "gpt-4o-mini";

export async function analyzeWithOpenAI(
  options: AnalyzeOptions,
  apiKey: string
): Promise<AnalysisResult> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_ANALYZE_MODEL,
      messages: [
        { role: "system", content: getAnalysisSystemPrompt() },
        { role: "user", content: getAnalysisUserPrompt(options) },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 1500,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Erro na API do OpenAI: ${response.status} - ${
        (errorData as { error?: { message?: string } }).error?.message ||
        response.statusText
      }`
    );
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("Resposta vazia da API do OpenAI");
  }

  return JSON.parse(content) as AnalysisResult;
}
