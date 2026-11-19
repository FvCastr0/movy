import {
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { KnowledgeBaseService } from '../../knowledge-base/knowledge-base.service';
import { EconomicalLlmService } from '../llm/economical-llm.service';
import { MetaCloudApiService } from '../meta/meta-cloud-api.service';
import { MetricsRecorderService } from '../metrics/metrics-recorder.service';

@Injectable()
export class MetaWebhookService {
  private readonly logger = new Logger(MetaWebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly kbService: KnowledgeBaseService,
    private readonly llmService: EconomicalLlmService,
    private readonly metaCloudApi: MetaCloudApiService,
    private readonly metricsRecorder: MetricsRecorderService,
  ) {}

  /**
   * Valida o desafio GET /api/v1/webhooks/meta da Meta Cloud API.
   */
  async verifyWebhookChallenge(
    mode?: string,
    verifyToken?: string,
    challenge?: string,
  ): Promise<string> {
    if (mode !== 'subscribe' || !verifyToken || !challenge) {
      throw new ForbiddenException('Parâmetros de verificação Meta inválidos');
    }

    const globalVerifyToken =
      process.env.META_WEBHOOK_VERIFY_TOKEN || 'movy_meta_verify_token_2026';

    if (verifyToken === globalVerifyToken) {
      return challenge;
    }

    const tenantMatch = await this.prisma.deliveryTenant.findFirst({
      where: { webhookVerifyToken: verifyToken, isActive: true },
    });

    if (tenantMatch) {
      return challenge;
    }

    throw new ForbiddenException('Verify token inválido');
  }

  /**
   * Processa o payload de webhook da Meta WhatsApp Cloud API (Coexistence).
   * Suporta:
   * - `messages`: mensagens recebidas de clientes finais
   * - `smb_message_echoes` / `message_echoes`: mensagens enviadas pelo atendente humano
   *   diretamente no aplicativo WhatsApp Business (Coexistence), pausando a IA automaticamente.
   */
  async handleMetaWebhookPayload(payload: any) {
    const entries = Array.isArray(payload?.entry) ? payload.entry : [];
    const results: Array<{
      status: string;
      conversationId?: string;
      sentMenuLink?: boolean;
    }> = [];

    for (const entry of entries) {
      const changes = Array.isArray(entry?.changes) ? entry.changes : [];
      for (const change of changes) {
        const field: string = change?.field || 'messages';
        const value = change?.value;
        const phoneNumberId: string | undefined =
          value?.metadata?.phone_number_id;

        if (!phoneNumberId) {
          continue;
        }

        const tenant = await this.prisma.deliveryTenant.findUnique({
          where: { phoneNumberId },
          include: { knowledgeBase: true },
        });

        if (!tenant || !tenant.isActive) {
          continue;
        }

        // 1. Detecção de WhatsApp Coexistence Echo (Atendente humano respondeu pelo celular/WhatsApp Business)
        const echoMessages = Array.isArray(value?.message_echoes)
          ? value.message_echoes
          : field === 'smb_message_echoes' && Array.isArray(value?.messages)
            ? value.messages
            : [];

        for (const echoMsg of echoMessages) {
          const customerPhone = String(echoMsg?.to || echoMsg?.recipient_id || '').trim();
          const metaMessageId = echoMsg?.id ? String(echoMsg.id) : undefined;
          const textBody =
            echoMsg?.text?.body || '[Mensagem enviada pelo atendente via WhatsApp Business]';

          if (!customerPhone) {
            continue;
          }

          const echoRes = await this.handleHumanCoexistenceEcho({
            tenantId: tenant.id,
            customerPhone,
            metaMessageId,
            content: textBody,
          });
          results.push(echoRes);
        }

        // 2. Processamento de mensagens inbound de consumidores finais
        if (field === 'messages' && Array.isArray(value?.messages)) {
          const contacts = Array.isArray(value?.contacts) ? value.contacts : [];
          for (const msg of value.messages) {
            const fromPhone = String(msg?.from || '').trim();
            const metaMessageId = msg?.id ? String(msg.id) : undefined;
            const displayPhone = String(
              value?.metadata?.display_phone_number || '',
            ).replace(/\D/g, '');

            // Caso a mensagem venha do próprio número do restaurante, trata como Coexistence Echo
            if (fromPhone && displayPhone && fromPhone === displayPhone) {
              const targetCustomer = String(msg?.to || '').trim();
              if (targetCustomer) {
                const echoRes = await this.handleHumanCoexistenceEcho({
                  tenantId: tenant.id,
                  customerPhone: targetCustomer,
                  metaMessageId,
                  content: msg?.text?.body || '[Intervenção no WhatsApp Business]',
                });
                results.push(echoRes);
              }
              continue;
            }

            const contactProfile = contacts.find(
              (c: any) => String(c?.wa_id || '') === fromPhone,
            );
            const customerName = contactProfile?.profile?.name
              ? String(contactProfile.profile.name).slice(0, 120)
              : undefined;

            const textContent = this.extractMessageContent(msg);
            const inboundRes = await this.processInboundCustomerMessage({
              tenant,
              customerPhone: fromPhone,
              customerName,
              metaMessageId,
              textContent,
            });
            results.push(inboundRes);
          }
        }
      }
    }

    return { processed: results.length, results };
  }

  private extractMessageContent(msg: any): string {
    if (msg?.type === 'text' && msg?.text?.body) {
      return String(msg.text.body).slice(0, 1000);
    }
    if (msg?.type === 'interactive') {
      return String(
        msg?.interactive?.button_reply?.title ||
          msg?.interactive?.list_reply?.title ||
          '[Interação de botão]',
      ).slice(0, 500);
    }
    if (msg?.type === 'audio' || msg?.type === 'voice') {
      return '[Cliente enviou um áudio]';
    }
    if (msg?.type === 'image' || msg?.type === 'document') {
      return '[Cliente enviou uma imagem/comprovante]';
    }
    return String(msg?.text?.body || '[Mensagem de mídia]').slice(0, 500);
  }

  /**
   * Quando o atendente do delivery responde diretamente pelo WhatsApp Business (Coexistence),
   * registramos a mensagem como HUMAN_ATTENDANT e pausamos a IA (`HUMAN_HANDOFF`) para não atropelar o humano.
   */
  private async handleHumanCoexistenceEcho(params: {
    tenantId: string;
    customerPhone: string;
    metaMessageId?: string;
    content: string;
  }) {
    if (params.metaMessageId) {
      const duplicate = await this.prisma.conversationMessage.findUnique({
        where: { metaMessageId: params.metaMessageId },
      });
      if (duplicate) {
        return { status: 'duplicate_ignored', conversationId: duplicate.conversationId };
      }
    }

    const existingConv = await this.prisma.conversation.findUnique({
      where: {
        tenantId_customerPhone: {
          tenantId: params.tenantId,
          customerPhone: params.customerPhone,
        },
      },
    });

    const wasAlreadyHandoff = existingConv?.status === 'HUMAN_HANDOFF';
    const isNewConv = !existingConv;

    const conversation = await this.prisma.conversation.upsert({
      where: {
        tenantId_customerPhone: {
          tenantId: params.tenantId,
          customerPhone: params.customerPhone,
        },
      },
      create: {
        tenantId: params.tenantId,
        customerPhone: params.customerPhone,
        status: 'HUMAN_HANDOFF',
        handoffReason: 'Atendente assumiu pelo WhatsApp Business (Coexistence)',
        handoffSummary: `Atendente humano enviou mensagem diretamente pelo WhatsApp Business: "${params.content.slice(0, 180)}"`,
        handoffTriggeredAt: new Date(),
        lastMessageAt: new Date(),
      },
      update: {
        status: 'HUMAN_HANDOFF',
        handoffReason:
          existingConv?.handoffReason ||
          'Atendente assumiu pelo WhatsApp Business (Coexistence)',
        handoffSummary:
          existingConv?.handoffSummary ||
          `Atendente humano respondeu pelo WhatsApp Business: "${params.content.slice(0, 180)}"`,
        handoffTriggeredAt: existingConv?.handoffTriggeredAt || new Date(),
        lastMessageAt: new Date(),
      },
    });

    await this.prisma.conversationMessage.create({
      data: {
        conversationId: conversation.id,
        tenantId: params.tenantId,
        metaMessageId: params.metaMessageId,
        senderType: 'HUMAN_ATTENDANT',
        content: params.content.slice(0, 1000),
      },
    });

    if (!wasAlreadyHandoff) {
      await this.metricsRecorder.recordInteractionMetrics({
        tenantId: params.tenantId,
        isNewConversation: isNewConv,
        aiResolvedDelta: !isNewConv && existingConv?.status === 'AI_ACTIVE' ? -1 : 0,
        humanHandoffDelta: 1,
        menuLinkSentDelta: 0,
        promptTokens: 0,
        completionTokens: 0,
        estimatedCostUsd: 0,
      });
    }

    return {
      status: 'coexistence_human_handoff',
      conversationId: conversation.id,
    };
  }

  /**
   * Processa mensagem inbound do consumidor final:
   * 1. Verifica idempotência pelo `metaMessageId` (`wamid`)
   * 2. Cria/atualiza a `Conversation` e grava a `ConversationMessage` (`CUSTOMER`)
   * 3. Se `tenant.aiGlobalEnabled === false` ou `conversation.status === 'HUMAN_HANDOFF'`, não chama a IA
   * 4. Verifica Rate-Limit Anti-Flood de tokens por contato (OWASP A04/LLM10)
   * 5. Acumula no Buffer Redis e executa a triagem com `EconomicalLlmService`
   */
  private async processInboundCustomerMessage(params: {
    tenant: any;
    customerPhone: string;
    customerName?: string;
    metaMessageId?: string;
    textContent: string;
  }) {
    const startTimeMs = Date.now();

    if (params.metaMessageId) {
      const duplicate = await this.prisma.conversationMessage.findUnique({
        where: { metaMessageId: params.metaMessageId },
      });
      if (duplicate) {
        return {
          status: 'duplicate_ignored',
          conversationId: duplicate.conversationId,
        };
      }
    }

    const existingConv = await this.prisma.conversation.findUnique({
      where: {
        tenantId_customerPhone: {
          tenantId: params.tenant.id,
          customerPhone: params.customerPhone,
        },
      },
    });

    const isNewConversation = !existingConv;
    // Se estava RESOLVED, reabre como AI_ACTIVE para novo atendimento
    const nextInitialStatus =
      existingConv?.status === 'HUMAN_HANDOFF' ? 'HUMAN_HANDOFF' : 'AI_ACTIVE';

    const conversation = await this.prisma.conversation.upsert({
      where: {
        tenantId_customerPhone: {
          tenantId: params.tenant.id,
          customerPhone: params.customerPhone,
        },
      },
      create: {
        tenantId: params.tenant.id,
        customerPhone: params.customerPhone,
        customerName: params.customerName || null,
        status: 'AI_ACTIVE',
        lastCustomerMessageAt: new Date(),
        lastMessageAt: new Date(),
      },
      update: {
        ...(params.customerName ? { customerName: params.customerName } : {}),
        status: nextInitialStatus,
        lastCustomerMessageAt: new Date(),
        lastMessageAt: new Date(),
      },
    });

    await this.prisma.conversationMessage.create({
      data: {
        conversationId: conversation.id,
        tenantId: params.tenant.id,
        metaMessageId: params.metaMessageId,
        senderType: 'CUSTOMER',
        content: params.textContent,
      },
    });

    // Se a conversa já está em transbordo humano ou a chave global da IA do delivery está pausada
    if (
      conversation.status === 'HUMAN_HANDOFF' ||
      !params.tenant.aiGlobalEnabled
    ) {
      return {
        status:
          conversation.status === 'HUMAN_HANDOFF'
            ? 'paused_in_human_handoff'
            : 'ai_globally_paused',
        conversationId: conversation.id,
      };
    }

    // OWASP A04 / LLM10: Rate-limit por contato contra flood de tokens
    const rateLimitCheck = await this.redisService.checkContactAiRateLimit(
      params.tenant.id,
      params.customerPhone,
    );
    if (!rateLimitCheck.allowed) {
      await this.prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          status: 'HUMAN_HANDOFF',
          handoffReason: 'Limite de mensagens automáticas atingido (Anti-Flood)',
          handoffSummary:
            'Contato excedeu 15 mensagens em 15 minutos. IA pausada para proteção de custo de tokens.',
          handoffTriggeredAt: new Date(),
        },
      });
      return {
        status: 'contact_rate_limited_handoff',
        conversationId: conversation.id,
      };
    }

    // Agrupa mensagens no buffer Redis (debounce)
    await this.redisService.appendMessageToBuffer(
      params.tenant.id,
      params.customerPhone,
      params.textContent,
    );
    const bufferedTexts = await this.redisService.flushBufferedMessages(
      params.tenant.id,
      params.customerPhone,
    );
    const combinedCustomerMessage =
      bufferedTexts.length > 0
        ? bufferedTexts.join('\n')
        : params.textContent;

    const compiledPrompt = await this.kbService.compileSystemPrompt(
      params.tenant.id,
    );

    const recentMessages = await this.prisma.conversationMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
      take: 8,
    });

    const history = recentMessages
      .slice(0, -1)
      .map((m) => ({
        role:
          m.senderType === 'CUSTOMER'
            ? ('user' as const)
            : ('assistant' as const),
        content: m.content,
      }));

    const decision = await this.llmService.generateTriageResponse({
      provider: compiledPrompt.provider,
      model: compiledPrompt.model,
      systemPrompt: compiledPrompt.systemPrompt,
      digitalMenuUrl: compiledPrompt.digitalMenuUrl,
      tenantName: params.tenant.name,
      history,
      customerMessage: combinedCustomerMessage,
    });

    let outboundMetaId: string | undefined;
    if (params.tenant.phoneNumberId && params.tenant.metaAccessTokenEnc) {
      const sendRes = await this.metaCloudApi.sendTextMessage({
        phoneNumberId: params.tenant.phoneNumberId,
        metaAccessTokenEnc: params.tenant.metaAccessTokenEnc,
        recipientPhone: params.customerPhone,
        text: decision.replyText,
      });
      outboundMetaId = sendRes.metaMessageId;
    }

    await this.prisma.conversationMessage.create({
      data: {
        conversationId: conversation.id,
        tenantId: params.tenant.id,
        metaMessageId: outboundMetaId,
        senderType: 'AI_AGENT',
        content: decision.replyText,
        promptTokens: decision.promptTokens,
        completionTokens: decision.completionTokens,
        estimatedCostUsd: decision.estimatedCostUsd,
      },
    });

    const elapsedMs = Math.max(120, Date.now() - startTimeMs);
    const isFirstResponse = conversation.firstResponseMs == null;
    const isFirstMenuLinkInConv =
      decision.sentMenuLink && !conversation.menuLinkSent;

    const updatedStatus = decision.requiresHumanHandoff
      ? 'HUMAN_HANDOFF'
      : 'AI_ACTIVE';

    await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        status: updatedStatus,
        ...(decision.requiresHumanHandoff
          ? {
              handoffReason: decision.handoffReason,
              handoffSummary: decision.handoffSummary,
              handoffTriggeredAt: new Date(),
            }
          : {}),
        ...(decision.sentMenuLink ? { menuLinkSent: true } : {}),
        ...(isFirstResponse ? { firstResponseMs: elapsedMs } : {}),
        lastMessageAt: new Date(),
      },
    });

    // Calcula deltas exatos para `TenantDailyMetric`
    let aiResolvedDelta = 0;
    let humanHandoffDelta = 0;

    if (isNewConversation) {
      if (decision.requiresHumanHandoff) {
        humanHandoffDelta = 1;
      } else {
        aiResolvedDelta = 1;
      }
    } else if (decision.requiresHumanHandoff) {
      // Era uma conversa já contada como AI_ACTIVE e agora precisou transbordar para humano
      aiResolvedDelta = -1;
      humanHandoffDelta = 1;
    }

    await this.metricsRecorder.recordInteractionMetrics({
      tenantId: params.tenant.id,
      isNewConversation,
      aiResolvedDelta,
      humanHandoffDelta,
      menuLinkSentDelta: isFirstMenuLinkInConv ? 1 : 0,
      firstResponseMs: isFirstResponse ? elapsedMs : undefined,
      promptTokens: decision.promptTokens,
      completionTokens: decision.completionTokens,
      estimatedCostUsd: decision.estimatedCostUsd,
    });

    return {
      status: decision.requiresHumanHandoff
        ? 'ai_transferred_to_human'
        : 'ai_replied',
      conversationId: conversation.id,
      sentMenuLink: decision.sentMenuLink,
    };
  }
}
