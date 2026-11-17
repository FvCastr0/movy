'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Client } from '@/types';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import { ContractModal } from '@/components/finance/contract-modal';
import {
  Building2,
  MapPin,
  BarChart3,
  Send,
  FileText,
  TrendingUp,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Sparkles,
  RefreshCw,
  Trash2,
  DownloadCloud,
  AlertCircle,
  CreditCard,
  Edit,
} from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

function getDefaultDates() {
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - 7);
  return {
    start: weekStart.toISOString().split('T')[0],
    end: today.toISOString().split('T')[0],
  };
}

export default function ClientDetailPage() {
  const params = useParams();
  const clientId = params?.id as string;

  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [syncingMeta, setSyncingMeta] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);

  // Configuração do cliente (WhatsApp e Meta Ads)
  const [whatsapp, setWhatsapp] = useState('');
  const [metaAdAccountId, setMetaAdAccountId] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);
  const [configFeedback, setConfigFeedback] = useState<string | null>(null);

  // Período da Semana
  const defaultDates = getDefaultDates();
  const [weekStartDate, setWeekStartDate] = useState(defaultDates.start);
  const [weekEndDate, setWeekEndDate] = useState(defaultDates.end);

  // Métricas Reais de Tráfego Pago (Meta Ads)
  const [metaSpend, setMetaSpend] = useState('');
  const [metaConversas, setMetaConversas] = useState('');
  const [metaClicks, setMetaClicks] = useState('');
  const [metaImpressions, setMetaImpressions] = useState('');
  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Campos Operacionais & Qualitativos da Semana
  const [faturamentoTotal, setFaturamentoTotal] = useState('');
  const [pedidosTotais, setPedidosTotais] = useState('');
  const [analiseGestor, setAnaliseGestor] = useState('');
  const [proximasAcoes, setProximasAcoes] = useState('');

  const loadClient = async () => {
    try {
      setLoading(true);
      const res = await api.get<Client>(`/clients/${clientId}`);
      const data = res.data;
      setClient(data);
      setWhatsapp(data.whatsapp || '');
      setMetaAdAccountId(data.metaAdAccountId || '');
    } catch (err) {
      console.error('Erro ao buscar dados do cliente:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (clientId) {
      loadClient();
    }
  }, [clientId]);

  const handleSaveClientConfig = async () => {
    try {
      setSavingConfig(true);
      setConfigFeedback(null);
      await api.patch(`/clients/${clientId}`, {
        whatsapp: whatsapp.trim(),
        metaAdAccountId: metaAdAccountId.trim(),
      });
      await loadClient();
      setConfigFeedback('Dados atualizados com sucesso!');
      setTimeout(() => setConfigFeedback(null), 3000);
    } catch (err) {
      console.error('Erro ao salvar configurações do cliente:', err);
      alert('Falha ao salvar configurações do cliente.');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleSyncMetaAds = async () => {
    try {
      setSyncingMeta(true);
      setSyncMessage(null);
      const res = await api.get(`/reports/meta-insights/${clientId}`, {
        params: { weekStartDate, weekEndDate },
      });
      const metrics = res.data;
      setMetaSpend(String(metrics.spend ?? 0));
      setMetaConversas(String(metrics.conversas ?? 0));
      setMetaClicks(String(metrics.clicks ?? 0));
      setMetaImpressions(String(metrics.impressions ?? 0));
      setSyncMessage({
        type: 'success',
        text: 'Métricas reais sincronizadas com sucesso da Meta Graph API!',
      });
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        'Não foi possível sincronizar com a Meta Graph API. Preencha os dados reais manualmente abaixo.';
      setSyncMessage({
        type: 'error',
        text: Array.isArray(msg) ? msg.join(', ') : msg,
      });
    } finally {
      setSyncingMeta(false);
    }
  };

  // Cálculos automáticos em tempo real para conferência do gestor
  const numSpend = parseFloat(metaSpend) || 0;
  const numConversas = parseInt(metaConversas, 10) || 0;
  const numClicks = parseInt(metaClicks, 10) || 0;
  const numImpressions = parseInt(metaImpressions, 10) || 0;

  const calcCostPerChat = numConversas > 0 ? numSpend / numConversas : 0;
  const calcCpc = numClicks > 0 ? numSpend / numClicks : 0;
  const calcCtr = numImpressions > 0 ? (numClicks / numImpressions) * 100 : 0;

  const handleGenerateReport = async () => {
    if (!weekStartDate || !weekEndDate) {
      alert('Informe a data inicial e final da semana.');
      return;
    }

    try {
      setGenerating(true);
      setSyncMessage(null);

      await api.post('/reports/generate', {
        clientId,
        weekStartDate,
        weekEndDate,
        metaSpend: metaSpend !== '' ? parseFloat(metaSpend) : undefined,
        metaConversas: metaConversas !== '' ? parseInt(metaConversas, 10) : undefined,
        metaClicks: metaClicks !== '' ? parseInt(metaClicks, 10) : undefined,
        metaImpressions: metaImpressions !== '' ? parseInt(metaImpressions, 10) : undefined,
        faturamentoTotal: faturamentoTotal !== '' ? parseFloat(faturamentoTotal) : undefined,
        pedidosTotais: pedidosTotais !== '' ? parseInt(pedidosTotais, 10) : undefined,
        analiseGestor: analiseGestor.trim() || undefined,
        proximasAcoes: proximasAcoes.trim() || undefined,
      });

      // Limpa campos e recarrega
      setMetaSpend('');
      setMetaConversas('');
      setMetaClicks('');
      setMetaImpressions('');
      setFaturamentoTotal('');
      setPedidosTotais('');
      setAnaliseGestor('');
      setProximasAcoes('');
      await loadClient();
    } catch (err: any) {
      console.error('Erro ao gerar relatório semanal:', err);
      const errMsg = err.response?.data?.message || 'Falha ao gerar relatório semanal.';
      alert(Array.isArray(errMsg) ? errMsg.join(', ') : errMsg);
    } finally {
      setGenerating(false);
    }
  };

  const handleSendWhatsApp = async (reportId: string) => {
    try {
      setSendingId(reportId);
      const res = await api.post(`/reports/${reportId}/send-whatsapp`, {});
      const data = res.data;
      if (data?.success) {
        alert('Relatório em PDF enviado com sucesso para o WhatsApp do cliente!');
        await loadClient();
      } else {
        alert(`Falha no envio via WhatsApp: ${data?.error || 'Erro desconhecido'}`);
      }
    } catch (err: any) {
      console.error('Erro ao disparar WhatsApp:', err);
      const errMsg = err.response?.data?.message || 'Falha ao enviar relatório via WhatsApp.';
      alert(Array.isArray(errMsg) ? errMsg.join(', ') : errMsg);
    } finally {
      setSendingId(null);
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!window.confirm('Deseja realmente excluir este relatório semanal?')) {
      return;
    }
    try {
      setDeletingId(reportId);
      await api.delete(`/reports/${reportId}`);
      await loadClient();
    } catch (err) {
      console.error('Erro ao excluir relatório:', err);
      alert('Não foi possível excluir o relatório.');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
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
          Voltar para Clientes
        </Link>
      </div>
    );
  }

  const reports = client.weeklyReports || [];
  const latestReport = reports[0];

  return (
    <div className="min-h-screen bg-surface-canvas text-text-primary">
      <DashboardHeader onRefresh={loadClient} isRefreshing={loading} />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* Navegação de Voltar */}
        <div className="mb-6">
          <Link
            href="/clients"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-muted hover:text-text-primary transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar para Clientes Ativos
          </Link>
        </div>

        {/* Header do Cliente 360° */}
        <div className="rounded-xl border border-white/10 bg-surface-card p-6 shadow-sm mb-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-brand/10 border border-brand/20 text-brand font-black text-2xl">
                {client.deliveryNome.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-black text-text-primary">{client.deliveryNome}</h1>
                  <span className="inline-flex items-center gap-1 rounded-full bg-status-success/10 px-2.5 py-0.5 text-xs font-bold text-status-success border border-status-success/20">
                    <CheckCircle2 className="h-3 w-3" />
                    {client.status}
                  </span>
                </div>
                <p className="mt-1 text-sm text-text-secondary">
                  Responsável: <strong className="text-text-primary">{client.nome}</strong> | WhatsApp:{' '}
                  <span className="text-text-primary">{client.whatsapp}</span>
                </p>
                <div className="mt-2 flex flex-wrap gap-4 text-xs text-text-muted">
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5 text-text-muted/60" />
                    {client.segmento}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-text-muted/60" />
                    {client.cidade}
                  </span>
                </div>
              </div>
            </div>

            {/* Configuração de WhatsApp e Meta Ads */}
            <div className="rounded-lg border border-white/10 bg-surface-canvas/80 p-3.5 lg:w-[440px]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">
                    WhatsApp do Cliente (Envio PDF)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: (32) 99151-2320"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    className="w-full rounded-md border border-white/10 bg-surface-card px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">
                    Conta Meta Ads (ID)
                  </label>
                  <input
                    type="text"
                    placeholder="ex: act_123456789"
                    value={metaAdAccountId}
                    onChange={(e) => setMetaAdAccountId(e.target.value)}
                    className="w-full rounded-md border border-white/10 bg-surface-card px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none"
                  />
                </div>
              </div>
              <div className="mt-2.5 flex items-center justify-between gap-2">
                {configFeedback ? (
                  <span className="text-[11px] font-semibold text-status-success">{configFeedback}</span>
                ) : (
                  <span className="text-[10px] text-text-muted">
                    Confira o DDD + 9 dígitos do WhatsApp antes de disparar o PDF.
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleSaveClientConfig}
                  disabled={savingConfig}
                  className="rounded-md bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/20 transition-colors disabled:opacity-50 shrink-0"
                >
                  {savingConfig ? 'Salvando...' : 'Salvar Dados'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Card de Contrato & Cobrança */}
        <div className="rounded-xl border border-white/10 bg-surface-card p-5 shadow-sm mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/15 text-brand">
                <CreditCard className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-text-primary">Contrato & Cobrança Ativa</h2>
                <p className="text-xs text-text-muted">Plano contratual, receita contábil e status financeiro</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsContractModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-text-muted hover:border-white/20 hover:text-text-primary transition-all self-start sm:self-auto"
            >
              <Edit className="h-3.5 w-3.5" />
              <span>{client.contract ? 'Editar Contrato' : 'Cadastrar Contrato'}</span>
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Plano / Ciclo</span>
              <div className="mt-1 flex items-center gap-2">
                <span className="rounded bg-brand/15 px-2 py-0.5 text-xs font-bold text-brand uppercase">
                  {client.contract?.cycle || 'Trimestral'}
                </span>
                <span className="text-xs font-semibold text-text-primary">
                  {client.contract ? `R$ ${client.contract.totalValue.toLocaleString('pt-BR')}` : '-'}
                </span>
              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">MRR Contábil</span>
              <div className="mt-1 text-base font-bold text-text-primary tabular-nums">
                {client.contract ? `R$ ${client.contract.mrrEquivalent.toLocaleString('pt-BR')}/mês` : '-'}
              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Vencimento</span>
              <div className="mt-1 text-xs font-semibold text-text-primary">
                Dia {client.contract?.dueDay || 10} de cada mês
              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Status de Pagamento</span>
              <div className="mt-1">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${
                    client.contract?.paymentStatus === 'EM_DIA'
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : client.contract?.paymentStatus === 'INADIMPLENTE'
                      ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                  }`}
                >
                  {client.contract?.paymentStatus === 'EM_DIA'
                    ? 'Em dia'
                    : client.contract?.paymentStatus === 'INADIMPLENTE'
                    ? 'Inadimplente'
                    : 'Pendente'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal de Contrato */}
        <ContractModal
          isOpen={isContractModalOpen}
          client={client}
          onClose={() => setIsContractModalOpen(false)}
          onSuccess={loadClient}
        />

        {/* Grid de KPIs do Último Relatório */}
        {latestReport && (
          <div className="mb-8">
            <h2 className="text-sm font-bold uppercase tracking-wider text-text-muted mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-brand" />
              Métricas Consolidadas do Último Relatório Emitido
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-white/10 bg-surface-card p-5">
                <span className="text-xs text-text-muted font-medium">Investimento em Tráfego</span>
                <p className="mt-2 text-2xl font-black text-brand">R$ {latestReport.metaSpend.toFixed(2)}</p>
                <span className="text-[10px] text-text-muted mt-1 block">
                  {new Date(latestReport.weekStartDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })} a{' '}
                  {new Date(latestReport.weekEndDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                </span>
              </div>
              <div className="rounded-xl border border-white/10 bg-surface-card p-5">
                <span className="text-xs text-text-muted font-medium">Conversas no WhatsApp</span>
                <p className="mt-2 text-2xl font-black text-status-success">{latestReport.metaConversas}</p>
                <span className="text-[10px] text-text-muted mt-1 block">Iniciadas por anúncios</span>
              </div>
              <div className="rounded-xl border border-white/10 bg-surface-card p-5">
                <span className="text-xs text-text-muted font-medium">Custo por Conversa</span>
                <p className="mt-2 text-2xl font-black text-blue-400">R$ {latestReport.metaCostPerChat.toFixed(2)}</p>
                <span className="text-[10px] text-text-muted mt-1 block">Custo por novo contato</span>
              </div>
              <div className="rounded-xl border border-white/10 bg-surface-card p-5">
                <span className="text-xs text-text-muted font-medium">Cliques no Link (CTR)</span>
                <p className="mt-2 text-2xl font-black text-yellow-400">
                  {latestReport.metaClicks}{' '}
                  <span className="text-xs font-normal text-text-muted">({latestReport.metaCtr}%)</span>
                </p>
                <span className="text-[10px] text-text-muted mt-1 block">
                  CPC Médio: R$ {latestReport.metaCpc.toFixed(2)} | Impressões:{' '}
                  {latestReport.metaImpressions.toLocaleString('pt-BR')}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-12">
          {/* Coluna Esquerda (7 cols): Histórico de Relatórios Semanais */}
          <div className="lg:col-span-7">
            <h2 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-brand" />
              Histórico de Relatórios Semanais
            </h2>

            {reports.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-surface-card p-8 text-center text-text-muted">
                Nenhum relatório gerado ainda para esta operação. Preencha os dados reais ao lado para emitir o 1º PDF.
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {reports.map((rep) => {
                  const dataInicio = new Date(rep.weekStartDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
                  const dataFim = new Date(rep.weekEndDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
                  const pdfDownloadUrl = `${API_BASE_URL}/reports/${rep.id}/pdf`;

                  return (
                    <div
                      key={rep.id}
                      className="rounded-xl border border-white/10 bg-surface-card p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-text-primary">
                            Semana: {dataInicio} a {dataFim}
                          </span>
                          {rep.whatsappSent ? (
                            <span className="rounded-md bg-status-success/10 px-2 py-0.5 text-[10px] font-bold text-status-success border border-status-success/20 flex items-center gap-1">
                              <CheckCircle2 className="h-2.5 w-2.5" />
                              WhatsApp Enviado
                            </span>
                          ) : (
                            <span className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] font-medium text-text-muted flex items-center gap-1">
                              <Clock className="h-2.5 w-2.5" />
                              Não enviado
                            </span>
                          )}
                        </div>

                        <div className="mt-2 flex flex-wrap gap-4 text-xs text-text-muted">
                          <span>
                            Investimento: <strong className="text-text-primary">R$ {rep.metaSpend.toFixed(2)}</strong>
                          </span>
                          <span>
                            Conversas: <strong className="text-status-success">{rep.metaConversas}</strong>
                          </span>
                          <span>
                            Custo/Chat: <strong className="text-blue-400">R$ {rep.metaCostPerChat.toFixed(2)}</strong>
                          </span>
                          {rep.faturamentoTotal != null && (
                            <span>
                              Faturamento:{' '}
                              <strong className="text-text-primary">R$ {rep.faturamentoTotal.toFixed(2)}</strong>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Botões de Ação do Relatório */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <a
                          href={pdfDownloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-text-primary hover:bg-white/10 transition-colors"
                        >
                          <FileText className="h-3.5 w-3.5 text-brand" />
                          Visualizar PDF
                        </a>

                        <button
                          type="button"
                          onClick={() => handleSendWhatsApp(rep.id)}
                          disabled={sendingId === rep.id}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-status-success/90 px-3 py-1.5 text-xs font-bold text-white hover:bg-status-success transition-colors disabled:opacity-50"
                        >
                          <Send className="h-3.5 w-3.5" />
                          {sendingId === rep.id ? 'Enviando...' : 'Enviar no WhatsApp'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteReport(rep.id)}
                          disabled={deletingId === rep.id}
                          title="Excluir relatório"
                          className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 p-1.5 text-text-muted hover:text-status-danger hover:border-status-danger/30 transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Coluna Direita (5 cols): Gerador de Relatório Semanal com Dados Reais */}
          <div className="lg:col-span-5">
            <div className="rounded-xl border border-white/10 bg-surface-card p-6 shadow-sm">
              <div className="flex items-center justify-between gap-2 mb-2">
                <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-brand" />
                  Gestão Semanal & Emissão de PDF
                </h2>
                <button
                  type="button"
                  onClick={handleSyncMetaAds}
                  disabled={syncingMeta}
                  className="inline-flex items-center gap-1.5 rounded-md border border-brand/30 bg-brand/10 px-2.5 py-1 text-[11px] font-bold text-brand hover:bg-brand/20 transition-colors disabled:opacity-50"
                >
                  <DownloadCloud className={`h-3.5 w-3.5 ${syncingMeta ? 'animate-bounce' : ''}`} />
                  {syncingMeta ? 'Buscando...' : 'Importar Meta Ads'}
                </button>
              </div>
              <p className="text-xs text-text-muted mb-4">
                Importe as métricas da Meta Graph API ou preencha os números reais da semana para gerar o PDF oficial.
              </p>

              {syncMessage && (
                <div
                  className={`mb-4 flex items-start gap-2 rounded-lg border p-3 text-xs ${
                    syncMessage.type === 'success'
                      ? 'border-status-success/30 bg-status-success/10 text-status-success'
                      : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                  }`}
                >
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{syncMessage.text}</span>
                </div>
              )}

              <div className="flex flex-col gap-3.5">
                {/* Período da Semana */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">
                      Início da Semana
                    </label>
                    <input
                      type="date"
                      value={weekStartDate}
                      onChange={(e) => setWeekStartDate(e.target.value)}
                      className="w-full rounded-md border border-white/10 bg-surface-canvas px-3 py-2 text-xs text-text-primary focus:border-brand focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">
                      Fim da Semana
                    </label>
                    <input
                      type="date"
                      value={weekEndDate}
                      onChange={(e) => setWeekEndDate(e.target.value)}
                      className="w-full rounded-md border border-white/10 bg-surface-canvas px-3 py-2 text-xs text-text-primary focus:border-brand focus:outline-none"
                    />
                  </div>
                </div>

                {/* Métricas Reais de Tráfego Pago */}
                <div className="rounded-lg border border-white/10 bg-surface-canvas/60 p-3 space-y-3">
                  <span className="text-[10px] font-bold text-brand uppercase tracking-wider block">
                    Métricas Reais de Tráfego (Meta Ads)
                  </span>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[10px] font-semibold text-text-muted block mb-1">
                        Investimento (R$)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Ex: 350.00"
                        value={metaSpend}
                        onChange={(e) => setMetaSpend(e.target.value)}
                        className="w-full rounded-md border border-white/10 bg-surface-card px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-text-muted block mb-1">
                        Conversas / Mensagens
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="Ex: 85"
                        value={metaConversas}
                        onChange={(e) => setMetaConversas(e.target.value)}
                        className="w-full rounded-md border border-white/10 bg-surface-card px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-text-muted block mb-1">
                        Cliques no Link
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="Ex: 420"
                        value={metaClicks}
                        onChange={(e) => setMetaClicks(e.target.value)}
                        className="w-full rounded-md border border-white/10 bg-surface-card px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-text-muted block mb-1">
                        Impressões Totais
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="Ex: 12500"
                        value={metaImpressions}
                        onChange={(e) => setMetaImpressions(e.target.value)}
                        className="w-full rounded-md border border-white/10 bg-surface-card px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Preview de Indicadores Calculados Automaticamente */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5 text-[11px]">
                    <div>
                      <span className="text-text-muted block text-[10px]">Custo / Chat</span>
                      <strong className="text-blue-400">R$ {calcCostPerChat.toFixed(2)}</strong>
                    </div>
                    <div>
                      <span className="text-text-muted block text-[10px]">CPC Médio</span>
                      <strong className="text-text-primary">R$ {calcCpc.toFixed(2)}</strong>
                    </div>
                    <div>
                      <span className="text-text-muted block text-[10px]">CTR</span>
                      <strong className="text-yellow-400">{calcCtr.toFixed(2)}%</strong>
                    </div>
                  </div>
                </div>

                {/* Métricas Operacionais de Vendas */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">
                      Faturamento da Semana (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Ex: 14500.00"
                      value={faturamentoTotal}
                      onChange={(e) => setFaturamentoTotal(e.target.value)}
                      className="w-full rounded-md border border-white/10 bg-surface-canvas px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">
                      Pedidos Totais na Semana
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="Ex: 240"
                      value={pedidosTotais}
                      onChange={(e) => setPedidosTotais(e.target.value)}
                      className="w-full rounded-md border border-white/10 bg-surface-canvas px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">
                    Diagnóstico do Gestor MOVY
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Análise real sobre a performance da semana..."
                    value={analiseGestor}
                    onChange={(e) => setAnaliseGestor(e.target.value)}
                    className="w-full rounded-md border border-white/10 bg-surface-canvas px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">
                    Próximas Ações e Estratégia
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Plano de ação para a próxima semana..."
                    value={proximasAcoes}
                    onChange={(e) => setProximasAcoes(e.target.value)}
                    className="w-full rounded-md border border-white/10 bg-surface-canvas px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleGenerateReport}
                  disabled={generating}
                  className="mt-1 inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-xs font-bold text-white hover:bg-brand-hover transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${generating ? 'animate-spin' : ''}`} />
                  {generating ? 'Gerando Relatório em PDF...' : 'Gerar Relatório em PDF'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
