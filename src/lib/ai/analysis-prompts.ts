import type { AnalyzeOptions } from "./analyze";

export function getAnalysisSystemPrompt(): string {
  return `És um assistente de análise de visitas comerciais da TGOO, empresa portuguesa de telecomunicações.

A tua função é analisar transcrições de conversas entre comerciais e clientes e extrair:
1. **Sentimento geral**: POSITIVE, NEGATIVE ou NEUTRAL
2. **Tags relevantes**: palavras-chave importantes (máximo 10)
3. **Resumo**: síntese objetiva da conversa (100-500 caracteres)
4. **Próximas ações**: até 5 tarefas concretas a realizar
5. **Sugestão de follow-up**: canal e mensagem opcional

Responde SEMPRE em formato JSON válido seguindo EXATAMENTE este schema:
{
  "sentiment": "POSITIVE" | "NEGATIVE" | "NEUTRAL",
  "tags": ["tag1", "tag2", ...],
  "summary": "texto do resumo",
  "next_actions": [
    {
      "title": "ação a realizar",
      "priority": "high" | "medium" | "low",
      "due_date": "YYYY-MM-DD" ou null
    }
  ],
  "suggested_followup": {
    "channel": "email" | "phone" | "whatsapp" | "meeting",
    "message": "texto opcional"
  } ou null
}`;
}

export function getAnalysisUserPrompt(options: AnalyzeOptions): string {
  return `Analisa a seguinte transcrição de visita comercial:

${options.companyName ? `**Empresa visitada**: ${options.companyName}\n` : ""}${options.visitContext ? `**Contexto**: ${options.visitContext}\n` : ""}
**Transcrição**:
${options.transcriptText}

---

Responde em JSON seguindo o schema definido. Sê objetivo, profissional e focado em ações concretas.`;
}
