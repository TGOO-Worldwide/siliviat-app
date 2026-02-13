import { writeFile } from "fs/promises";
import { join } from "path";
import { randomBytes } from "crypto";

/**
 * Helper para armazenar ficheiros de áudio
 * Em desenvolvimento: guarda em filesystem local (public/uploads/audio/)
 * Em produção: pode ser adaptado para S3/R2
 */

export interface UploadResult {
  url: string;
  filename: string;
}

/**
 * Guarda um ficheiro de áudio no storage local (dev)
 * @param audioBuffer - Buffer do ficheiro de áudio
 * @param mimeType - Tipo MIME do áudio (ex: audio/webm, audio/mp4)
 * @returns Objeto com URL relativo e nome do ficheiro
 */
export async function saveAudioFile(
  audioBuffer: Buffer,
  mimeType: string
): Promise<UploadResult> {
  // Gerar nome único para o ficheiro
  const timestamp = Date.now();
  const randomId = randomBytes(8).toString("hex");
  const extension = getExtensionFromMimeType(mimeType);
  const filename = `audio_${timestamp}_${randomId}.${extension}`;

  // Caminho absoluto no filesystem
  const uploadDir = join(process.cwd(), "public", "uploads", "audio");
  const filepath = join(uploadDir, filename);

  // Guardar ficheiro
  await writeFile(filepath, audioBuffer);

  // Retornar URL relativo (acessível via /uploads/audio/...)
  const url = `/uploads/audio/${filename}`;

  return { url, filename };
}

/**
 * Determina a extensão do ficheiro baseada no MIME type
 */
function getExtensionFromMimeType(mimeType: string): string {
  const mimeMap: Record<string, string> = {
    "audio/webm": "webm",
    "audio/mp4": "mp4",
    "audio/mpeg": "mp3",
    "audio/wav": "wav",
    "audio/ogg": "ogg",
  };

  return mimeMap[mimeType] || "webm"; // default: webm
}
