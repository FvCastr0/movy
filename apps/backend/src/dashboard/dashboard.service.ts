import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

export interface LeadInflowItem {
  date: string;       // YYYY-MM-DD
  label: string;      // DD/MM
  dayOfWeek: string;  // Seg, Ter, Qua...
  count: number;
}

export interface LatestWeeklyReportSummary {
  id: string;
  clientId: string;
  clientName: string;
  weekStartDate: string;
  weekEndDate: string;
  metaSpend: number;
  metaConversas: number;
  metaCostPerChat: number;
  metaRoas?: number | null;
  faturamentoTotal?: number | null;
  whatsappSent: boolean;
  pdfUrl?: string | null;
  createdAt: string;
}

export interface DashboardOverviewResponse {
  financial: {
    totalMrr: number;
    activeContracts: number;
    averageTicket: number;
    renewalsNext30Days: number;
    delinquentCount: number;
  };
  commercial: {
    totalLeads: number;
    pipelineValue: number;
    conversionRate: number;
    bookingRate: number;
    noShowRate: number;
    agendadosCount: number;
    noShowCount: number;
    leadsByStage: Record<string, number>;
    leadInflow: LeadInflowItem[];
    inflowTotal: number;
    inflowAverageDaily: number;
    peakDay: { date: string; count: number } | null;
  };
  operations: {
    activeClients: number;
    pausedClients: number;
    churnedClients: number;
    pendingWeeklyReports: number;
  };
  clientMetaAggregate: {
    period: 'month' | 'all_time';
    totalSpend: number;
    totalChats: number;
    averageCpr: number;
    averageRoas: number;
    activeAdAccounts: number;
    sinceDate?: string | null;
  };
  agencyMeta: {
    configured: boolean;
    adAccountId?: string | null;
    spend: number;
    leadsGenerated: number;
    costPerLead: number;
    impressions: number;
    clicks: number;
    status: 'ACTIVE' | 'NOT_CONFIGURED';
  };
  latestWeeklyReports: LatestWeeklyReportSummary[];
  recentAlerts: Array<{
    id: string;
    type: 'critical' | 'warning' | 'info';
    category: 'balance' | 'contract' | 'report';
    title: string;
    description: string;
    clientId?: string;
    clientName?: string;
    createdAt: string;
  }>;
}

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);
  private agencyMetaCache: { data: { spend: number; impressions: number; clicks: number }; cachedAt: number } | null = null;
  private readonly AGENCY_CACHE_TTL_MS = 15 * 60 * 1000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  private async getAgencyLiveMetrics(adAccountId: string, accessToken: string) {
    const now = Date.now();
    if (this.agencyMetaCache && now - this.agencyMetaCache.cachedAt < this.AGENCY_CACHE_TTL_MS) {
      return this.agencyMetaCache.data;
    }

    const cleanId = adAccountId.replace(/\r?\n|\r/g, '').trim();
    const cleanToken = accessToken.replace(/\r?\n|\r/g, '').trim();
    const formattedId = cleanId.startsWith('act_') ? cleanId : `act_${cleanId}`;
    const url = `https://graph.facebook.com/v21.0/${formattedId}/insights?date_preset=this_month&fields=spend,impressions,clicks&access_token=${cleanToken}`;

    try {
      const response = await fetch(url, { headers: { Accept: 'application/json' } });
      const data = await response.json();
      if (data && Array.isArray(data.data) && data.data.length > 0) {
        const item = data.data[0];
        const result = {
          spend: parseFloat(item.spend || '0'),
          impressions: parseInt(item.impressions || '0', 10),
          clicks: parseInt(item.clicks || '0', 10),
        };
        this.agencyMetaCache = { data: result, cachedAt: now };
        return result;
      }
    } catch (err: any) {
      this.logger.warn(`Falha na consulta live da agência Meta: ${err.message}`);
    }

    return this.agencyMetaCache?.data || { spend: 0, impressions: 0, clicks: 0 };
  }

  async getOverview(
    clientPeriod: 'month' | 'all_time' = 'month',
    leadDays: number = 14,
  ): Promise<DashboardOverviewResponse> {
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);

    // 1. Financeiro (Contracts + Clients)
    const [contracts, activeClientsCount, pausedClientsCount, churnedClientsCount] = await Promise.all([
      this.prisma.contract.findMany({
        where: {
          client: {
            status: 'ATIVO',
          },
        },
        select: {
          id: true,
          mrrEquivalent: true,
          totalValue: true,
          endDate: true,
          paymentStatus: true,
          clientId: true,
          client: {
            select: { id: true, deliveryNome: true },
          },
        },
      }),
      this.prisma.client.count({ where: { status: 'ATIVO' } }),
      this.prisma.client.count({ where: { status: 'PAUSADO' } }),
      this.prisma.client.count({ where: { status: 'CANCELADO' } }),
    ]);

    const totalMrr = contracts.reduce((acc, c) => acc + (c.mrrEquivalent || 0), 0);
    const activeContracts = contracts.length;
    const averageTicket = activeContracts > 0 ? Number((totalMrr / activeContracts).toFixed(2)) : 0;
    const delinquentCount = contracts.filter((c) => c.paymentStatus === 'INADIMPLENTE').length;

    const renewalsNext30Days = contracts.filter((c) => {
      if (!c.endDate) return false;
      const d = new Date(c.endDate);
      return d >= now && d <= thirtyDaysFromNow;
    }).length;

    // 2. Comercial (Leads/CRM + Inflow Temporal)
    const leads = await this.prisma.lead.findMany({
      select: {
        id: true,
        stage: true,
        dealValue: true,
        createdAt: true,
      },
    });

    const totalLeads = leads.length;
    const leadsByStage: Record<string, number> = {
      NOVO: 0,
      PRE_QUALIFICADO: 0,
      DESQUALIFICADO: 0,
      CONTATO_INICIADO: 0,
      REUNIAO_AGENDADA: 0,
      NO_SHOW: 0,
      PROPOSTA_ENVIADA: 0,
      FECHADO: 0,
      GANHO: 0,
      PERDIDO: 0,
    };

    let pipelineValue = 0;
    let closedCount = 0;

    leads.forEach((l) => {
      const st = l.stage || 'NOVO';
      leadsByStage[st] = (leadsByStage[st] || 0) + 1;

      if (st === 'FECHADO' || st === 'GANHO') {
        closedCount++;
      } else if (st !== 'PERDIDO' && st !== 'DESQUALIFICADO') {
        pipelineValue += l.dealValue || 0;
      }
    });

    const conversionRate = totalLeads > 0 ? Number(((closedCount / totalLeads) * 100).toFixed(1)) : 0;

    const scheduledEventsCount = this.prisma.leadStageHistory
      ? await this.prisma.leadStageHistory.count({
          where: { toStage: 'REUNIAO_AGENDADA', isReverted: false },
        })
      : 0;

    const noShowEventsCount = this.prisma.leadStageHistory
      ? await this.prisma.leadStageHistory.count({
          where: { toStage: 'NO_SHOW', isReverted: false },
        })
      : 0;

    const agendadosCount = scheduledEventsCount || leadsByStage['REUNIAO_AGENDADA'] || 0;
    const noShowCount = noShowEventsCount || leadsByStage['NO_SHOW'] || 0;
    const bookingRate = totalLeads > 0 ? Number(((agendadosCount / totalLeads) * 100).toFixed(1)) : 0;
    const noShowRate = agendadosCount > 0 ? Number(((noShowCount / agendadosCount) * 100).toFixed(1)) : 0;

    // Montar série temporal de chegada de leads (14, 30, 90 ou 180 dias contínuos)
    const validDays = [14, 30, 90, 180];
    const normalizedLeadDays = validDays.includes(leadDays) ? leadDays : 14;
    const daysMap = new Map<string, number>();
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    const inflowStartDate = new Date(now);
    inflowStartDate.setDate(now.getDate() - (normalizedLeadDays - 1));
    inflowStartDate.setHours(0, 0, 0, 0);

    // Inicializar mapa de datas zeradas
    for (let i = 0; i < normalizedLeadDays; i++) {
      const d = new Date(inflowStartDate);
      d.setDate(inflowStartDate.getDate() + i);
      const isoKey = d.toISOString().split('T')[0];
      daysMap.set(isoKey, 0);
    }

    // Contabilizar leads por dia
    leads.forEach((l) => {
      if (l.createdAt) {
        const leadDate = new Date(l.createdAt);
        const isoKey = leadDate.toISOString().split('T')[0];
        if (daysMap.has(isoKey)) {
          daysMap.set(isoKey, (daysMap.get(isoKey) || 0) + 1);
        }
      }
    });

    const leadInflow: LeadInflowItem[] = [];
    let inflowTotal = 0;
    let peakDay: { date: string; count: number } | null = null;

    daysMap.forEach((count, dateStr) => {
      inflowTotal += count;
      const parts = dateStr.split('-');
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      const label = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      const dayOfWeek = dayNames[d.getDay()];

      leadInflow.push({
        date: dateStr,
        label,
        dayOfWeek,
        count,
      });

      if (!peakDay || count > peakDay.count) {
        peakDay = { date: label, count };
      }
    });

    const inflowAverageDaily = Number((inflowTotal / normalizedLeadDays).toFixed(1));

    // 3. Meta Ads dos Clientes (Mês Atual vs Desde o Início)
    const clientsWithReports = await this.prisma.client.findMany({
      where: {
        status: { in: ['ATIVO', 'PAUSADO'] },
      },
      select: {
        id: true,
        deliveryNome: true,
        createdAt: true,
        metaAdAccountId: true,
        metaAccessTokenEnc: true,
        weeklyReports: {
          orderBy: { weekEndDate: 'desc' },
          // Se for all_time, pega todos; se for mês, pega os mais recentes (até 4)
          take: clientPeriod === 'all_time' ? undefined : 4,
        },
        adAccountMetrics: {
          orderBy: { date: 'desc' },
          take: 1,
        },
        alerts: {
          where: { resolved: false },
          orderBy: { createdAt: 'desc' },
          take: 3,
        },
      },
    });

    let pendingWeeklyReports = 0;
    let totalSpend = 0;
    let totalChats = 0;
    let sumRoas = 0;
    let roasCount = 0;
    let activeAdAccounts = 0;
    let earliestClientDate: Date | null = null;

    const alerts: DashboardOverviewResponse['recentAlerts'] = [];

    clientsWithReports.forEach((c) => {
      if (c.metaAdAccountId && c.metaAccessTokenEnc) {
        activeAdAccounts++;
      }

      if (c.createdAt) {
        const cDate = new Date(c.createdAt);
        if (!earliestClientDate || cDate < earliestClientDate) {
          earliestClientDate = cDate;
        }
      }

      const latestReport = c.weeklyReports[0];
      if (!latestReport || new Date(latestReport.weekEndDate) < sevenDaysAgo) {
        pendingWeeklyReports++;
        alerts.push({
          id: `rep-${c.id}`,
          type: 'info',
          category: 'report',
          title: 'Relatório Semanal Pendente',
          description: `O cliente ${c.deliveryNome} não possui relatório gerado nos últimos 7 dias.`,
          clientId: c.id,
          clientName: c.deliveryNome,
          createdAt: now.toISOString(),
        });
      }

      // Soma de relatórios: todos se for all_time, ou apenas o mais recente se for mês
      c.weeklyReports.forEach((rep) => {
        totalSpend += rep.metaSpend || 0;
        totalChats += rep.metaConversas || 0;
        if (rep.metaRoas && rep.metaRoas > 0) {
          sumRoas += rep.metaRoas;
          roasCount++;
        }
      });

      // Alertas de Saldo Meta Ads (AdAccountMetrics)
      const latestMetric = c.adAccountMetrics[0];
      if (latestMetric && latestMetric.balance <= 100) {
        alerts.push({
          id: `bal-${c.id}-${latestMetric.id}`,
          type: latestMetric.balance <= 30 ? 'critical' : 'warning',
          category: 'balance',
          title: latestMetric.balance <= 30 ? 'Saldo Quase Esgotado' : 'Saldo Baixo de Anúncios',
          description: `Saldo atual na conta de ${c.deliveryNome} é de R$ ${latestMetric.balance.toFixed(2)}. Risco de pausa nos anúncios!`,
          clientId: c.id,
          clientName: c.deliveryNome,
          createdAt: latestMetric.date ? new Date(latestMetric.date).toISOString() : now.toISOString(),
        });
      }
    });

    // Alertas de contratos a vencer (em ≤ 15 dias)
    const fifteenDaysFromNow = new Date();
    fifteenDaysFromNow.setDate(now.getDate() + 15);

    const expiringContracts = await this.prisma.contract.findMany({
      where: {
        endDate: {
          gte: now,
          lte: fifteenDaysFromNow,
        },
        client: {
          status: 'ATIVO',
        },
      },
      include: {
        client: {
          select: { id: true, deliveryNome: true },
        },
      },
    });

    expiringContracts.forEach((con) => {
      const daysLeft = con.endDate
        ? Math.ceil((new Date(con.endDate).getTime() - now.getTime()) / (1000 * 3600 * 24))
        : 0;

      alerts.push({
        id: `con-${con.id}`,
        type: daysLeft <= 5 ? 'critical' : 'warning',
        category: 'contract',
        title: 'Contrato Próximo do Vencimento',
        description: `Contrato de ${con.client?.deliveryNome || 'Cliente'} vence em ${daysLeft} dia(s).`,
        clientId: con.client?.id,
        clientName: con.client?.deliveryNome,
        createdAt: now.toISOString(),
      });
    });

    const averageCpr = totalChats > 0 ? Number((totalSpend / totalChats).toFixed(2)) : 0;
    const averageRoas = roasCount > 0 ? Number((sumRoas / roasCount).toFixed(2)) : 0;

    // 4. Meta Ads da Própria Agência MOVY
    const rawAgencyId = (
      this.configService.get<string>('AGENCY_META_ACCOUNT_ID') ||
      process.env.AGENCY_META_ACCOUNT_ID ||
      ''
    ).replace(/\r?\n|\r/g, '').trim();

    const rawAgencyToken = (
      this.configService.get<string>('AGENCY_META_ACCESS_TOKEN') ||
      process.env.AGENCY_META_ACCESS_TOKEN ||
      this.configService.get<string>('META_ACCESS_TOKEN') ||
      process.env.META_ACCESS_TOKEN ||
      ''
    ).replace(/\r?\n|\r/g, '').trim();

    const isAgencyConfigured = Boolean(rawAgencyId && rawAgencyToken);

    let agencyMetrics = { spend: 0, impressions: 0, clicks: 0 };
    if (isAgencyConfigured) {
      agencyMetrics = await this.getAgencyLiveMetrics(rawAgencyId, rawAgencyToken);
    }

    // Conta quantos leads inbound vieram da landing page ou campanhas próprias da agência
    const agencyInboundLeadsCount = leads.filter(
      (l) => (l as any).origemTipo === 'INBOUND' || (l as any).origem === 'LANDING_PAGE',
    ).length;

    const agencyMeta = {
      configured: isAgencyConfigured,
      adAccountId: rawAgencyId || null,
      spend: agencyMetrics.spend,
      leadsGenerated: agencyInboundLeadsCount,
      costPerLead:
        agencyInboundLeadsCount > 0 && agencyMetrics.spend > 0
          ? Number((agencyMetrics.spend / agencyInboundLeadsCount).toFixed(2))
          : 0.0,
      impressions: agencyMetrics.impressions,
      clicks: agencyMetrics.clicks,
      status: (isAgencyConfigured ? 'ACTIVE' : 'NOT_CONFIGURED') as 'ACTIVE' | 'NOT_CONFIGURED',
    };

    // 5. Últimos Relatórios Semanais de Performance Emitidos
    const latestReports = await this.prisma.weeklyReport.findMany({
      take: 6,
      orderBy: { weekEndDate: 'desc' },
      include: {
        client: {
          select: { id: true, deliveryNome: true },
        },
      },
    });

    const latestWeeklyReports: LatestWeeklyReportSummary[] = latestReports.map((r) => ({
      id: r.id,
      clientId: r.clientId,
      clientName: r.client?.deliveryNome || 'Cliente',
      weekStartDate: r.weekStartDate.toISOString(),
      weekEndDate: r.weekEndDate.toISOString(),
      metaSpend: r.metaSpend || 0,
      metaConversas: r.metaConversas || 0,
      metaCostPerChat: r.metaCostPerChat || 0,
      metaRoas: r.metaRoas,
      faturamentoTotal: r.faturamentoTotal,
      whatsappSent: r.whatsappSent,
      pdfUrl: r.pdfUrl,
      createdAt: r.createdAt.toISOString(),
    }));

    return {
      financial: {
        totalMrr: Number(totalMrr.toFixed(2)),
        activeContracts,
        averageTicket,
        renewalsNext30Days,
        delinquentCount,
      },
      commercial: {
        totalLeads,
        pipelineValue: Number(pipelineValue.toFixed(2)),
        conversionRate,
        bookingRate,
        noShowRate,
        agendadosCount,
        noShowCount,
        leadsByStage,
        leadInflow,
        inflowTotal,
        inflowAverageDaily,
        peakDay: peakDay && peakDay.count > 0 ? peakDay : null,
      },
      operations: {
        activeClients: activeClientsCount,
        pausedClients: pausedClientsCount,
        churnedClients: churnedClientsCount,
        pendingWeeklyReports,
      },
      clientMetaAggregate: {
        period: clientPeriod,
        totalSpend: Number(totalSpend.toFixed(2)),
        totalChats,
        averageCpr,
        averageRoas,
        activeAdAccounts,
        sinceDate: earliestClientDate ? earliestClientDate.toISOString().split('T')[0] : null,
      },
      agencyMeta,
      latestWeeklyReports,
      recentAlerts: alerts.sort((a, b) => (a.type === 'critical' ? -1 : 1)),
    };
  }
}
