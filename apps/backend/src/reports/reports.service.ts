import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MetaAdsService, MetaAdsMetrics } from '../meta-ads/meta-ads.service';
import { PdfGeneratorService } from './pdf-generator.service';
import { EvolutionService } from '../evolution/evolution.service';
import { CreateReportDto } from './dto/create-report.dto';
import { AutoGenerateReportDto } from './dto/auto-generate-report.dto';
import * as fs from 'fs';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly metaAdsService: MetaAdsService,
    private readonly pdfGeneratorService: PdfGeneratorService,
    private readonly evolutionService: EvolutionService,
  ) { }

  async syncMetaInsights(clientId: string, weekStartDate?: string, weekEndDate?: string): Promise<MetaAdsMetrics> {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      throw new NotFoundException(`Cliente com ID ${clientId} não encontrado.`);
    }

    const end = weekEndDate ? new Date(weekEndDate) : new Date();
    const start = weekStartDate
      ? new Date(weekStartDate)
      : new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);

    return this.metaAdsService.getWeeklyInsights(client.metaAdAccountId, start, end, true);
  }

  async createWeeklyReport(dto: CreateReportDto) {
    const client = await this.prisma.client.findUnique({
      where: { id: dto.clientId },
    });

    if (!client) {
      throw new NotFoundException(`Cliente com ID ${dto.clientId} não encontrado.`);
    }

    const startDate = new Date(dto.weekStartDate);
    const endDate = new Date(dto.weekEndDate);

    const hasManualMetrics =
      dto.metaSpend !== undefined ||
      dto.metaImpressions !== undefined ||
      dto.metaClicks !== undefined ||
      dto.metaConversas !== undefined;

    let metaMetrics: MetaAdsMetrics;

    if (hasManualMetrics) {
      const spend = Number(dto.metaSpend ?? 0);
      const impressions = Math.round(Number(dto.metaImpressions ?? 0));
      const clicks = Math.round(Number(dto.metaClicks ?? 0));
      const conversas = Math.round(Number(dto.metaConversas ?? 0));

      const ctr =
        dto.metaCtr !== undefined
          ? Number(dto.metaCtr)
          : impressions > 0
            ? parseFloat(((clicks / impressions) * 100).toFixed(2))
            : 0;

      const cpc =
        dto.metaCpc !== undefined
          ? Number(dto.metaCpc)
          : clicks > 0
            ? parseFloat((spend / clicks).toFixed(2))
            : 0;

      const costPerChat =
        dto.metaCostPerChat !== undefined
          ? Number(dto.metaCostPerChat)
          : conversas > 0
            ? parseFloat((spend / conversas).toFixed(2))
            : 0;

      metaMetrics = {
        spend: parseFloat(spend.toFixed(2)),
        impressions,
        clicks,
        ctr,
        cpc,
        conversas,
        costPerChat,
      };
    } else {
      // Se não foram passadas métricas manuais, tenta buscar da Meta Graph API (sem dados aleatórios)
      metaMetrics = await this.metaAdsService.getWeeklyInsights(
        client.metaAdAccountId,
        startDate,
        endDate,
        false,
      );
    }

    // 2. Persiste o relatório no banco com os dados reais
    const report = await this.prisma.weeklyReport.create({
      data: {
        clientId: client.id,
        weekStartDate: startDate,
        weekEndDate: endDate,
        metaSpend: metaMetrics.spend,
        metaImpressions: metaMetrics.impressions,
        metaClicks: metaMetrics.clicks,
        metaCtr: metaMetrics.ctr,
        metaCpc: metaMetrics.cpc,
        metaConversas: metaMetrics.conversas,
        metaCostPerChat: metaMetrics.costPerChat,
        metaRoas: dto.metaRoas ?? metaMetrics.roas ?? 0,
        metaCpr: dto.metaCpr ?? metaMetrics.cpr ?? metaMetrics.costPerChat ?? 0,
        faturamentoTotal: dto.faturamentoTotal ?? null,
        pedidosTotais: dto.pedidosTotais ?? null,
        analiseGestor: dto.analiseGestor?.trim() || null,
        proximasAcoes: dto.proximasAcoes?.trim() || null,
      },
    });

    // 3. Renderiza o PDF estilizado no padrão MOVY
    const pdfUrl = await this.pdfGeneratorService.generateWeeklyReportPdf(report.id, {
      deliveryNome: client.deliveryNome,
      clienteNome: client.nome,
      cidade: client.cidade,
      segmento: client.segmento,
      weekStartDate: startDate,
      weekEndDate: endDate,
      metaSpend: metaMetrics.spend,
      metaImpressions: metaMetrics.impressions,
      metaClicks: metaMetrics.clicks,
      metaCtr: metaMetrics.ctr,
      metaCpc: metaMetrics.cpc,
      metaConversas: metaMetrics.conversas,
      metaCostPerChat: metaMetrics.costPerChat,
      faturamentoTotal: dto.faturamentoTotal,
      pedidosTotais: dto.pedidosTotais,
      analiseGestor: dto.analiseGestor,
      proximasAcoes: dto.proximasAcoes,
    });

    // 4. Salva a URL do PDF no relatório
    return this.prisma.weeklyReport.update({
      where: { id: report.id },
      data: { pdfUrl },
    });
  }

  /**
   * Gera o relatório semanal puxando 100% dos dados da Meta Ads para as datas indicadas,
   * sem necessidade de digitação manual de números.
   */
  async generateAutomatedReport(clientId: string, dto: AutoGenerateReportDto) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      throw new NotFoundException(`Cliente com ID ${clientId} não encontrado.`);
    }

    const startDate = new Date(dto.weekStartDate);
    const endDate = new Date(dto.weekEndDate);

    // Consulta Meta Ads para a semana exata
    const metaMetrics = await this.metaAdsService.getWeeklyInsights(
      client.metaAdAccountId,
      startDate,
      endDate,
      false
    );

    // Persiste o relatório gerado
    const report = await this.prisma.weeklyReport.create({
      data: {
        clientId: client.id,
        weekStartDate: startDate,
        weekEndDate: endDate,
        metaSpend: metaMetrics.spend,
        metaImpressions: metaMetrics.impressions,
        metaClicks: metaMetrics.clicks,
        metaCtr: metaMetrics.ctr,
        metaCpc: metaMetrics.cpc,
        metaConversas: metaMetrics.conversas,
        metaCostPerChat: metaMetrics.costPerChat,
        metaRoas: metaMetrics.roas || 0,
        metaCpr: metaMetrics.cpr || metaMetrics.costPerChat || 0,
        faturamentoTotal: dto.faturamentoTotal ?? null,
        pedidosTotais: dto.pedidosTotais ?? null,
        analiseGestor: dto.analiseGestor?.trim() || null,
        proximasAcoes: dto.proximasAcoes?.trim() || null,
      },
    });

    // Renderiza PDF
    const pdfUrl = await this.pdfGeneratorService.generateWeeklyReportPdf(report.id, {
      deliveryNome: client.deliveryNome,
      clienteNome: client.nome,
      cidade: client.cidade,
      segmento: client.segmento,
      weekStartDate: startDate,
      weekEndDate: endDate,
      metaSpend: metaMetrics.spend,
      metaImpressions: metaMetrics.impressions,
      metaClicks: metaMetrics.clicks,
      metaCtr: metaMetrics.ctr,
      metaCpc: metaMetrics.cpc,
      metaConversas: metaMetrics.conversas,
      metaCostPerChat: metaMetrics.costPerChat,
      faturamentoTotal: dto.faturamentoTotal,
      pedidosTotais: dto.pedidosTotais,
      analiseGestor: dto.analiseGestor,
      proximasAcoes: dto.proximasAcoes,
    });

    return this.prisma.weeklyReport.update({
      where: { id: report.id },
      data: { pdfUrl },
    });
  }

  /**
   * Garante que o arquivo PDF existe em disco; caso não exista (ex: container recriado),
   * regenera o PDF fielmente a partir dos dados salvos no banco.
   */
  async ensureReportPdfFile(reportId: string) {
    const report = await this.prisma.weeklyReport.findUnique({
      where: { id: reportId },
      include: { client: true },
    });

    if (!report) {
      throw new NotFoundException(`Relatório com ID ${reportId} não encontrado.`);
    }

    const filePath = this.pdfGeneratorService.getReportFilePath(report.id);

    if (!fs.existsSync(filePath)) {
      this.logger.log(`Arquivo PDF ausente em disco para o relatório ${report.id}. Regenerando a partir do banco...`);
      await this.pdfGeneratorService.generateWeeklyReportPdf(report.id, {
        deliveryNome: report.client.deliveryNome,
        clienteNome: report.client.nome,
        cidade: report.client.cidade,
        segmento: report.client.segmento,
        weekStartDate: report.weekStartDate,
        weekEndDate: report.weekEndDate,
        metaSpend: report.metaSpend,
        metaImpressions: report.metaImpressions,
        metaClicks: report.metaClicks,
        metaCtr: report.metaCtr,
        metaCpc: report.metaCpc,
        metaConversas: report.metaConversas,
        metaCostPerChat: report.metaCostPerChat,
        faturamentoTotal: report.faturamentoTotal,
        pedidosTotais: report.pedidosTotais,
        analiseGestor: report.analiseGestor,
        proximasAcoes: report.proximasAcoes,
      });
    }

    return { filePath, report };
  }

  async sendReportToWhatsApp(reportId: string) {
    const { filePath, report } = await this.ensureReportPdfFile(reportId);

    // Importante: Evolution API v2 exige string Base64 pura (sem prefixo 'data:application/pdf;base64,')
    const fileBase64 = fs.readFileSync(filePath).toString('base64');

    const startStr = new Date(report.weekStartDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
    const endStr = new Date(report.weekEndDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' });

    const captionLines = [
      `📊 *RELATÓRIO SEMANAL DE PERFORMANCE — MOVY*`,
      `📅 *Período:* ${startStr} a ${endStr}`,
      '',
      `Olá, *${report.client.nome}*! Segue o consolidado de resultados da assessoria para o *${report.client.deliveryNome}*.`,
      '',
    ];

    if (report.faturamentoTotal) {
      captionLines.push(`📈 *Faturamento da Semana:* R$ ${report.faturamentoTotal.toFixed(2)}`);
    }
    if (report.pedidosTotais) {
      captionLines.push(`🛵 *Pedidos na Semana:* ${report.pedidosTotais}`);
    }

    captionLines.push(
      '',
      `📄 _Confira todos os detalhes, análise e plano de ação no PDF anexo._`,
      '',
      `Qualquer dúvida estamos à disposição! 🚀`,
    );

    const caption = captionLines.join('\n');

    const result = await this.evolutionService.sendReportPdfMedia(
      report.client.whatsapp,
      fileBase64,
      `Relatorio-Movy-${report.client.deliveryNome.replace(/\s+/g, '-')}.pdf`,
      caption,
    );

    if (result.success) {
      await this.prisma.weeklyReport.update({
        where: { id: reportId },
        data: {
          whatsappSent: true,
          whatsappSentAt: new Date(),
        },
      });
    }

    return result;
  }

  async deleteReport(reportId: string) {
    const report = await this.prisma.weeklyReport.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      throw new NotFoundException(`Relatório com ID ${reportId} não encontrado.`);
    }

    const filePath = this.pdfGeneratorService.getReportFilePath(report.id);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await this.prisma.weeklyReport.delete({
      where: { id: reportId },
    });

    return { deleted: true };
  }

  async findByClientId(clientId: string) {
    return this.prisma.weeklyReport.findMany({
      where: { clientId },
      orderBy: { weekEndDate: 'desc' },
    });
  }
}
