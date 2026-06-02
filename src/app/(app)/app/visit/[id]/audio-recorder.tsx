"use client";

import { useAudioRecorder } from "@/hooks/use-audio-recorder";
import { useState } from "react";

interface AudioRecorderProps {
  visitId: string;
  existingAudioUrl?: string | null;
  onUploadSuccess?: (audioUrl: string) => void;
}

export function AudioRecorder({
  visitId,
  existingAudioUrl,
  onUploadSuccess,
}: AudioRecorderProps) {
  const {
    state,
    audioBlob,
    audioUrl,
    recordingTime,
    startRecording,
    stopRecording,
    resetRecording,
    error: recorderError,
  } = useAudioRecorder();

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Formatar tempo de gravação (mm:ss)
  const formatTime = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleUpload = async () => {
    if (!audioBlob) return;

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(false);

    try {
      // Criar FormData com o ficheiro de áudio
      const formData = new FormData();
      formData.append("audio", audioBlob, `recording_${Date.now()}.webm`);

      // Fazer upload
      const response = await fetch(`/api/visits/${visitId}/audio`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao fazer upload");
      }

      const data = await response.json();
      setUploadSuccess(true);

      // Atualizar estado do pai antes de limpar a gravação local
      onUploadSuccess?.(data.audioUrl);
      resetRecording();

      setTimeout(() => {
        setUploadSuccess(false);
      }, 2000);
    } catch (err) {
      console.error("Erro no upload:", err);
      setUploadError(
        err instanceof Error ? err.message : "Erro desconhecido"
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm dark:bg-zinc-900">
      <h2 className="mb-1 text-lg font-semibold">Gravação de Áudio</h2>
      <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
        Grave a conversa com o cliente (máx. 5 minutos). Este áudio é para
        registo interno.
      </p>

      {/* Erro do recorder */}
      {recorderError && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          ⚠️ {recorderError}
        </div>
      )}

      {/* Erro do upload */}
      {uploadError && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          ❌ {uploadError}
        </div>
      )}

      {/* Sucesso do upload */}
      {uploadSuccess && (
        <div className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          ✅ Áudio carregado com sucesso!
        </div>
      )}

      {/* Áudio existente */}
      {existingAudioUrl && !audioBlob && (
        <div className="mb-4 rounded-lg bg-blue-50 p-3 dark:bg-blue-950">
          <p className="mb-2 text-sm font-medium text-blue-900 dark:text-blue-100">
            📼 Áudio já carregado
          </p>
          <audio
            controls
            src={existingAudioUrl}
            className="w-full"
            preload="metadata"
          />
        </div>
      )}

      {/* Estado: Idle (pronto para gravar) */}
      {state === "idle" && !existingAudioUrl && (
        <button
          onClick={startRecording}
          className="h-14 w-full rounded-xl bg-emerald-600 font-semibold text-white hover:bg-emerald-700 active:bg-emerald-800"
        >
          🎤 Iniciar Gravação
        </button>
      )}

      {/* Estado: Recording (a gravar) */}
      {state === "recording" && (
        <div className="space-y-3">
          {/* Indicador de gravação */}
          <div className="flex items-center justify-center gap-3 rounded-lg bg-red-50 p-4 dark:bg-red-950">
            <div className="h-3 w-3 animate-pulse rounded-full bg-red-600"></div>
            <span className="text-lg font-mono font-semibold text-red-700 dark:text-red-300">
              {formatTime(recordingTime)}
            </span>
          </div>

          {/* Botão parar */}
          <button
            onClick={stopRecording}
            className="h-14 w-full rounded-xl bg-red-600 font-semibold text-white hover:bg-red-700 active:bg-red-800"
          >
            ⏹️ Parar Gravação
          </button>
        </div>
      )}

      {/* Estado: Finished (gravação concluída) */}
      {state === "finished" && audioUrl && (
        <div className="space-y-3">
          {/* Preview do áudio */}
          <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800">
            <p className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              🎵 Preview (duração: {formatTime(recordingTime)})
            </p>
            <audio controls src={audioUrl} className="w-full" preload="auto" />
          </div>

          {/* Botões de ação */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={resetRecording}
              disabled={isUploading}
              className="h-12 rounded-xl border-2 border-zinc-300 bg-white font-semibold text-zinc-700 hover:bg-zinc-50 active:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              🔄 Regravar
            </button>
            <button
              onClick={handleUpload}
              disabled={isUploading}
              className="h-12 rounded-xl bg-blue-600 font-semibold text-white hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50"
            >
              {isUploading ? "⏳ A enviar..." : "✅ Guardar Áudio"}
            </button>
          </div>
        </div>
      )}

      {/* Opção de regravar se já existe áudio */}
      {existingAudioUrl && !audioBlob && (
        <button
          onClick={startRecording}
          className="mt-3 h-12 w-full rounded-xl border-2 border-emerald-600 bg-white font-semibold text-emerald-700 hover:bg-emerald-50 active:bg-emerald-100 dark:bg-zinc-900 dark:text-emerald-400 dark:hover:bg-zinc-800"
        >
          🎤 Gravar Novo Áudio
        </button>
      )}
    </section>
  );
}
