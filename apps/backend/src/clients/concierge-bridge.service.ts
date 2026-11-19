import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SyncClientConciergeDto } from './dto/sync-client-concierge.dto';

@Injectable()
export class ConciergeBridgeService {
  private readonly logger = new Logger(ConciergeBridgeService.name);

  constructor(private readonly prisma: PrismaService) {}

  private getConciergeApiBaseUrl(): string {
    return (
      process.env.CONCIERGE_API_URL || 'http://localhost:3002/api/v1'
    ).replace(/\/+$/, '');
  }

  private getInternalApiKey(): string {
    return (
      process.env.CONCIERGE_INTERNAL_API_KEY ||
      'movy_s2s_concierge_internal_secret_2026'
    );
  }

  /**
   * OWASP A03 / A10 (Anti-SSRF):
   * Valida que o link do cardápio digital seja estritamente HTTPS e público.
   */
  validateSafeHttpsMenuUrl(urlStr?: string): void {
    if (!urlStr) return;

    let parsed: URL;
    try {
      parsed = new URL(urlStr);
    } catch {
      throw new BadRequestException(
        'A URL do cardápio digital deve ser um endereço HTTPS válido.',
      );
    }

    if (parsed.protocol !== 'https:') {
      throw new BadRequestException(
        'A URL do cardápio digital deve usar o protocolo seguro https://',
      );
    }

    const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
    if (
      !host ||
      !host.includes('.') ||
      host === 'localhost' ||
      host.endsWith('.local') ||
      host.endsWith('.internal') ||
      host === '::1' ||
      host === '0.0.0.0'
    ) {
      throw new BadRequestException(
        'A URL do cardápio digital não pode apontar para hosts locais ou internos.',
      );
    }

    const ipv4Match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (ipv4Match) {
      const [, a, b] = ipv4Match.map(Number);
      if (
        a === 127 ||
        a === 10 ||
        a === 0 ||
        (a === 169 && b === 254) ||
        (a === 192 && b === 168) ||
        (a === 172 && b >= 16 && b <= 31)
      ) {
        throw new BadRequestException(
          'A URL do cardápio digital não pode apontar para endereços IP privados.',
        );
      }
    }
  }

  /**
   * Sincroniza o `Client` da MOVY com o microserviço `concierge-api` via S2S
   * (`POST /internal/tenants/sync`), ativando ou pausando o AI Concierge do cliente.
   */
  async syncClientConcierge(clientId: string, dto: SyncClientConciergeDto) {
    this.validateSafeHttpsMenuUrl(dto.digitalMenuUrl);

    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      throw new NotFoundException(`Cliente ${clientId} não encontrado.`);
    }

    const baseUrl = this.getConciergeApiBaseUrl();
    const internalKey = this.getInternalApiKey();

    let remoteTenantId = client.conciergeTenantId || null;
    let serviceSynced = false;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(`${baseUrl}/internal/tenants/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Concierge-Internal-Key': internalKey,
        },
        body: JSON.stringify({
          movyClientId: client.id,
          name: client.deliveryNome,
          segment: client.segmento,
          city: client.cidade,
          whatsappPhone: client.whatsapp,
          isActive: dto.enabled,
          ...(dto.digitalMenuUrl ? { digitalMenuUrl: dto.digitalMenuUrl.trim() } : {}),
          ...(dto.wabaId !== undefined ? { wabaId: dto.wabaId } : {}),
          ...(dto.phoneNumberId !== undefined
            ? { phoneNumberId: dto.phoneNumberId }
            : {}),
          ...(dto.metaAccessToken ? { metaAccessToken: dto.metaAccessToken } : {}),
          ...(dto.webhookVerifyToken
            ? { webhookVerifyToken: dto.webhookVerifyToken }
            : {}),
          ...(dto.ownerEmail ? { ownerEmail: dto.ownerEmail.trim().toLowerCase() } : {}),
          ...(dto.ownerName ? { ownerName: dto.ownerName.trim() } : {}),
          ...(dto.ownerPassword ? { ownerPassword: dto.ownerPassword } : {}),
        }),
        signal: controller.signal,
      });

      if (response.ok) {
        const data = (await response.json()) as any;
        remoteTenantId = data?.tenant?.id || remoteTenantId;
        serviceSynced = true;
      } else {
        this.logger.warn(
          `Concierge microservice returned status ${response.status} on sync for client ${clientId}`,
        );
      }
    } catch (err) {
      this.logger.warn(
        `Concierge microservice unreachable on sync for client ${clientId}: ${
          err instanceof Error ? err.message : 'timeout'
        }`,
      );
    } finally {
      clearTimeout(timeout);
    }

    const updatedClient = await this.prisma.client.update({
      where: { id: clientId },
      data: {
        aiConciergeEnabled: dto.enabled,
        ...(remoteTenantId ? { conciergeTenantId: remoteTenantId } : {}),
        ...(dto.digitalMenuUrl
          ? { conciergeDigitalMenuUrl: dto.digitalMenuUrl.trim() }
          : {}),
        ...(dto.ownerEmail
          ? { conciergeOwnerEmail: dto.ownerEmail.trim().toLowerCase() }
          : {}),
        ...(serviceSynced ? { conciergeLastSyncedAt: new Date() } : {}),
      },
    });

    return {
      clientId: updatedClient.id,
      aiConciergeEnabled: updatedClient.aiConciergeEnabled,
      conciergeTenantId: updatedClient.conciergeTenantId,
      conciergeDigitalMenuUrl: updatedClient.conciergeDigitalMenuUrl,
      conciergeOwnerEmail: updatedClient.conciergeOwnerEmail,
      conciergeLastSyncedAt: updatedClient.conciergeLastSyncedAt,
      serviceSynced,
    };
  }

  /**
   * Consulta as 5 métricas consolidadas do AI Concierge no microserviço
   * com isolamento de falhas (se o microserviço estiver offline, retorna estado degradado sem erro 500).
   */
  async getClientConciergeSummary(
    clientId: string,
    periodStart?: string,
    periodEnd?: string,
  ) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      throw new NotFoundException(`Cliente ${clientId} não encontrado.`);
    }

    if (!client.aiConciergeEnabled && !client.conciergeTenantId) {
      return {
        clientId: client.id,
        enabled: false,
        provisioned: false,
        serviceAvailable: true,
        aiGlobalEnabled: false,
        hasMetaCredentials: false,
        digitalMenuUrl: client.conciergeDigitalMenuUrl || null,
        ownerEmail: client.conciergeOwnerEmail || null,
        lastSyncedAt: client.conciergeLastSyncedAt || null,
        knowledgeBase: null,
        metrics: null,
      };
    }

    const baseUrl = this.getConciergeApiBaseUrl();
    const internalKey = this.getInternalApiKey();

    const queryParams = new URLSearchParams();
    if (periodStart) queryParams.set('periodStart', periodStart);
    if (periodEnd) queryParams.set('periodEnd', periodEnd);
    const qs = queryParams.toString() ? `?${queryParams.toString()}` : '';

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(
        `${baseUrl}/internal/tenants/${encodeURIComponent(client.id)}/summary${qs}`,
        {
          method: 'GET',
          headers: {
            'X-Concierge-Internal-Key': internalKey,
          },
          signal: controller.signal,
        },
      );

      if (response.ok) {
        const remote = (await response.json()) as any;
        return {
          clientId: client.id,
          enabled: client.aiConciergeEnabled,
          provisioned: true,
          serviceAvailable: true,
          tenantId: remote.tenantId || client.conciergeTenantId,
          aiGlobalEnabled: Boolean(remote.aiGlobalEnabled),
          hasMetaCredentials: Boolean(remote.hasMetaCredentials),
          wabaId: remote.wabaId || null,
          phoneNumberId: remote.phoneNumberId || null,
          digitalMenuUrl:
            remote.knowledgeBase?.digitalMenuUrl ||
            client.conciergeDigitalMenuUrl ||
            null,
          ownerEmail: client.conciergeOwnerEmail || null,
          lastSyncedAt: client.conciergeLastSyncedAt || null,
          knowledgeBase: remote.knowledgeBase || null,
          metrics: remote.metrics || {
            totalConversations: 0,
            avgFirstResponseMs: 0,
            menuLinkSentCount: 0,
            aiResolvedCount: 0,
            humanHandoffCount: 0,
            aiRetentionRatePercent: 0,
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0,
            estimatedCostUsd: 0,
          },
        };
      }
    } catch (err) {
      this.logger.warn(
        `Concierge microservice offline when fetching summary for client ${clientId}: ${
          err instanceof Error ? err.message : 'timeout'
        }`,
      );
    } finally {
      clearTimeout(timeout);
    }

    // Degradação graciosa (Fault Isolation - OWASP A04)
    return {
      clientId: client.id,
      enabled: client.aiConciergeEnabled,
      provisioned: Boolean(client.conciergeTenantId),
      serviceAvailable: false,
      tenantId: client.conciergeTenantId || null,
      aiGlobalEnabled: false,
      hasMetaCredentials: false,
      digitalMenuUrl: client.conciergeDigitalMenuUrl || null,
      ownerEmail: client.conciergeOwnerEmail || null,
      lastSyncedAt: client.conciergeLastSyncedAt || null,
      knowledgeBase: null,
      metrics: {
        totalConversations: 0,
        avgFirstResponseMs: 0,
        menuLinkSentCount: 0,
        aiResolvedCount: 0,
        humanHandoffCount: 0,
        aiRetentionRatePercent: 0,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        estimatedCostUsd: 0,
      },
    };
  }
}
