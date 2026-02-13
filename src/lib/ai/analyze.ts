import { z } from "zod";

/**
 * Helper para análise de transcrições usando LLM (OpenAI GPT)
 * Extrai sentimento, tags, resumo e próximas ações de forma estruturada
 */

// Schema Zod para validar output do LLM
export const AnalysisResultSchema = z.object({
  sentiment: z.enum(["POSITIVE", "NEGATIVE", "NEUTRAL"]),
  tags: z.array(z.string()).max(10),
  summary: z.string().min(10).max(500),
  next_actions: z
    .array(
      z.object({
        title: z.string().min(3).max(200),
        priority: z.enum(["high", "medium", "low"]),
        due_date: z.string().nullable().optional(), // ISO date ou null
      })
    )
    .max(5),
  suggested_followup: z
    .object({
      channel: z.enum(["email", "phone", "whatsapp", "meeting"]),
      message: z.string().min(20).max(1000).optional(),
    })
    .nullable()
    .optional(),
});

export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;

export interface AnalyzeOptions {
  transcriptText: string;
  companyName?: string;
  visitContext?: string;
}

/**
 * Analisa uma transcrição de visita usando LLM
 * Extrai sentimento, tags, resumo, próximas ações e sugestões de follow-up
 */
export async function analyzeTranscript(
  options: AnalyzeOptions
): Promise<AnalysisResult> {
  const apiKey = process.env.OPENAI_API_KEY;

  // Modo de desenvolvimento: se não houver API key, retornar análise simulada
  if (!apiKey) {
    console.warn(
      "⚠️  OPENAI_API_KEY não configurada. Usando análise simulada."
    );
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

  try {
    // Construir prompt estruturado
    const systemPrompt = `És um assistente de análise de visitas comerciais da TGOO, empresa portuguesa de telecomunicações.

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

    const userPrompt = `Analisa a seguinte transcrição de visita comercial:

${options.companyName ? `**Empresa visitada**: ${options.companyName}\n` : ""}${options.visitContext ? `**Contexto**: ${options.visitContext}\n` : ""}
**Transcrição**:
${options.transcriptText}

---

Responde em JSON seguindo o schema definido. Sê objetivo, profissional e focado em ações concretas.`;

    // Chamar API do OpenAI (GPT-4 ou GPT-3.5-turbo)
    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini", // Modelo eficiente e barato
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          response_format: { type: "json_object" }, // Força output JSON
          temperature: 0.3, // Baixa criatividade = mais consistente
          max_tokens: 1500,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Erro na API do OpenAI: ${response.status} - ${
          errorData.error?.message || response.statusText
        }`
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("Resposta vazia da API do OpenAI");
    }

    // Parse e validação com Zod
    const parsed = JSON.parse(content);
    const validated = AnalysisResultSchema.parse(parsed);

    return validated;
  } catch (error) {
    console.error("Erro ao analisar transcrição:", error);

    // Se for erro de validação Zod, dar mais detalhes
    if (error instanceof z.ZodError) {
      console.error("Erros de validação:", error.issues);
      throw new Error("Resposta da IA não seguiu o formato esperado");
    }

    throw new Error(
      `Falha na análise: ${
        error instanceof Error ? error.message : "Erro desconhecido"
      }`
    );
  }
}
