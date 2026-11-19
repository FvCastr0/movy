import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface MetricEventInput {
  tenantId: string;
  isNewConversation: boolean;
  aiResolvedDelta: number;
  humanHandoffDelta: number;
  menuLinkSentDelta: number;
  firstResponseMs?: number;
  promptTokens: number;
  completionTokens: number;
  estimatedCostUsd: number;
  date?: Date;
}

@Injectable()
export class MetricsRecorderService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Consolida atomicamente as 5 métricas diárias do tenant em `TenantDailyMetric`
   * para leitura imediata pelo painel da MOVY (`movy-crm-bridge`).
   */
  async recordInteractionMetrics(input: MetricEventInput) {
    const rawDate = input.date || new Date();
    const dayStartUtc = new Date(
      Date.UTC(
        rawDate.getUTCFullYear(),
        rawDate.getUTCMonth(),
        rawDate.getUTCDate(),
      ),
    );

    const existing = await this.prisma.tenantDailyMetric.findUnique({
      where: {
        tenantId_date: {
          tenantId: input.tenantId,
          date: dayStartUtc,
        },
      },
    });

    if (!existing) {
      return this.prisma.tenantDailyMetric.create({
        data: {
          tenantId: input.tenantId,
          date: dayStartUtc,
          totalConversations: input.isNewConversation ? 1 : 0,
          aiResolvedCount: Math.max(0, input.aiResolvedDelta),
          humanHandoffCount: Math.max(0, input.humanHandoffDelta),
          menuLinkSentCount: Math.max(0, input.menuLinkSentDelta),
          avgFirstResponseMs: input.firstResponseMs ?? 0,
          promptTokens: input.promptTokens,
          completionTokens: input.completionTokens,
          estimatedCostUsd: input.estimatedCostUsd,
        },
      });
    }

    const newTotalConversations =
      existing.totalConversations + (input.isNewConversation ? 1 : 0);

    let newAvgFirstResponseMs = existing.avgFirstResponseMs;
    if (input.firstResponseMs !== undefined && input.firstResponseMs > 0) {
      if (existing.totalConversations === 0 || existing.avgFirstResponseMs === 0) {
        newAvgFirstResponseMs = input.firstResponseMs;
      } else {
        newAvgFirstResponseMs = Math.round(
          (existing.avgFirstResponseMs * existing.totalConversations +
            input.firstResponseMs) /
            Math.max(1, newTotalConversations),
        );
      }
    }

    return this.prisma.tenantDailyMetric.update({
      where: { id: existing.id },
      data: {
        totalConversations: newTotalConversations,
        aiResolvedCount: Math.max(
          0,
          existing.aiResolvedCount + input.aiResolvedDelta,
        ),
        humanHandoffCount: Math.max(
          0,
          existing.humanHandoffCount + input.humanHandoffDelta,
        ),
        menuLinkSentCount: Math.max(
          0,
          existing.menuLinkSentCount + input.menuLinkSentDelta,
        ),
        avgFirstResponseMs: newAvgFirstResponseMs,
        promptTokens: existing.promptTokens + input.promptTokens,
        completionTokens: existing.completionTokens + input.completionTokens,
        estimatedCostUsd: Number(
          (existing.estimatedCostUsd + input.estimatedCostUsd).toFixed(7),
        ),
      },
    });
  }
}
