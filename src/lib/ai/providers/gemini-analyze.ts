import { getGeminiAnalyzeModel } from "@/lib/ai/config";
import {
  getAnalysisSystemPrompt,
  getAnalysisUserPrompt,
} from "../analysis-prompts";
import type { AnalyzeOptions, AnalysisResult } from "../analyze";

export async function analyzeWithGemini(
  options: AnalyzeOptions,
  apiKey: string
): Promise<AnalysisResult> {
  const url = new URL(
    `https://generativelanguage.googleapis.com/v1beta/models/${getGeminiAnalyzeModel()}:generateContent`
  );
  url.searchParams.set("key", apiKey);

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: getAnalysisSystemPrompt() }],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: getAnalysisUserPrompt(options) }],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.3,
        maxOutputTokens: 1500,
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message =
      (errorData as { error?: { message?: string } }).error?.message ||
      response.statusText;
    throw new Error(`Erro na API do Gemini: ${response.status} - ${message}`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };

  const content =
    data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("")
      .trim() ?? "";

  if (!content) {
    throw new Error("Resposta vazia da API do Gemini");
  }

  return JSON.parse(content) as AnalysisResult;
}
