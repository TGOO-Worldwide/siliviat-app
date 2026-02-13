import { readFile } from "fs/promises";
import { join } from "path";

/**
 * Helper para transcrição de áudio usando OpenAI Whisper API
 * Converte ficheiros de áudio em texto
 */

export interface TranscriptionResult {
  text: string;
  duration?: number;
  language?: string;
}

/**
 * Transcreve um ficheiro de áudio para texto usando OpenAI Whisper
 * @param audioUrl - URL relativo do ficheiro de áudio (ex: /uploads/audio/file.webm)
 * @returns Texto transcrito
 */
export async function transcribeAudio(
  audioUrl: string
): Promise<TranscriptionResult> {
  const apiKey = process.env.OPENAI_API_KEY;

  // Modo de desenvolvimento: se não houver API key, retornar texto simulado
  if (!apiKey) {
    console.warn(
      "⚠️  OPENAI_API_KEY não configurada. Usando transcrição simulada."
    );
    return {
      text: "Esta é uma transcrição simulada para desenvolvimento. O cliente mostrou interesse nos nossos serviços de fibra ótica e pediu uma proposta comercial detalhada. Mencionou que a concorrência ofereceu um preço mais baixo, mas está satisfeito com a qualidade do nosso suporte técnico. Prometeu responder até sexta-feira.",
      duration: 180,
      language: "pt",
    };
  }

  try {
    // Converter URL relativo para caminho absoluto no filesystem
    const filepath = join(process.cwd(), "public", audioUrl);

    // Ler ficheiro de áudio
    const audioBuffer = await readFile(filepath);

    // Preparar FormData para envio
    const formData = new FormData();
    
    // Criar Blob a partir do Buffer
    const audioBlob = new Blob([audioBuffer], { type: "audio/webm" });
    
    // Adicionar ficheiro ao FormData
    formData.append("file", audioBlob, "audio.webm");
    formData.append("model", "whisper-1");
    formData.append("language", "pt"); // Português
    formData.append("response_format", "json");

    // Chamar API do OpenAI Whisper
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
          errorData.error?.message || response.statusText
        }`
      );
    }

    const data = await response.json();

    return {
      text: data.text || "",
      duration: data.duration,
      language: data.language || "pt",
    };
  } catch (error) {
    console.error("Erro ao transcrever áudio:", error);
    throw new Error(
      `Falha na transcrição: ${
        error instanceof Error ? error.message : "Erro desconhecido"
      }`
    );
  }
}
