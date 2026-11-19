import { Injectable, Logger } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';

export interface WeeklyReportPdfData {
  deliveryNome: string;
  clienteNome: string;
  cidade: string;
  segmento: string;
  weekStartDate: Date;
  weekEndDate: Date;
  metaSpend: number;
  metaImpressions: number;
  metaClicks: number;
  metaCtr: number;
  metaCpc: number;
  metaConversas: number;
  metaCostPerChat: number;
  faturamentoTotal?: number | null;
  pedidosTotais?: number | null;
  analiseGestor?: string | null;
  proximasAcoes?: string | null;
}

@Injectable()
export class PdfGeneratorService {
  private readonly logger = new Logger(PdfGeneratorService.name);

  getReportFilePath(reportId: string): string {
    const reportsDir = path.resolve(process.cwd(), 'public', 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    return path.join(reportsDir, `relatorio-movy-${reportId}.pdf`);
  }

  async generateWeeklyReportPdf(reportId: string, data: WeeklyReportPdfData): Promise<string> {
    const filePath = this.getReportFilePath(reportId);
    const writeStream = fs.createWriteStream(filePath);

    const startDate = new Date(data.weekStartDate);
    const endDate = new Date(data.weekEndDate);
    const diffTime = endDate.getTime() - startDate.getTime();
    const dias = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)));
    const rotuloPeriodo =
      dias === 7
        ? '7 dias'
        : dias === 14
        ? '14 dias'
        : dias === 30
        ? '30 dias'
        : `${dias} dias`;

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 36,
        info: {
          Title: `Relatório de Performance (${rotuloPeriodo}) - ${data.deliveryNome}`,
          Author: 'Movy Assessoria de Delivery',
        },
      });

      doc.pipe(writeStream);

      // Fundo Dark Premium (#0A0A0A)
      doc.rect(0, 0, doc.page.width, doc.page.height).fill('#0A0A0A');

      // Header com Faixa de Marca
      doc.rect(0, 0, doc.page.width, 6).fill('#E50914');

      // Topo: Marca MOVY e Título
      doc.font('Helvetica-Bold').fontSize(22).fillColor('#FFFFFF').text('MOVY', 36, 32, { continued: true });
      doc.fillColor('#E50914').text('.');

      doc.font('Helvetica').fontSize(9).fillColor('#A3A3A3').text('ASSESSORIA ESPECIALIZADA EM DELIVERY', 36, 58);

      const startStr = startDate.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
      const endStr = endDate.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
      const dataFormatada = `${startStr} a ${endStr}`;
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#E5E5E5').text(`Período (${rotuloPeriodo}): ${dataFormatada}`, 280, 42, {
        width: doc.page.width - 316,
        align: 'right',
      });

      // Linha Divisória Sutil
      doc.strokeColor('#262626').lineWidth(1).moveTo(36, 78).lineTo(doc.page.width - 36, 78).stroke();

      // Card de Informações do Cliente
      doc.rect(36, 92, doc.page.width - 72, 54).fillAndStroke('#141414', '#262626');
      doc.font('Helvetica-Bold').fontSize(14).fillColor('#FFFFFF').text(data.deliveryNome, 50, 102);
      doc.font('Helvetica').fontSize(9).fillColor('#A3A3A3').text(
        `Responsável: ${data.clienteNome}   |   Segmento: ${data.segmento}   |   Cidade: ${data.cidade}`,
        50,
        122,
      );

      // Título da Seção: Performance de Anúncios (Meta Ads)
      doc.rect(36, 160, 4, 14).fill('#E50914');
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#FFFFFF').text('PERFORMANCE DE TRÁFEGO PAGO (META ADS)', 46, 161);

      // Grid de 4 KPIs Principais
      const kpiWidth = (doc.page.width - 72 - 30) / 4;
      const kpis = [
        { label: 'INVESTIMENTO', val: `R$ ${Number(data.metaSpend || 0).toFixed(2)}`, color: '#E50914' },
        { label: 'CONVERSAS / CHATS', val: `${Number(data.metaConversas || 0)}`, color: '#22C55E' },
        { label: 'CUSTO POR CHAT', val: `R$ ${Number(data.metaCostPerChat || 0).toFixed(2)}`, color: '#38BDF8' },
        { label: 'CLIQUES (CTR)', val: `${Number(data.metaClicks || 0)} (${Number(data.metaCtr || 0).toFixed(2)}%)`, color: '#FACC15' },
      ];

      kpis.forEach((kpi, idx) => {
        const x = 36 + idx * (kpiWidth + 10);
        doc.rect(x, 182, kpiWidth, 68).fillAndStroke('#141414', '#262626');
        doc.font('Helvetica-Bold').fontSize(8).fillColor('#888888').text(kpi.label, x + 10, 194, { width: kpiWidth - 20 });
        doc.font('Helvetica-Bold').fontSize(13).fillColor(kpi.color).text(kpi.val, x + 10, 214, { width: kpiWidth - 20 });
      });

      // Tabela de Métricas Detalhadas
      doc.rect(36, 264, doc.page.width - 72, 92).fillAndStroke('#121212', '#262626');
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#E5E5E5').text('Métricas Complementares do Período', 50, 276);

      doc.font('Helvetica').fontSize(9).fillColor('#A3A3A3');
      doc.text(`• Impressões Totais: ${Number(data.metaImpressions || 0).toLocaleString('pt-BR')}`, 50, 300);
      doc.text(`• CPC Médio (Custo por Clique): R$ ${Number(data.metaCpc || 0).toFixed(2)}`, 50, 318);

      const roas =
        data.faturamentoTotal && data.metaSpend > 0
          ? `${(data.faturamentoTotal / data.metaSpend).toFixed(2)}x`
          : 'N/A';
      doc.text(`• ROAS Estimado (Retorno s/ Tráfego): ${roas}`, 50, 336);

      const fat =
        data.faturamentoTotal !== null && data.faturamentoTotal !== undefined
          ? `R$ ${Number(data.faturamentoTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          : 'Não informado';
      const ped =
        data.pedidosTotais !== null && data.pedidosTotais !== undefined
          ? `${data.pedidosTotais} pedidos`
          : 'Não informado';
      const ticket =
        data.faturamentoTotal && data.pedidosTotais && data.pedidosTotais > 0
          ? `R$ ${(data.faturamentoTotal / data.pedidosTotais).toFixed(2)}`
          : 'N/A';

      doc.text(`• Faturamento Informado: ${fat}`, 300, 300);
      doc.text(`• Pedidos Totais na Semana: ${ped}`, 300, 318);
      doc.text(`• Ticket Médio da Semana: ${ticket}`, 300, 336);

      // Seção: Diagnóstico e Análise do Especialista MOVY
      doc.rect(36, 374, 4, 14).fill('#E50914');
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#FFFFFF').text('ANÁLISE ESTRATÉGICA DO GESTOR MOVY', 46, 375);
      doc.rect(36, 396, doc.page.width - 72, 115).fillAndStroke('#141414', '#262626');

      const analiseTexto =
        data.analiseGestor?.trim() || 'Nenhuma observação diagnóstica registrada para este período.';
      doc.font('Helvetica').fontSize(9).fillColor('#D4D4D4').text(analiseTexto, 50, 410, {
        width: doc.page.width - 100,
        height: 90,
        lineGap: 4,
      });

      // Seção: Próximos Passos & Otimizações para a Próxima Semana
      doc.rect(36, 528, 4, 14).fill('#E50914');
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#FFFFFF').text('PRÓXIMAS AÇÕES E PLANO TÁTICO', 46, 529);
      doc.rect(36, 550, doc.page.width - 72, 115).fillAndStroke('#141414', '#262626');

      const acoesTexto =
        data.proximasAcoes?.trim() || 'Nenhuma ação tática complementar registrada para a próxima semana.';
      doc.font('Helvetica').fontSize(9).fillColor('#D4D4D4').text(acoesTexto, 50, 564, {
        width: doc.page.width - 100,
        height: 90,
        lineGap: 4,
      });

      // Rodapé Institucional
      doc.strokeColor('#262626').lineWidth(1).moveTo(36, 775).lineTo(doc.page.width - 36, 775).stroke();
      doc.font('Helvetica').fontSize(8).fillColor('#737373').text(
        'MOVY Assessoria de Delivery — Relatório executivo emitido com base nos dados reais do período.',
        36,
        788,
        { width: doc.page.width - 72, align: 'center', lineBreak: false },
      );

      doc.end();

      writeStream.on('finish', () => {
        this.logger.log(`PDF do relatório ${reportId} gerado com sucesso em: ${filePath}`);
        resolve(`/reports/relatorio-movy-${reportId}.pdf`);
      });

      writeStream.on('error', (err) => {
        this.logger.error(`Erro ao gerar PDF: ${err.message}`);
        reject(err);
      });
    });
  }
}
