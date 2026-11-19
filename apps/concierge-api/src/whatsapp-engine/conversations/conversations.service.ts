import { Injectable, NotFoundException } from '@nestjs/common';
import { ConversationStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { MetricsRecorderService } from '../metrics/metrics-recorder.service';

@Injectable()
export class ConversationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly metricsRecorder: MetricsRecorderService,
  ) {}

  /**
   * Lista a fila prioritária de atendimentos que a IA transferiu para o atendente humano
   * (`HUMAN_HANDOFF`), com link direto `wa.me` para o atendente abrir no WhatsApp Business.
   */
  async listHandoffQueue(tenantId: string) {
    const items = await this.prisma.conversation.findMany({
      where: {
        tenantId,
        status: 'HUMAN_HANDOFF',
      },
      orderBy: { handoffTriggeredAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 3,
        },
      },
    });

    return items.map((c) => ({
      id: c.id,
      tenantId: c.tenantId,
      customerPhone: c.customerPhone,
      customerName: c.customerName || c.customerPhone,
      status: c.status,
      handoffReason: c.handoffReason,
      handoffSummary: c.handoffSummary,
      handoffTriggeredAt: c.handoffTriggeredAt,
      menuLinkSent: c.menuLinkSent,
      lastMessageAt: c.lastMessageAt,
      whatsappDeepLink: `https://wa.me/${c.customerPhone.replace(/\D/g, '')}`,
      recentMessages: [...c.messages].reverse(),
    }));
  }

  /**
   * Lista todas as conversas do delivery filtradas opcionalmente por status (`AI_ACTIVE`, `HUMAN_HANDOFF`, `RESOLVED`).
   */
  async listConversations(tenantId: string, status?: ConversationStatus) {
    const items = await this.prisma.conversation.findMany({
      where: {
        tenantId,
        ...(status ? { status } : {}),
      },
      orderBy: { lastMessageAt: 'desc' },
      take: 100,
    });

    return items.map((c) => ({
      ...c,
      whatsappDeepLink: `https://wa.me/${c.customerPhone.replace(/\D/g, '')}`,
    }));
  }

  /**
   * Retorna as mensagens de uma conversa garantindo isolamento Multi-Tenant estrito (Anti-IDOR - OWASP A01).
   */
  async getConversationMessages(tenantId: string, conversationId: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        tenantId,
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 100,
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversa não encontrada neste delivery.');
    }

    return {
      ...conversation,
      whatsappDeepLink: `https://wa.me/${conversation.customerPhone.replace(
        /\D/g,
        '',
      )}`,
    };
  }

  /**
   * Conclui o atendimento humano e devolve o contato para a IA (`AI_ACTIVE`),
   * permitindo que a IA volte a responder futuras mensagens desse cliente.
   */
  async resolveAndReturnToAi(tenantId: string, conversationId: string) {
    const existing = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        tenantId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Conversa não encontrada neste delivery.');
    }

    return this.prisma.conversation.update({
      where: { id: existing.id },
      data: {
        status: 'AI_ACTIVE',
        handoffReason: null,
        handoffSummary: null,
        handoffTriggeredAt: null,
      },
    });
  }

  /**
   * Permite ao atendente pausar manualmente a IA para um contato específico (`HUMAN_HANDOFF`).
   */
  async forceHumanHandoff(
    tenantId: string,
    conversationId: string,
    reason?: string,
  ) {
    const existing = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        tenantId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Conversa não encontrada neste delivery.');
    }

    const wasAlreadyHandoff = existing.status === 'HUMAN_HANDOFF';
    const updated = await this.prisma.conversation.update({
      where: { id: existing.id },
      data: {
        status: 'HUMAN_HANDOFF',
        handoffReason:
          reason?.trim().slice(0, 150) || 'Pausado manualmente pelo atendente',
        handoffSummary:
          existing.handoffSummary ||
          'Atendente assumiu manualmente a conversa pelo painel do delivery.',
        handoffTriggeredAt: new Date(),
      },
    });

    if (!wasAlreadyHandoff) {
      await this.metricsRecorder.recordInteractionMetrics({
        tenantId,
        isNewConversation: false,
        aiResolvedDelta: existing.status === 'AI_ACTIVE' ? -1 : 0,
        humanHandoffDelta: 1,
        menuLinkSentDelta: 0,
        promptTokens: 0,
        completionTokens: 0,
        estimatedCostUsd: 0,
      });
    }

    return updated;
  }
}
