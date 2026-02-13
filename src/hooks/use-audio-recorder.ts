"use client";

import { useState, useRef, useCallback } from "react";

export type RecorderState = "idle" | "recording" | "finished";

export interface UseAudioRecorderReturn {
  state: RecorderState;
  audioBlob: Blob | null;
  audioUrl: string | null;
  recordingTime: number;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  resetRecording: () => void;
  error: string | null;
}

const MAX_RECORDING_TIME = 5 * 60 * 1000; // 5 minutos em milissegundos

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [state, setState] = useState<RecorderState>("idle");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const maxTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      
      // Solicitar permissão de microfone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Criar MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/mp4",
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // Event handler para dados de áudio
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // Event handler quando a gravação para
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, {
          type: mediaRecorder.mimeType,
        });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        setState("finished");

        // Limpar stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
      };

      // Iniciar gravação
      mediaRecorder.start(1000); // Captura dados a cada 1 segundo
      setState("recording");
      setRecordingTime(0);

      // Timer para atualizar o tempo de gravação
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1000);
      }, 1000);

      // Timer para parar automaticamente após o tempo máximo
      maxTimeoutRef.current = setTimeout(() => {
        if (mediaRecorderRef.current?.state === "recording") {
          mediaRecorderRef.current.stop();
        }
      }, MAX_RECORDING_TIME);
    } catch (err) {
      console.error("Erro ao iniciar gravação:", err);
      setError(
        "Não foi possível aceder ao microfone. Verifique as permissões."
      );
      setState("idle");
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }

    // Limpar timers
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (maxTimeoutRef.current) {
      clearTimeout(maxTimeoutRef.current);
      maxTimeoutRef.current = null;
    }
  }, []);

  const resetRecording = useCallback(() => {
    // Parar gravação se estiver ativa
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }

    // Limpar timers
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (maxTimeoutRef.current) {
      clearTimeout(maxTimeoutRef.current);
      maxTimeoutRef.current = null;
    }

    // Limpar stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // Revogar URL do áudio
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }

    // Reset estado
    setState("idle");
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    setError(null);
    audioChunksRef.current = [];
    mediaRecorderRef.current = null;
  }, [audioUrl]);

  return {
    state,
    audioBlob,
    audioUrl,
    recordingTime,
    startRecording,
    stopRecording,
    resetRecording,
    error,
  };
}
