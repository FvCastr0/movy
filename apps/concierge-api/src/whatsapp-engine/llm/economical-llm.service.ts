import { Injectable, Logger } from '@nestjs/common';

export interface LlmChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface LlmTriageDecision {
  replyText: string;
  sentMenuLink: boolean;
  requiresHumanHandoff: boolean;
  handoffReason: string | null;
  handoffSummary: string | null;
  promptTokens: number;
  completionTokens: number;
  estimatedCostUsd: number;
}

// Tabela oficial de preços por 1 Milhão de tokens (Modelos Econômicos)
const MODEL_PRICING_PER_1M: Record<
  string,
  { inputUsd: number; outputUsd: number }
> = {
  'gpt-4o-mini': { inputUsd: 0.15, outputUsd: 0.6 },
  'gemini-2.5-flash': { inputUsd: 0.075, outputUsd: 0.3 },
  'gemini-2.0-flash': { inputUsd: 0.075, outputUsd: 0.3 },
};

@Injectable()
export class EconomicalLlmService {
  private readonly logger = new Logger(EconomicalLlmService.name);

  calculateCostUsd(
    model: string,
    promptTokens: number,
    completionTokens: number,
  ): number {
    const pricing =
      MODEL_PRICING_PER_1M[model] || MODEL_PRICING_PER_1M['gpt-4o-mini'];
    const cost =
      (promptTokens / 1_000_000) * pricing.inputUsd +
      (completionTokens / 1_000_000) * pricing.outputUsd;
    return Number(cost.toFixed(7));
  }

  /**
   * OWASP LLM05 (Improper Output Handling):
   * Valida e sanitiza a saída JSON do LLM como input não-confiável.
   * Bloqueia qualquer URL externa que não seja o `digitalMenuUrl` oficial do delivery.
   */
  sanitizeModelDecision(
    rawJsonText: string,
    digitalMenuUrl: string,
    promptTokens: number,
    completionTokens: number,
    model: string,
  ): LlmTriageDecision {
    let parsed: Record<string, unknown> = {};
    try {
      const cleaned = rawJsonText
        .replace(/^```json\s*/i, '')
        .replace(/```$/i, '')
        .trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = {
        replyText:
          rawJsonText.slice(0, 600) ||
          `Olá! Confira nosso cardápio digital para fazer seu pedido rapidinho: ${digitalMenuUrl}`,
        sentMenuLink: rawJsonText.includes(digitalMenuUrl),
        requiresHumanHandoff: false,
      };
    }

    let replyText =
      typeof parsed.replyText === 'string' && parsed.replyText.trim().length > 0
        ? parsed.replyText.trim().slice(0, 1000)
        : `Olá! Confira nosso cardápio digital: ${digitalMenuUrl}`;

    // OWASP LLM05: Substitui qualquer URL http/https na resposta que não seja o digitalMenuUrl oficial
    replyText = replyText.replace(/https?:\/\/[^\s)]+/gi, (matchedUrl) => {
      const cleanMatch = matchedUrl.replace(/[.,;!?]+$/, '');
      if (cleanMatch === digitalMenuUrl) {
        return matchedUrl;
      }
      return digitalMenuUrl;
    });

    const requiresHumanHandoff = Boolean(parsed.requiresHumanHandoff);
    const sentMenuLink =
      Boolean(parsed.sentMenuLink) || replyText.includes(digitalMenuUrl);

    const handoffReason =
      requiresHumanHandoff && typeof parsed.handoffReason === 'string'
        ? parsed.handoffReason.trim().slice(0, 150)
        : requiresHumanHandoff
          ? 'Solicitação ou dúvida que requer atendente humano'
          : null;

    const handoffSummary =
      requiresHumanHandoff && typeof parsed.handoffSummary === 'string'
        ? parsed.handoffSummary.trim().slice(0, 500)
        : requiresHumanHandoff
          ? 'Cliente encaminhado pela IA para atendimento humano no WhatsApp.'
          : null;

    return {
      replyText,
      sentMenuLink,
      requiresHumanHandoff,
      handoffReason,
      handoffSummary,
      promptTokens,
      completionTokens,
      estimatedCostUsd: this.calculateCostUsd(
        model,
        promptTokens,
        completionTokens,
      ),
    };
  }

  /**
   * Executa a triagem inteligente usando modelo econômico (gpt-4o-mini ou gemini-2.5-flash)
   * com teto de 300 tokens de saída e fallback determinístico humanizado caso a chave de API não esteja configurada.
   */
  async generateTriageResponse(params: {
    provider: 'OPENAI' | 'GEMINI';
    model: string;
    systemPrompt: string;
    digitalMenuUrl: string;
    tenantName: string;
    history: LlmChatMessage[];
    customerMessage: string;
  }): Promise<LlmTriageDecision> {
    // OWASP LLM01/LLM10: Trunca mensagem do cliente a 1000 chars e histórico às últimas 8 interações
    const safeCustomerMessage = params.customerMessage.trim().slice(0, 1000);
    const recentHistory = params.history.slice(-8);

    const jsonInstruction = [
      params.systemPrompt,
      '',
      'FORMATO DE SAÍDA OBRIGATÓRIO (Responda APENAS um objeto JSON válido, sem markdown):',
      '{"replyText": "sua resposta curta e humanizada de WhatsApp", "sentMenuLink": true|false, "requiresHumanHandoff": true|false, "handoffReason": "motivo curto ou null", "handoffSummary": "resumo para o atendente ou null"}',
    ].join('\n');

    const openAiKey = process.env.OPENAI_API_KEY;
    if (params.provider === 'OPENAI' && openAiKey) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${openAiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: params.model || 'gpt-4o-mini',
            temperature: 0.4,
            max_tokens: 300,
            response_format: { type: 'json_object' },
            messages: [
              { role: 'system', content: jsonInstruction },
              ...recentHistory.map((m) => ({
                role: m.role,
                content: m.content.slice(0, 600),
              })),
              { role: 'user', content: safeCustomerMessage },
            ],
          }),
          signal: controller.signal,
        });

        if (res.ok) {
          const data = (await res.json()) as any;
          const content = data?.choices?.[0]?.message?.content || '{}';
          const promptTokens = Number(data?.usage?.prompt_tokens || 250);
          const completionTokens = Number(data?.usage?.completion_tokens || 60);

          return this.sanitizeModelDecision(
            content,
            params.digitalMenuUrl,
            promptTokens,
            completionTokens,
            params.model,
          );
        }
      } catch (err) {
        this.logger.warn(
          `OpenAI call failed, using deterministic fallback: ${
            err instanceof Error ? err.message : 'error'
          }`,
        );
      } finally {
        clearTimeout(timeout);
      }
    }

    // Fallback determinístico inteligente (usado quando chaves externas de LLM não estão presentes ou falham)
    return this.buildHeuristicFallback(
      safeCustomerMessage,
      params.digitalMenuUrl,
      params.tenantName,
      params.model,
    );
  }

  private buildHeuristicFallback(
    customerMessage: string,
    digitalMenuUrl: string,
    tenantName: string,
    model: string,
  ): LlmTriageDecision {
    const lower = customerMessage.toLowerCase();
    const handoffKeywords = [
      'atrasado',
      'atraso',
      'errado',
      'reclama',
      'reembolso',
      'estorno',
      'frio',
      'atendente',
      'humano',
      'gerente',
      'problema',
      'faltando',
    ];

    const matchedKeyword = handoffKeywords.find((kw) => lower.includes(kw));
    const estPromptTokens = Math.max(120, Math.ceil(customerMessage.length / 3) + 180);

    if (matchedKeyword) {
      const replyText = `Puxa, entendi! Já chamei nossa equipe aqui no WhatsApp da ${tenantName} para te ajudar com isso agora mesmo, só um instante! 🙏`;
      const estCompletionTokens = 38;
      return {
        replyText,
        sentMenuLink: false,
        requiresHumanHandoff: true,
        handoffReason: `Cliente mencionou "${matchedKeyword}"`,
        handoffSummary: `Cliente enviou: "${customerMessage.slice(0, 220)}". Necessita intervenção do atendente.`,
        promptTokens: estPromptTokens,
        completionTokens: estCompletionTokens,
        estimatedCostUsd: this.calculateCostUsd(
          model,
          estPromptTokens,
          estCompletionTokens,
        ),
      };
    }

    const replyText = `Oi! Tudo bem? 😊 Estamos atendendo na ${tenantName}! Para ver todas as opções, valores e fazer seu pedido direto pra nossa cozinha rapidinho, acesse nosso cardápio digital: ${digitalMenuUrl}`;
    const estCompletionTokens = 45;

    return {
      replyText,
      sentMenuLink: true,
      requiresHumanHandoff: false,
      handoffReason: null,
      handoffSummary: null,
      promptTokens: estPromptTokens,
      completionTokens: estCompletionTokens,
      estimatedCostUsd: this.calculateCostUsd(
        model,
        estPromptTokens,
        estCompletionTokens,
      ),
    };
  }
}
