import { access, readFile, stat } from "fs/promises";
import { constants } from "fs";
import { join } from "path";
import { randomBytes } from "crypto";
import {
  getFromR2,
  getR2PublicUrl,
  headR2Object,
  isR2Configured,
  uploadToR2,
} from "@/lib/r2-storage";

const FILENAME_PATTERN = /^audio_\d+_[a-f0-9]+\.\w+$/;

export interface UploadResult {
  url: string;
  filename: string;
}

export function getAudioUploadDir(): string {
  if (process.env.UPLOAD_DIR) {
    return process.env.UPLOAD_DIR;
  }

  if (process.env.NODE_ENV === "production" && !isR2Configured()) {
    return join(process.cwd(), "data", "uploads", "audio");
  }

  return join(process.cwd(), "public", "uploads", "audio");
}

export function getLegacyAudioUploadDir(): string {
  return join(process.cwd(), "public", "uploads", "audio");
}

export function isValidAudioFilename(filename: string): boolean {
  return FILENAME_PATTERN.test(filename);
}

export function getFilenameFromAudioUrl(audioUrl: string): string {
  const pathname = audioUrl.startsWith("http")
    ? new URL(audioUrl).pathname
    : audioUrl;

  return pathname.split("/").pop() ?? "";
}

export function getMimeTypeFromFilename(filename: string): string {
  const extension = filename.split(".").pop()?.toLowerCase();

  const mimeMap: Record<string, string> = {
    webm: "audio/webm",
    mp4: "audio/mp4",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    ogg: "audio/ogg",
  };

  return mimeMap[extension ?? ""] ?? "application/octet-stream";
}

function getExtensionFromMimeType(mimeType: string): string {
  const mimeMap: Record<string, string> = {
    "audio/webm": "webm",
    "audio/mp4": "mp4",
    "audio/mpeg": "mp3",
    "audio/wav": "wav",
    "audio/ogg": "ogg",
  };

  return mimeMap[mimeType] || "webm";
}

function buildAudioUrl(filename: string): string {
  const publicUrl = getR2PublicUrl(filename);
  if (publicUrl) {
    return publicUrl;
  }

  return `/uploads/audio/${filename}`;
}

async function fileExists(filepath: string): Promise<boolean> {
  try {
    await access(filepath, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

export async function findAudioFilePath(filename: string): Promise<string | null> {
  if (!isValidAudioFilename(filename)) {
    return null;
  }

  const candidates = [
    join(getAudioUploadDir(), filename),
    join(getLegacyAudioUploadDir(), filename),
  ];

  for (const filepath of candidates) {
    if (await fileExists(filepath)) {
      return filepath;
    }
  }

  return null;
}

export async function saveAudioFile(
  audioBuffer: Buffer,
  mimeType: string
): Promise<UploadResult> {
  const timestamp = Date.now();
  const randomId = randomBytes(8).toString("hex");
  const extension = getExtensionFromMimeType(mimeType);
  const filename = `audio_${timestamp}_${randomId}.${extension}`;
  const contentType = getMimeTypeFromFilename(filename);

  if (isR2Configured()) {
    await uploadToR2(audioBuffer, filename, contentType);
  } else {
    const { mkdir, writeFile } = await import("fs/promises");
    const uploadDir = getAudioUploadDir();
    await mkdir(uploadDir, { recursive: true });
    await writeFile(join(uploadDir, filename), audioBuffer);
  }

  return {
    url: buildAudioUrl(filename),
    filename,
  };
}

export async function readAudioBuffer(
  audioUrl: string
): Promise<{ buffer: Buffer; contentType: string }> {
  const filename = getFilenameFromAudioUrl(audioUrl);

  if (filename && isValidAudioFilename(filename) && isR2Configured()) {
    const r2File = await getFromR2(filename);
    if (r2File) {
      return {
        buffer: r2File.buffer,
        contentType: r2File.contentType,
      };
    }
  }

  if (audioUrl.startsWith("http")) {
    const response = await fetch(audioUrl);
    if (!response.ok) {
      throw new Error(`Falha ao obter áudio: ${response.status}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    return {
      buffer,
      contentType:
        response.headers.get("content-type") ??
        getMimeTypeFromFilename(filename),
    };
  }

  const filepath = await findAudioFilePath(filename);
  if (!filepath) {
    throw new Error(`Ficheiro de áudio não encontrado: ${audioUrl}`);
  }

  const buffer = await readFile(filepath);

  return {
    buffer,
    contentType: getMimeTypeFromFilename(filename),
  };
}

export async function getAudioFileInfo(filename: string): Promise<{
  source: "r2" | "local";
  size: number;
  contentType: string;
  filepath?: string;
  publicUrl?: string;
} | null> {
  if (!isValidAudioFilename(filename)) {
    return null;
  }

  if (isR2Configured()) {
    const r2Info = await headR2Object(filename);
    if (r2Info) {
      return {
        source: "r2",
        size: r2Info.size,
        contentType: r2Info.contentType,
        publicUrl: getR2PublicUrl(filename) ?? undefined,
      };
    }
  }

  const filepath = await findAudioFilePath(filename);
  if (!filepath) {
    return null;
  }

  const fileStat = await stat(filepath);

  return {
    source: "local",
    size: fileStat.size,
    contentType: getMimeTypeFromFilename(filename),
    filepath,
  };
}

export async function readAudioChunk(
  filename: string,
  start: number,
  end: number
): Promise<{ buffer: Buffer; contentType: string } | null> {
  if (isR2Configured()) {
    const r2File = await getFromR2(filename, { start, end });
    if (r2File) {
      return {
        buffer: r2File.buffer,
        contentType: r2File.contentType,
      };
    }
  }

  const filepath = await findAudioFilePath(filename);
  if (!filepath) {
    return null;
  }

  const buffer = await readFile(filepath);

  return {
    buffer: buffer.subarray(start, end + 1),
    contentType: getMimeTypeFromFilename(filename),
  };
}
