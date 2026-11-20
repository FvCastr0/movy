'use client';

import React from 'react';
import Link from 'next/link';
import {
  FileText,
  Calendar,
  DollarSign,
  MessageCircle,
  TrendingUp,
  ExternalLink,
  Download,
  CheckCircle2,
  Clock,
  ArrowRight,
  Store,
} from 'lucide-react';

export interface WeeklyReportSummaryItem {
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

interface LatestWeeklyReportsWidgetProps {
  reports?: WeeklyReportSummaryItem[];
}

export function LatestWeeklyReportsWidget({
  reports = [],
}: LatestWeeklyReportsWidgetProps) {
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const formatDateRange = (startStr: string, endStr: string) => {
    try {
      const s = new Date(startStr);
      const e = new Date(endStr);
      const sFormatted = s.toLocaleDateString('pt-BR', { timeZone: 'UTC', day: '2-digit', month: '2-digit' });
      const eFormatted = e.toLocaleDateString('pt-BR', { timeZone: 'UTC', day: '2-digit', month: '2-digit' });
      return `${sFormatted} a ${eFormatted}`;
    } catch {
      return '';
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-surface-card p-6 space-y-5">
      {/* Header do Widget */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
        <div>
          <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
            <FileText className="w-5 h-5 text-brand" />
            Últimos Relatórios Semanais de Performance
          </h3>
          <p className="text-xs text-text-muted mt-0.5">
            Resultados consolidados dos relatórios mais recentes emitidos para os deliveries
          </p>
        </div>

        <Link
          href="/clients"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:text-brand-hover transition-colors self-start sm:self-auto"
        >
          <span>Gerenciar Todos os Clientes</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Conteúdo */}
      {!reports || reports.length === 0 ? (
        <div className="py-10 text-center border border-dashed border-white/10 rounded-xl space-y-2">
          <Clock className="w-8 h-8 text-text-muted/40 mx-auto" />
          <p className="text-xs font-semibold text-text-primary">
            Nenhum relatório semanal emitido ainda
          </p>
          <p className="text-[11px] text-text-muted max-w-sm mx-auto">
            Acesse o perfil de um cliente em Clientes Ativos para gerar o primeiro relatório em PDF e analisar as métricas.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map((report) => (
            <div
              key={report.id}
              className="rounded-xl border border-white/5 bg-surface-canvas p-4 hover:border-white/15 transition-all flex flex-col justify-between space-y-3"
            >
              {/* Topo do Card */}
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="p-1.5 rounded-lg bg-brand/10 text-brand shrink-0">
                      <Store className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs font-bold text-text-primary truncate" title={report.clientName}>
                      {report.clientName}
                    </h4>
                  </div>

                  {report.whatsappSent ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      Enviado
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30 shrink-0">
                      Pendente
                    </span>
                  )}
                </div>

                <div className="mt-2 flex items-center gap-1.5 text-[11px] text-text-muted">
                  <Calendar className="w-3 h-3 text-brand" />
                  <span>{formatDateRange(report.weekStartDate, report.weekEndDate)}</span>
                </div>
              </div>

              {/* Grid de Métricas Principais */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5 text-xs">
                <div className="p-2 rounded-lg bg-white/[0.02] border border-white/5">
                  <span className="text-[10px] text-text-muted block">Gasto Meta</span>
                  <span className="font-bold text-brand">{formatCurrency(report.metaSpend)}</span>
                </div>

                <div className="p-2 rounded-lg bg-white/[0.02] border border-white/5">
                  <span className="text-[10px] text-text-muted block">Conversas</span>
                  <span className="font-bold text-emerald-400">{report.metaConversas} chats</span>
                </div>

                <div className="p-2 rounded-lg bg-white/[0.02] border border-white/5">
                  <span className="text-[10px] text-text-muted block">CPA (Custo/Chat)</span>
                  <span className="font-semibold text-text-primary">{formatCurrency(report.metaCostPerChat)}</span>
                </div>

                <div className="p-2 rounded-lg bg-white/[0.02] border border-white/5">
                  <span className="text-[10px] text-text-muted block">ROAS</span>
                  <span className="font-semibold text-yellow-400">
                    {report.metaRoas && report.metaRoas > 0 ? `${report.metaRoas}x` : '—'}
                  </span>
                </div>
              </div>

              {/* Ações */}
              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs">
                <Link
                  href={`/clients/${report.clientId}`}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-300 hover:text-white transition-colors"
                >
                  <span>Ver Detalhes</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>

                {report.pdfUrl && (
                  <a
                    href={report.pdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand hover:underline"
                  >
                    <Download className="w-3 h-3" />
                    <span>PDF</span>
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
