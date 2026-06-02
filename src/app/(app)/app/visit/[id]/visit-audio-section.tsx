"use client";

import { useState } from "react";
import { AudioRecorder } from "./audio-recorder";
import { TranscriptionAnalysis } from "./transcription-analysis";

interface VisitAudioSectionProps {
  visitId: string;
  initialAudioUrl: string | null;
  transcriptionInitialData: {
    transcriptText: string | null;
    aiSentiment: string | null;
    aiTags: unknown;
    aiSummary: string | null;
    aiNextActions: unknown;
    suggestedFollowup: unknown;
  };
}

export function VisitAudioSection({
  visitId,
  initialAudioUrl,
  transcriptionInitialData,
}: VisitAudioSectionProps) {
  const [audioUrl, setAudioUrl] = useState(initialAudioUrl);

  return (
    <>
      <AudioRecorder
        visitId={visitId}
        existingAudioUrl={audioUrl}
        onUploadSuccess={setAudioUrl}
      />
      <TranscriptionAnalysis
        visitId={visitId}
        hasAudio={!!audioUrl}
        initialData={transcriptionInitialData}
      />
    </>
  );
}
