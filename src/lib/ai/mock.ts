import type { AnalysisResult } from "./analyze";
import type { TranscriptionResult } from "./transcribe";

export function getSimulatedTranscription(): TranscriptionResult {
  return {
    text: "Esta é uma transcrição simulada para desenvolvimento. O cliente mostrou interesse nos nossos serviços de fibra ótica e pediu uma proposta comercial detalhada. Mencionou que a concorrência ofereceu um preço mais baixo, mas está satisfeito com a qualidade do nosso suporte técnico. Prometeu responder até sexta-feira.",
    duration: 180,
    language: "pt",
  };
}

export function getSimulatedAnalysis(): AnalysisResult {
  return {
    sentiment: "POSITIVE",
    tags: [
      "fibra ótica",
      "proposta comercial",
      "concorrência",
      "preço",
      "follow-up urgente",
    ],
    summary:
      "Cliente demonstrou interesse claro nos serviços de fibra ótica e solicitou proposta comercial. Mencionou oferta da concorrência com preço inferior, mas valoriza a qualidade do suporte técnico da TGOO. Compromisso de resposta até sexta-feira.",
    next_actions: [
      {
        title: "Enviar proposta comercial detalhada",
        priority: "high",
        due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
      },
      {
        title: "Follow-up telefónico na sexta-feira",
        priority: "high",
        due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
      },
      {
        title: "Preparar argumentos sobre valor vs. concorrência",
        priority: "medium",
        due_date: null,
      },
    ],
    suggested_followup: {
      channel: "email",
      message:
        "Bom dia,\n\nConforme conversado na nossa reunião, segue em anexo a proposta comercial para os serviços de Fibra Ótica.\n\nDestacamos que além do preço competitivo, oferecemos suporte técnico 24/7 de excelência, instalação em 48h e garantia de velocidade.\n\nFico disponível para esclarecer qualquer dúvida.\n\nAguardo o vosso contacto até sexta-feira.\n\nCumprimentos",
    },
  };
}
