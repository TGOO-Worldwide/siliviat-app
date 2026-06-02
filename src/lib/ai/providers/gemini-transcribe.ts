import { readAudioBuffer } from "@/lib/audio-storage";
import { getGeminiTranscribeModel } from "@/lib/ai/config";
import type { TranscriptionResult } from "../transcribe";

export async function transcribeWithGemini(
  audioUrl: string,
  apiKey: string
): Promise<TranscriptionResult> {
  const { buffer: audioBuffer, contentType } = await readAudioBuffer(audioUrl);
  const base64Audio = Buffer.from(audioBuffer).toString("base64");

  const url = new URL(
    `https://generativelanguage.googleapis.com/v1beta/models/${getGeminiTranscribeModel()}:generateContent`
  );
  url.searchParams.set("key", apiKey);

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              inline_data: {
                mime_type: contentType,
                data: base64Audio,
              },
            },
            {
              text: `Transcreve integralmente o áudio desta visita comercial para texto em português de Portugal.
Inclui apenas o que foi dito, sem comentários, títulos ou formatação extra.
Se não conseguires ouvir conteúdo compreensível, responde com uma string vazia.`,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 8192,
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

  const text =
    data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("")
      .trim() ?? "";

  return {
    text,
    language: "pt",
  };
}
