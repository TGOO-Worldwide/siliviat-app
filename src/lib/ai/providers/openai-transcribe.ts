import { readAudioBuffer } from "@/lib/audio-storage";
import type { TranscriptionResult } from "../transcribe";

export async function transcribeWithOpenAI(
  audioUrl: string,
  apiKey: string
): Promise<TranscriptionResult> {
  const { buffer: audioBuffer, contentType } = await readAudioBuffer(audioUrl);

  const formData = new FormData();
  const audioBlob = new Blob([new Uint8Array(audioBuffer)], {
    type: contentType,
  });

  formData.append("file", audioBlob, "audio.webm");
  formData.append("model", "whisper-1");
  formData.append("language", "pt");
  formData.append("response_format", "json");

  const response = await fetch(
    "https://api.openai.com/v1/audio/transcriptions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Erro na API do Whisper: ${response.status} - ${
        (errorData as { error?: { message?: string } }).error?.message ||
        response.statusText
      }`
    );
  }

  const data = (await response.json()) as {
    text?: string;
    duration?: number;
    language?: string;
  };

  return {
    text: data.text || "",
    duration: data.duration,
    language: data.language || "pt",
  };
}
