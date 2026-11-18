'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Client, WeeklyReport } from '@/types';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import { ClientHeaderHero } from '@/components/clients/client-header-hero';
import { ClientGrowthChart } from '@/components/clients/client-growth-chart';
import { MetaInsightsCard } from '@/components/meta/meta-insights-card';
import { AutomatedReportModal } from '@/components/clients/automated-report-modal';
import { ContractModal } from '@/components/finance/contract-modal';
import {
  FileText,
  Send,
  Trash2,
  Calendar,
  Sparkles,
  ArrowRight,
  TrendingUp,
  DownloadCloud,
  CheckCircle2,
  Clock,
  ExternalLink,
} from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export default function ClientDetailPage() {
  const params = useParams();
  const clientId = params?.id as string;

  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Modais
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [isAutoReportModalOpen, setIsAutoReportModalOpen] = useState(false);

  const loadClient = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get<Client>(`/clients/${clientId}`);
      setClient(res.data);
    } catch (err) {
      console.error('Erro ao carregar detalhes do cliente:', err);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    if (clientId) {
      loadClient();
    }
  }, [clientId, loadClient]);

  const handleSendWhatsApp = async (reportId: string) => {
    try {
      setSendingId(reportId);
      const res = await api.post(`/reports/${reportId}/send-whatsapp`, {});
      if (res.data?.success) {
        alert('Relatório semanal em PDF enviado com sucesso para o WhatsApp do cliente!');
        await loadClient();
      } else {
        alert(`Falha no envio via WhatsApp: ${res.data?.error || 'Erro desconhecido'}`);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Falha ao disparar relatório no WhatsApp.');
    } finally {
      setSendingId(null);
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!window.confirm('Deseja realmente excluir este relatório semanal?')) return;
    try {
      setDeletingId(reportId);
      await api.delete(`/reports/${reportId}`);
      await loadClient();
    } catch {
      alert('Não foi possível excluir o relatório.');
    } finally {
      setDeletingId(null);
    }
  };

  const formatCurrency = (val?: number | null) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(
      val || 0
    );
  };

  if (loading && !client) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-canvas">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-surface-canvas text-white">
        <p className="text-sm text-text-muted">Cliente não encontrado.</p>
        <Link href="/clients" className="mt-4 text-xs font-bold text-brand hover:underline">
          Voltar para Clientes Ativos
        </Link>
      </div>
    );
  }

  const reports = client.weeklyReports || [];

  return (
    <div className="min-h-screen bg-surface-canvas text-text-primary pb-16">
      <DashboardHeader onRefresh={loadClient} isRefreshing={loading} />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-8">
        {/* Bloco 1: Header Hero Executivo */}
        <ClientHeaderHero
          client={client}
          onOpenContractModal={() => setIsContractModalOpen(true)}
        />

        {/* Bloco 2: Painel Consolidado Meta Ads (ROAS, CPR, Spend) */}
        <MetaInsightsCard
          clientId={client.id}
          clientName={client.deliveryNome}
          onOpenAutoReportModal={() => setIsAutoReportModalOpen(true)}
        />

        {/* Bloco 3: Gráfico de Crescimento Semanal (SVG + Tailwind) */}
        <ClientGrowthChart
          reports={reports}
          clientName={client.deliveryNome}
        />

        {/* Bloco 4: Histórico de Relatórios Semanais Emitidos */}
        <div className="rounded-2xl border border-white/10 bg-surface-card p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-white/10">
            <div>
              <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                <FileText className="w-5 h-5 text-brand" />
                Relatórios Semanais de Tráfego & Performance
              </h3>
              <p className="text-xs text-text-muted mt-0.5">
                Emitidos automaticamente via Meta Ads e enviados ao cliente em PDF.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsAutoReportModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand hover:bg-brand-hover text-white rounded-xl text-xs font-bold shadow-md shadow-brand/20 active:scale-95 transition-all self-start sm:self-auto"
            >
              <Sparkles className="w-4 h-4" />
              + Novo Relatório Automático (Meta)
            </button>
          </div>

          {reports.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-white/10 rounded-xl space-y-2">
              <Clock className="w-8 h-8 text-text-muted/40 mx-auto" />
              <p className="text-xs font-semibold text-text-primary">Nenhum relatório emitido ainda</p>
              <p className="text-[11px] text-text-muted max-w-sm mx-auto">
                Clique no botão acima para puxar os dados da semana na Meta Ads e gerar o 1º relatório em PDF com 1 clique.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => {
                const startDateStr = new Date(report.weekStartDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
                const endDateStr = new Date(report.weekEndDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' });

                return (
                  <div
                    key={report.id}
                    className="p-4 rounded-xl border border-white/5 bg-surface-canvas hover:border-white/15 transition-all flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-text-primary">
                          Semana: {startDateStr} a {endDateStr}
                        </span>
                        {report.whatsappSent ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-status-success/15 text-status-success border border-status-success/30">
                            <CheckCircle2 className="w-3 h-3" />
                            WhatsApp Enviado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                            Pendente Envio
                          </span>
                        )}
                      </div>

                      {/* Métricas Principais da Semana */}
                      <div className="flex flex-wrap items-center gap-4 text-xs text-text-muted pt-1">
                        <span>
                          Gasto Meta: <strong className="text-brand">{formatCurrency(report.metaSpend)}</strong>
                        </span>
                        {report.metaConversas > 0 && (
                          <span>
                            Conversas: <strong className="text-emerald-400">{report.metaConversas} chats</strong>
                          </span>
                        )}
                        <span>
                          CPA: <strong className="text-text-primary">{formatCurrency(report.metaCostPerChat)}</strong>
                        </span>
                        {report.metaRoas && report.metaRoas > 0 ? (
                          <span>
                            ROAS: <strong className="text-yellow-400">{report.metaRoas}x</strong>
                          </span>
                        ) : null}
                        {report.faturamentoTotal && report.faturamentoTotal > 0 ? (
                          <span>
                            Faturamento: <strong className="text-text-primary">{formatCurrency(report.faturamentoTotal)}</strong>
                          </span>
                        ) : null}
                      </div>

                      {report.analiseGestor && (
                        <p className="text-[11px] text-text-muted italic pt-1 line-clamp-1">
                          "{report.analiseGestor}"
                        </p>
                      )}
                    </div>

                    {/* Ações do Relatório */}
                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={`${API_BASE_URL}/reports/${report.id}/pdf`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-text-primary text-xs font-semibold transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-brand" />
                        <span>Ver PDF</span>
                      </a>

                      <button
                        type="button"
                        onClick={() => handleSendWhatsApp(report.id)}
                        disabled={sendingId === report.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 text-xs font-semibold transition-colors disabled:opacity-50"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{sendingId === report.id ? 'Enviando...' : 'WhatsApp'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteReport(report.id)}
                        disabled={deletingId === report.id}
                        className="p-1.5 rounded-lg hover:bg-rose-500/10 text-text-muted hover:text-rose-400 transition-colors"
                        title="Excluir relatório"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Modais da Página */}
      <ContractModal
        isOpen={isContractModalOpen}
        client={client}
        onClose={() => setIsContractModalOpen(false)}
        onSuccess={loadClient}
      />

      <AutomatedReportModal
        clientId={client.id}
        clientName={client.deliveryNome}
        isOpen={isAutoReportModalOpen}
        onClose={() => setIsAutoReportModalOpen(false)}
        onSuccess={loadClient}
      />
    </div>
  );
}
