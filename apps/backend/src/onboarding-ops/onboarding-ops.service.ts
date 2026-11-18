import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateOnboardingStageDto } from './dto/update-onboarding-stage.dto';
import { UpdateChecklistDto } from './dto/update-checklist.dto';
import { CreateDailyMetricsDto } from './dto/create-daily-metrics.dto';
import { ImportRevenueCsvDto } from './dto/import-revenue-csv.dto';
import { OnboardingStage, ClientStatus, AlertType, AlertSeverity } from '@prisma/client';

@Injectable()
export class OnboardingOpsService {
  private readonly logger = new Logger(OnboardingOpsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getOnboardingPipeline() {
    const clients = await this.prisma.client.findMany({
      where: {
        status: { in: [ClientStatus.ATIVO, ClientStatus.PAUSADO] },
      },
      include: {
        accountManager: {
          select: { id: true, name: true, email: true },
        },
        contract: true,
      },
      orderBy: { onboardingStageUpdatedAt: 'asc' }, // Mais antigos no topo (prioridade)
    });

    const now = Date.now();

    return clients.map((client) => {
      const updatedAtMs = new Date(client.onboardingStageUpdatedAt).getTime();
      const hoursInStage = Math.max(0, Math.floor((now - updatedAtMs) / (1000 * 60 * 60)));
      const isDelayed = client.onboardingStage !== OnboardingStage.CONCLUIDO && hoursInStage > 48;

      return {
        ...client,
        hoursInStage,
        isDelayed,
      };
    });
  }

  async updateStage(clientId: string, dto: UpdateOnboardingStageDto) {
    const client = await this.prisma.client.findUnique({ where: { id: clientId } });
    if (!client) {
      throw new NotFoundException(`Cliente com ID ${clientId} não foi encontrado.`);
    }

    this.logger.log(`Avançando onboarding de ${client.deliveryNome} para: ${dto.stage}`);

    const isFinished = dto.stage === OnboardingStage.CONCLUIDO;

    return this.prisma.client.update({
      where: { id: clientId },
      data: {
        onboardingStage: dto.stage,
        onboardingStageUpdatedAt: new Date(),
        status: isFinished ? ClientStatus.ATIVO : client.status,
      },
    });
  }

  async updateChecklist(clientId: string, dto: UpdateChecklistDto) {
    const client = await this.prisma.client.findUnique({ where: { id: clientId } });
    if (!client) {
      throw new NotFoundException(`Cliente com ID ${clientId} não foi encontrado.`);
    }

    return this.prisma.client.update({
      where: { id: clientId },
      data: {
        ...dto,
      },
    });
  }

  async getRiskStatus(clientId: string) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      include: {
        contract: true,
        adAccountMetrics: {
          take: 14,
          orderBy: { date: 'desc' },
        },
      },
    });

    if (!client) {
      throw new NotFoundException(`Cliente com ID ${clientId} não foi encontrado.`);
    }

    const metrics = client.adAccountMetrics || [];
    const latestMetric = metrics[0];

    const currentBalance = latestMetric ? latestMetric.balance : 0;
    
    // Calcula média diária de gasto com base nos últimos 7 dias
    const last7 = metrics.slice(0, 7);
    const totalSpend7 = last7.reduce((acc, m) => acc + m.spend, 0);
    const avgDailySpend = last7.length > 0 ? totalSpend7 / last7.length : (client.contract?.mediaBudget ? client.contract.mediaBudget / 30 : 50);

    // Verba estimada para cobrir o fim de semana (sexta a domingo = 2.5 a 3 dias)
    const weekendSpendRequired = Math.round(avgDailySpend * 2.5);
    const isLowBalance = currentBalance > 0 && currentBalance < weekendSpendRequired;

    // Spike de CPA: compara os últimos 3 dias contra os dias 4 a 10
    const recent3 = metrics.slice(0, 3);
    const baseline7 = metrics.slice(3, 10);

    const spendRecent = recent3.reduce((acc, m) => acc + m.spend, 0);
    const convRecent = recent3.reduce((acc, m) => acc + m.conversas, 0);
    const cpaRecent = convRecent > 0 ? Number((spendRecent / convRecent).toFixed(2)) : (recent3[0]?.cpa || 0);

    const spendBase = baseline7.reduce((acc, m) => acc + m.spend, 0);
    const convBase = baseline7.reduce((acc, m) => acc + m.conversas, 0);
    const cpaBaseline = convBase > 0 ? Number((spendBase / convBase).toFixed(2)) : (baseline7[0]?.cpa || cpaRecent);

    let cpaDiffPercent = 0;
    if (cpaBaseline > 0) {
      cpaDiffPercent = Number((((cpaRecent - cpaBaseline) / cpaBaseline) * 100).toFixed(1));
    }

    const isCpaSpike = cpaDiffPercent >= 30.0;

    return {
      clientId: client.id,
      deliveryNome: client.deliveryNome,
      currentBalance,
      avgDailySpend: Math.round(avgDailySpend),
      weekendSpendRequired,
      isLowBalance,
      cpaRecent,
      cpaBaseline,
      cpaDiffPercent,
      isCpaSpike,
      hasMetrics: metrics.length > 0,
      recentMetrics: metrics.slice(0, 7),
    };
  }

  async parseRevenueCsv(clientId: string, dto: ImportRevenueCsvDto) {
    const client = await this.prisma.client.findUnique({ where: { id: clientId } });
    if (!client) {
      throw new NotFoundException(`Cliente com ID ${clientId} não foi encontrado.`);
    }

    const lines = dto.csvData
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length < 2) {
      throw new BadRequestException('O arquivo CSV deve conter um cabeçalho e pelo menos uma linha de dados.');
    }

    // Identifica separador (, ou ;)
    const headerLine = lines[0];
    const separator = headerLine.includes(';') ? ';' : ',';
    const headers = headerLine.split(separator).map((h) => h.toLowerCase().replace(/["']/g, '').trim());

    // Tenta encontrar a coluna de valor/faturamento
    let valueColIdx = headers.findIndex((h) =>
      h.includes('valor') || h.includes('total') || h.includes('faturamento') || h.includes('preco') || h.includes('price') || h.includes('amount')
    );

    // Se não encontrou coluna explícita, usa a última coluna com valores numéricos
    if (valueColIdx === -1) {
      valueColIdx = headers.length - 1;
    }

    let grossRevenue = 0;
    let ordersCount = 0;

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(separator).map((c) => c.replace(/["']/g, '').trim());
      if (cols.length <= valueColIdx) continue;

      const rawVal = cols[valueColIdx]
        .replace(/R\$/gi, '')
        .replace(/\s/g, '')
        .replace(/\./g, '')
        .replace(',', '.');

      const parsed = parseFloat(rawVal);
      if (!isNaN(parsed) && parsed > 0) {
        grossRevenue += parsed;
        ordersCount++;
      }
    }

    grossRevenue = Number(grossRevenue.toFixed(2));

    const today = new Date();
    const periodStart = dto.periodStart ? new Date(dto.periodStart) : new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const periodEnd = dto.periodEnd ? new Date(dto.periodEnd) : today;

    const report = await this.prisma.clientRevenueReport.create({
      data: {
        clientId,
        periodStart,
        periodEnd,
        grossRevenue,
        ordersCount,
        source: 'CSV_IMPORT',
        filename: dto.filename || 'importacao_pedidos.csv',
      },
    });

    return {
      success: true,
      report,
      grossRevenue,
      ordersCount,
      ticketMedioPedidos: ordersCount > 0 ? Number((grossRevenue / ordersCount).toFixed(2)) : 0,
    };
  }

  async createDailyMetrics(clientId: string, dto: CreateDailyMetricsDto) {
    return this.prisma.adAccountMetrics.create({
      data: {
        clientId,
        date: new Date(dto.date),
        spend: dto.spend,
        balance: dto.balance,
        impressions: dto.impressions || 0,
        clicks: dto.clicks || 0,
        conversas: dto.conversas,
        cpa: dto.cpa,
      },
    });
  }
}
