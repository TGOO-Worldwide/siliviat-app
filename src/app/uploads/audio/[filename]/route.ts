import { readFile } from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import {
  getAudioFileInfo,
  isValidAudioFilename,
  readAudioChunk,
} from "@/lib/audio-storage";

interface RouteContext {
  params: Promise<{ filename: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { filename } = await context.params;

  if (!isValidAudioFilename(filename)) {
    return NextResponse.json({ error: "Ficheiro inválido" }, { status: 400 });
  }

  const fileInfo = await getAudioFileInfo(filename);
  if (!fileInfo) {
    return NextResponse.json({ error: "Áudio não encontrado" }, { status: 404 });
  }

  if (fileInfo.publicUrl) {
    return NextResponse.redirect(fileInfo.publicUrl, 307);
  }

  const rangeHeader = request.headers.get("range");

  if (rangeHeader) {
    const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
    if (!match) {
      return new NextResponse(null, { status: 416 });
    }

    const start = Number.parseInt(match[1], 10);
    const end = match[2]
      ? Number.parseInt(match[2], 10)
      : fileInfo.size - 1;

    if (start >= fileInfo.size || end >= fileInfo.size || start > end) {
      return new NextResponse(null, { status: 416 });
    }

    const chunk = await readAudioChunk(filename, start, end);
    if (!chunk) {
      return NextResponse.json({ error: "Áudio não encontrado" }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(chunk.buffer), {
      status: 206,
      headers: {
        "Content-Type": chunk.contentType,
        "Content-Length": String(chunk.buffer.length),
        "Content-Range": `bytes ${start}-${end}/${fileInfo.size}`,
        "Accept-Ranges": "bytes",
        "Cache-Control": "private, max-age=3600",
      },
    });
  }

  if (fileInfo.source === "local" && fileInfo.filepath) {
    const buffer = await readFile(fileInfo.filepath);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": fileInfo.contentType,
        "Content-Length": String(fileInfo.size),
        "Accept-Ranges": "bytes",
        "Cache-Control": "private, max-age=3600",
      },
    });
  }

  const fullFile = await readAudioChunk(filename, 0, fileInfo.size - 1);
  if (!fullFile) {
    return NextResponse.json({ error: "Áudio não encontrado" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(fullFile.buffer), {
    status: 200,
    headers: {
      "Content-Type": fullFile.contentType,
      "Content-Length": String(fileInfo.size),
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
