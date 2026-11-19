import { Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../common/crypto/encryption.service';
import { SyncTenantDto } from './dto/sync-tenant.dto';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class TenantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryptionService: EncryptionService,
  ) {}

  async syncTenantFromMovy(dto: SyncTenantDto) {
    const encryptedToken = dto.metaAccessToken
      ? this.encryptionService.encrypt(dto.metaAccessToken)
      : undefined;

    const tenant = await this.prisma.deliveryTenant.upsert({
      where: { movyClientId: dto.movyClientId },
      create: {
        movyClientId: dto.movyClientId,
        name: dto.name.trim(),
        segment: dto.segment.trim(),
        city: dto.city.trim(),
        whatsappPhone: dto.whatsappPhone.trim(),
        isActive: dto.isActive ?? true,
        wabaId: dto.wabaId?.trim() || null,
        phoneNumberId: dto.phoneNumberId?.trim() || null,
        metaAccessTokenEnc: encryptedToken || null,
        webhookVerifyToken: dto.webhookVerifyToken?.trim() || null,
      },
      update: {
        name: dto.name.trim(),
        segment: dto.segment.trim(),
        city: dto.city.trim(),
        whatsappPhone: dto.whatsappPhone.trim(),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.wabaId !== undefined ? { wabaId: dto.wabaId?.trim() || null } : {}),
        ...(dto.phoneNumberId !== undefined
          ? { phoneNumberId: dto.phoneNumberId?.trim() || null }
          : {}),
        ...(encryptedToken !== undefined
          ? { metaAccessTokenEnc: encryptedToken }
          : {}),
        ...(dto.webhookVerifyToken !== undefined
          ? { webhookVerifyToken: dto.webhookVerifyToken?.trim() || null }
          : {}),
      },
    });

    const knowledgeBase = await this.prisma.tenantKnowledgeBase.upsert({
      where: { tenantId: tenant.id },
      create: {
        tenantId: tenant.id,
        ...(dto.digitalMenuUrl ? { digitalMenuUrl: dto.digitalMenuUrl } : {}),
      },
      update: {
        ...(dto.digitalMenuUrl ? { digitalMenuUrl: dto.digitalMenuUrl } : {}),
      },
    });

    let ownerUser: {
      id: string;
      name: string;
      email: string;
      role: string;
    } | null = null;

    if (dto.ownerEmail && dto.ownerPassword) {
      const passwordHash = await bcrypt.hash(dto.ownerPassword, BCRYPT_ROUNDS);
      const normalizedEmail = dto.ownerEmail.trim().toLowerCase();

      const savedUser = await this.prisma.deliveryUser.upsert({
        where: { email: normalizedEmail },
        create: {
          tenantId: tenant.id,
          name: (dto.ownerName || `Gestor ${dto.name}`).trim(),
          email: normalizedEmail,
          passwordHash,
          role: 'OWNER',
          isActive: true,
        },
        update: {
          tenantId: tenant.id,
          name: (dto.ownerName || `Gestor ${dto.name}`).trim(),
          passwordHash,
          role: 'OWNER',
          isActive: true,
        },
      });

      ownerUser = {
        id: savedUser.id,
        name: savedUser.name,
        email: savedUser.email,
        role: savedUser.role,
      };
    }

    return {
      tenant: {
        id: tenant.id,
        movyClientId: tenant.movyClientId,
        name: tenant.name,
        segment: tenant.segment,
        city: tenant.city,
        whatsappPhone: tenant.whatsappPhone,
        isActive: tenant.isActive,
        aiGlobalEnabled: tenant.aiGlobalEnabled,
        wabaId: tenant.wabaId,
        phoneNumberId: tenant.phoneNumberId,
        hasMetaCredentials: Boolean(
          tenant.wabaId && tenant.phoneNumberId && tenant.metaAccessTokenEnc,
        ),
      },
      knowledgeBase,
      ownerUser,
    };
  }

  async getTenantSummaryForMovy(
    movyClientId: string,
    periodStart?: string,
    periodEnd?: string,
  ) {
    const tenant = await this.prisma.deliveryTenant.findUnique({
      where: { movyClientId },
      include: { knowledgeBase: true },
    });

    if (!tenant) {
      throw new NotFoundException(
        `Tenant não encontrado para o cliente MOVY: ${movyClientId}`,
      );
    }

    const dateFilter: Record<string, Date> = {};
    if (periodStart) {
      dateFilter.gte = new Date(periodStart);
    }
    if (periodEnd) {
      dateFilter.lte = new Date(periodEnd);
    }

    const dailyRows = await this.prisma.tenantDailyMetric.findMany({
      where: {
        tenantId: tenant.id,
        ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}),
      },
      orderBy: { date: 'desc' },
    });

    let totalConversations = 0;
    let aiResolvedCount = 0;
    let humanHandoffCount = 0;
    let menuLinkSentCount = 0;
    let weightedResponseSum = 0;
    let promptTokens = 0;
    let completionTokens = 0;
    let estimatedCostUsd = 0;

    for (const row of dailyRows) {
      totalConversations += row.totalConversations;
      aiResolvedCount += row.aiResolvedCount;
      humanHandoffCount += row.humanHandoffCount;
      menuLinkSentCount += row.menuLinkSentCount;
      weightedResponseSum += row.totalConversations * row.avgFirstResponseMs;
      promptTokens += row.promptTokens;
      completionTokens += row.completionTokens;
      estimatedCostUsd += row.estimatedCostUsd;
    }

    const avgFirstResponseMs =
      totalConversations > 0
        ? Math.round(weightedResponseSum / totalConversations)
        : 0;

    const aiRetentionRatePercent =
      totalConversations > 0
        ? Math.round((aiResolvedCount / totalConversations) * 100)
        : 0;

    return {
      tenantId: tenant.id,
      movyClientId: tenant.movyClientId,
      name: tenant.name,
      isActive: tenant.isActive,
      aiGlobalEnabled: tenant.aiGlobalEnabled,
      hasMetaCredentials: Boolean(
        tenant.wabaId && tenant.phoneNumberId && tenant.metaAccessTokenEnc,
      ),
      wabaId: tenant.wabaId,
      phoneNumberId: tenant.phoneNumberId,
      knowledgeBase: tenant.knowledgeBase
        ? {
            digitalMenuUrl: tenant.knowledgeBase.digitalMenuUrl,
            llmProvider: tenant.knowledgeBase.llmProvider,
            llmModel: tenant.knowledgeBase.llmModel,
            estimatedDeliveryMinutes:
              tenant.knowledgeBase.estimatedDeliveryMinutes,
            estimatedPickupMinutes: tenant.knowledgeBase.estimatedPickupMinutes,
          }
        : null,
      metrics: {
        totalConversations,
        avgFirstResponseMs,
        menuLinkSentCount,
        aiResolvedCount,
        humanHandoffCount,
        aiRetentionRatePercent,
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
        estimatedCostUsd: Number(estimatedCostUsd.toFixed(6)),
      },
    };
  }
}
