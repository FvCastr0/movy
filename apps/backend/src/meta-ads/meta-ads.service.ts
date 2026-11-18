import {
  Injectable,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SaveMetaConfigDto } from './dto/save-meta-config.dto';
import { QueryInsightsDto } from './dto/query-insights.dto';
import { encryptToken, decryptToken } from '../common/utils/crypto.util';

export interface MetaAdsMetrics {
  spend: number;
  conversas: number;
  costPerChat: number;
  clicks: number;
  impressions: number;
  ctr: number;
  cpc: number;
  roas?: number;
  cpr?: number;
  isSimulated?: boolean;
}

interface CachedInsight {
  data: any;
  cachedAt: number;
}

@Injectable()
export class MetaAdsService {
  private readonly logger = new Logger(MetaAdsService.name);
  private readonly GRAPH_API_BASE = 'https://graph.facebook.com/v21.0';

  // Cache em Memória: TTL de 15 minutos para evitar requisições redundantes na Meta
  private readonly insightsCache = new Map<string, CachedInsight>();
  private readonly CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutos

  // Cooldown de 60 segundos por cliente para proteção contra rajadas (Anti-Ban)
  private readonly clientCooldowns = new Map<string, number>();
  private readonly COOLDOWN_MS = 60 * 1000; // 60 segundos

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Higieniza o ID da conta de anúncios garantindo o prefixo "act_".
   */
  private formatAdAccountId(rawId: string): string {
    const trimmed = rawId.trim();
    return trimmed.startsWith('act_') ? trimmed : `act_${trimmed}`;
  }

  /**
   * Realiza uma chamada de teste (ping) na Graph API para validar credenciais.
   */
  async pingAccount(adAccountId: string, accessToken: string) {
    const formattedId = this.formatAdAccountId(adAccountId);
    const url = `${this.GRAPH_API_BASE}/${formattedId}?fields=name,account_status,currency,timezone_name&access_token=${accessToken}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        const errorMsg = data.error?.message || 'Erro de autenticação na Meta Graph API.';
        const errorCode = data.error?.code;

        if (errorCode === 190) {
          throw new UnauthorizedException(
            `Token de acesso inválido ou expirado (OAuth 190): ${errorMsg}`
          );
        } else if (errorCode === 17) {
          throw new BadRequestException(
            `Limite de chamadas (Rate Limit) da Meta atingido. Aguarde alguns minutos antes de tentar novamente.`
          );
        } else {
          throw new BadRequestException(
            `Falha ao validar conta na Meta (Código ${errorCode}): ${errorMsg}`
          );
        }
      }

      return {
        id: data.id,
        name: data.name,
        accountStatus: data.account_status,
        currency: data.currency,
        timezone: data.timezone_name,
      };
    } catch (err: any) {
      if (err instanceof BadRequestException || err instanceof UnauthorizedException) {
        throw err;
      }
      this.logger.error(`Erro ao conectar com a Meta Graph API: ${err.message}`);
      throw new BadRequestException(`Não foi possível conectar com a API da Meta: ${err.message}`);
    }
  }

  /**
   * Salva as credenciais do cliente com criptografia simétrica AES-256-GCM
   * e estipula a data de expiração para tokens de usuário (60 dias).
   */
  async saveConfig(clientId: string, dto: SaveMetaConfigDto) {
    const client = await this.prisma.client.findUnique({ where: { id: clientId } });
    if (!client) {
      throw new NotFoundException(`Cliente com ID ${clientId} não encontrado.`);
    }

    const formattedId = this.formatAdAccountId(dto.metaAdAccountId);

    // Valida credenciais com ping real na Meta
    const accountInfo = await this.pingAccount(formattedId, dto.accessToken);

    // Criptografa o token de acesso
    const encryptedToken = encryptToken(dto.accessToken);

    const now = new Date();
    // Tokens de usuário expiram em até 60 dias
    const expiresAt = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

    const updated = await this.prisma.client.update({
      where: { id: clientId },
      data: {
        metaAdAccountId: formattedId,
        metaAccessTokenEnc: encryptedToken,
        metaTokenStatus: 'ACTIVE',
        metaTokenCreatedAt: now,
        metaTokenExpiresAt: expiresAt,
        metaLastSyncAt: now,
      },
    });

    // Limpa caches antigos do cliente
    this.clearClientCache(clientId);

    return {
      success: true,
      message: 'Credenciais Meta Ads salvas e validadas com sucesso.',
      accountName: accountInfo.name,
      metaAdAccountId: updated.metaAdAccountId,
      status: updated.metaTokenStatus,
      expiresAt: updated.metaTokenExpiresAt,
      daysValid: 60,
    };
  }

  /**
   * Consulta o status das credenciais sem expor o token criptografado.
   */
  async getConfigStatus(clientId: string) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        deliveryNome: true,
        metaAdAccountId: true,
        metaTokenStatus: true,
        metaTokenCreatedAt: true,
        metaTokenExpiresAt: true,
        metaLastSyncAt: true,
        metaAccessTokenEnc: true,
      },
    });

    if (!client) {
      throw new NotFoundException(`Cliente com ID ${clientId} não encontrado.`);
    }

    const hasToken = !!client.metaAccessTokenEnc;
    let isExpired = false;
    let daysRemaining = 0;

    if (client.metaTokenExpiresAt) {
      const diffMs = new Date(client.metaTokenExpiresAt).getTime() - Date.now();
      daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      isExpired = diffMs <= 0;
    }

    return {
      clientId: client.id,
      deliveryNome: client.deliveryNome,
      metaAdAccountId: client.metaAdAccountId,
      hasToken,
      status: isExpired ? 'EXPIRED' : client.metaTokenStatus || 'NOT_CONFIGURED',
      createdAt: client.metaTokenCreatedAt,
      expiresAt: client.metaTokenExpiresAt,
      daysRemaining,
      isNearExpiry: daysRemaining <= 10 && daysRemaining > 0,
      isExpired,
      lastSyncAt: client.metaLastSyncAt,
    };
  }

  /**
   * Consulta métricas consolidadas a nível de conta (level=account) com:
   * 1. Cache em memória de 15 minutos
   * 2. Cooldown anti-rajada de 60 segundos
   * 3. Mapeamento de conversas de WhatsApp
   */
  async fetchAccountInsights(clientId: string, dto: QueryInsightsDto) {
    const client = await this.prisma.client.findUnique({ where: { id: clientId } });
    if (!client) {
      throw new NotFoundException(`Cliente com ID ${clientId} não encontrado.`);
    }

    if (!client.metaAdAccountId || !client.metaAccessTokenEnc) {
      throw new BadRequestException(
        'Este cliente ainda não possui conta e token Meta Ads configurados.'
      );
    }

    // Período padrão: últimos 7 dias até hoje
    const today = new Date();
    const until = dto.until || today.toISOString().split('T')[0];
    const defaultSince = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];
    const since = dto.since || defaultSince;

    const cacheKey = `${clientId}:${since}:${until}`;
    const forceRefresh = dto.force === 'true' || dto.force === '1';

    // 1. Verificação de Cache
    const cached = this.insightsCache.get(cacheKey);
    const now = Date.now();
    if (!forceRefresh && cached && now - cached.cachedAt < this.CACHE_TTL_MS) {
      return {
        ...cached.data,
        cached: true,
        cacheExpiresInSeconds: Math.ceil((this.CACHE_TTL_MS - (now - cached.cachedAt)) / 1000),
      };
    }

    // 2. Proteção Anti-Rajada (Cooldown de 60 segundos por cliente)
    const lastRequestTime = this.clientCooldowns.get(clientId) || 0;
    const timeSinceLastReq = now - lastRequestTime;

    if (forceRefresh && timeSinceLastReq < this.COOLDOWN_MS) {
      // Se estiver no cooldown e já tivermos cache, retorna do cache avisando o tempo
      if (cached) {
        return {
          ...cached.data,
          cached: true,
          cooldownWarning: `Cooldown ativo para proteção contra banimento da Meta. Aguarde ${Math.ceil(
            (this.COOLDOWN_MS - timeSinceLastReq) / 1000
          )}s para nova requisição direta.`,
        };
      }
      throw new BadRequestException(
        `Limite de segurança ativo para evitar bloqueio da conta Meta. Aguarde ${Math.ceil(
          (this.COOLDOWN_MS - timeSinceLastReq) / 1000
        )} segundos antes de atualizar novamente.`
      );
    }

    // 3. Descriptografa token de acesso
    let plainToken: string;
    try {
      plainToken = decryptToken(client.metaAccessTokenEnc);
    } catch {
      throw new BadRequestException(
        'Falha ao descriptografar token Meta Ads. Chave de criptografia inválida ou alterada.'
      );
    }

    // 4. Chamada na Graph API com level=account
    const fields = [
      'spend',
      'impressions',
      'clicks',
      'cpc',
      'cpm',
      'ctr',
      'actions',
      'cost_per_action_type',
      'purchase_roas',
    ].join(',');

    const timeRangeJson = encodeURIComponent(JSON.stringify({ since, until }));
    const url = `${this.GRAPH_API_BASE}/${client.metaAdAccountId}/insights?level=account&fields=${fields}&time_range=${timeRangeJson}&access_token=${plainToken}`;

    try {
      this.clientCooldowns.set(clientId, now);

      const response = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });

      // Monitoramento dos headers de uso da Meta
      const appUsage = response.headers.get('x-app-usage');
      if (appUsage) {
        this.logger.debug(`Meta x-app-usage para ${client.deliveryNome}: ${appUsage}`);
      }

      const data = await response.json();

      if (!response.ok || data.error) {
        const errorMsg = data.error?.message || 'Erro ao consultar insights na Meta.';
        const errorCode = data.error?.code;

        if (errorCode === 190) {
          await this.prisma.client.update({
            where: { id: clientId },
            data: { metaTokenStatus: 'EXPIRED' },
          });
          throw new UnauthorizedException(
            `Token Meta expirado ou revogado (OAuth 190). Renove o token de 60 dias no cadastro.`
          );
        } else if (errorCode === 17) {
          throw new BadRequestException(
            `Rate limit da Meta atingido para esta conta. Tente novamente mais tarde.`
          );
        }

        throw new BadRequestException(`Erro retornado pela Meta (Código ${errorCode}): ${errorMsg}`);
      }

      const rows = data.data || [];
      const row = rows[0] || {};

      const spend = parseFloat(row.spend) || 0;
      const impressions = parseInt(row.impressions, 10) || 0;
      const clicks = parseInt(row.clicks, 10) || 0;
      const ctr = parseFloat(row.ctr) || (impressions > 0 ? (clicks / impressions) * 100 : 0);
      const cpc = parseFloat(row.cpc) || (clicks > 0 ? spend / clicks : 0);

      // Extrai conversas de mensagens (WhatsApp / Direct)
      const actions: any[] = row.actions || [];
      let conversas = 0;

      for (const act of actions) {
        const actionType = act.action_type;
        const val = parseInt(act.value, 10) || 0;

        if (
          actionType === 'onsite_conversion.messaging_conversation_started_7d' ||
          actionType === 'onsite_conversion.messaging_first_reply' ||
          actionType === 'contact' ||
          actionType === 'lead' ||
          actionType.includes('messaging')
        ) {
          conversas += val;
        }
      }

      // Se não houver conversas rastreadas com as tags acima mas houver cliques
      const cpa = conversas > 0 ? spend / conversas : spend;

      // Extrai ROAS (purchase_roas) se disponível na Meta
      let roas = 0;
      if (Array.isArray(row.purchase_roas) && row.purchase_roas.length > 0) {
        roas = parseFloat(row.purchase_roas[0].value) || 0;
      }

      // Se não houver purchase_roas na Meta, busca faturamento recente do cliente para estimar ROAS
      if (roas === 0 && spend > 0 && this.prisma.clientRevenueReport) {
        const latestRevenue = await this.prisma.clientRevenueReport.findFirst({
          where: { clientId },
          orderBy: { createdAt: 'desc' },
        });
        if (latestRevenue && latestRevenue.grossRevenue > 0) {
          roas = Number((latestRevenue.grossRevenue / spend).toFixed(2));
        }
      }

      // Extrai CPR (Custo por Resultado)
      const costPerActions: any[] = row.cost_per_action_type || [];
      let cpr = 0;
      for (const cpaItem of costPerActions) {
        const type = cpaItem.action_type;
        const val = parseFloat(cpaItem.value) || 0;
        if (
          type === 'onsite_conversion.messaging_conversation_started_7d' ||
          type === 'purchase' ||
          type === 'omni_purchase' ||
          type === 'contact' ||
          type.includes('messaging')
        ) {
          cpr = val;
          break;
        }
      }

      if (cpr === 0) {
        cpr = conversas > 0 ? Number((spend / conversas).toFixed(2)) : cpc;
      }

      const result = {
        clientId: client.id,
        deliveryNome: client.deliveryNome,
        adAccountId: client.metaAdAccountId,
        periodStart: since,
        periodEnd: until,
        spend: Number(spend.toFixed(2)),
        impressions,
        clicks,
        ctr: Number(ctr.toFixed(2)),
        cpc: Number(cpc.toFixed(2)),
        conversas,
        cpa: Number(cpa.toFixed(2)),
        cpr: Number(cpr.toFixed(2)),
        roas: Number(roas.toFixed(2)),
        cached: false,
        cachedAt: new Date(now).toISOString(),
      };

      // Salva no cache em memória
      this.insightsCache.set(cacheKey, { data: result, cachedAt: now });

      // Atualiza timestamp de última sincronização
      await this.prisma.client.update({
        where: { id: clientId },
        data: { metaLastSyncAt: new Date() },
      });

      return result;
    } catch (err: any) {
      if (err instanceof BadRequestException || err instanceof UnauthorizedException) {
        throw err;
      }
      this.logger.error(`Erro inesperado ao consultar Meta Insights: ${err.message}`);
      throw new BadRequestException(`Falha ao obter insights da Meta: ${err.message}`);
    }
  }

  /**
   * Sincroniza o snapshot de performance da Meta para a tabela AdAccountMetrics,
   * alimentando diretamente o Semáforo de Risco Operacional.
   */
  async syncSnapshotToMetrics(clientId: string) {
    const todayStr = new Date().toISOString().split('T')[0];
    const insights = await this.fetchAccountInsights(
      clientId,
      { since: todayStr, until: todayStr, force: 'true' }
    );

    // Salva ou atualiza a métrica do dia no AdAccountMetrics
    const todayDate = new Date(todayStr);

    const existing = await this.prisma.adAccountMetrics.findFirst({
      where: {
        clientId,
        date: {
          gte: todayDate,
          lt: new Date(todayDate.getTime() + 24 * 60 * 60 * 1000),
        },
      },
    });

    let metricRecord;
    if (existing) {
      metricRecord = await this.prisma.adAccountMetrics.update({
        where: { id: existing.id },
        data: {
          spend: insights.spend,
          impressions: insights.impressions,
          clicks: insights.clicks,
          conversas: insights.conversas,
          cpa: insights.cpa,
        },
      });
    } else {
      metricRecord = await this.prisma.adAccountMetrics.create({
        data: {
          clientId,
          date: todayDate,
          spend: insights.spend,
          balance: 300, // Saldo estimado ou obtido
          impressions: insights.impressions,
          clicks: insights.clicks,
          conversas: insights.conversas,
          cpa: insights.cpa,
        },
      });
    }

    return {
      success: true,
      message: 'Métricas da Meta sincronizadas com o semáforo de risco.',
      metricRecord,
      insights,
    };
  }

  /**
   * Método compatível com o ReportsService para emissão de relatório semanal.
   */
  async getWeeklyInsights(
    adAccountId?: string | null,
    startDate?: Date,
    endDate?: Date,
    allowSimulation = false
  ): Promise<MetaAdsMetrics> {
    if (!adAccountId) {
      return {
        spend: 0,
        conversas: 0,
        costPerChat: 0,
        clicks: 0,
        impressions: 0,
        ctr: 0,
        cpc: 0,
        isSimulated: false,
      };
    }

    const formattedId = this.formatAdAccountId(adAccountId);
    const client = await this.prisma.client.findFirst({
      where: { metaAdAccountId: formattedId },
    });

    if (!client || !client.metaAccessTokenEnc) {
      return {
        spend: 0,
        conversas: 0,
        costPerChat: 0,
        clicks: 0,
        impressions: 0,
        ctr: 0,
        cpc: 0,
        isSimulated: false,
      };
    }

    try {
      const since = startDate
        ? startDate.toISOString().split('T')[0]
        : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const until = endDate ? endDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

      const res = await this.fetchAccountInsights(client.id, { since, until });

      return {
        spend: res.spend,
        conversas: res.conversas,
        costPerChat: res.cpa,
        clicks: res.clicks,
        impressions: res.impressions,
        ctr: res.ctr,
        cpc: res.cpc,
        roas: res.roas,
        cpr: res.cpr,
        isSimulated: false,
      };
    } catch {
      return {
        spend: 0,
        conversas: 0,
        costPerChat: 0,
        clicks: 0,
        impressions: 0,
        ctr: 0,
        cpc: 0,
        isSimulated: false,
      };
    }
  }

  /**
   * Limpa o cache de um cliente específico.
   */
  private clearClientCache(clientId: string) {
    for (const key of this.insightsCache.keys()) {
      if (key.startsWith(`${clientId}:`)) {
        this.insightsCache.delete(key);
      }
    }
  }
}
