'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { MetaCredentialsStatus, MetaAccountInsights } from '@/types';
import { MetaConfigModal } from './meta-config-modal';
import {
  TrendingUp,
  RefreshCw,
  Settings,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  MessageCircle,
  MousePointerClick,
  Eye,
  DollarSign,
  ShieldAlert,
  Clock,
  Sparkles,
  ArrowRight,
  ShoppingBag,
  Zap,
} from 'lucide-react';

interface MetaInsightsCardProps {
  clientId: string;
  clientName: string;
  onOpenAutoReportModal?: () => void;
}

export function MetaInsightsCard({
  clientId,
  clientName,
  onOpenAutoReportModal,
}: MetaInsightsCardProps) {
  const [statusInfo, setStatusInfo] = useState<MetaCredentialsStatus | null>(null);
  const [insights, setInsights] = useState<MetaAccountInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRange, setSelectedRange] = useState<'7d' | '14d' | '30d'>('7d');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cooldownNotice, setCooldownNotice] = useState<string | null>(null);

  const getDateRange = (range: '7d' | '14d' | '30d') => {
    const today = new Date();
    const days = range === '7d' ? 7 : range === '14d' ? 14 : 30;
    const since = new Date(today.getTime() - days * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];
    const until = today.toISOString().split('T')[0];
    return { since, until };
  };

  const loadStatusAndInsights = async (forceRefresh = false) => {
    setErrorMessage(null);
    setCooldownNotice(null);

    if (forceRefresh) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      // 1. Status das credenciais
      const statusRes = await api.get<MetaCredentialsStatus>(`/meta-ads/clients/${clientId}/status`);
      setStatusInfo(statusRes.data);

      if (statusRes.data.hasToken) {
        // 2. Busca métricas gerais da conta
        const { since, until } = getDateRange(selectedRange);
        const insightsRes = await api.get<MetaAccountInsights>(
          `/meta-ads/clients/${clientId}/insights?since=${since}&until=${until}${forceRefresh ? '&force=true' : ''
          }`
        );
        setInsights(insightsRes.data);

        if (insightsRes.data.cooldownWarning) {
          setCooldownNotice(insightsRes.data.cooldownWarning);
        }
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Falha ao carregar métricas da Meta Graph API.';
      setErrorMessage(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (clientId) {
      loadStatusAndInsights();
    }
  }, [clientId, selectedRange]);

  const formatCurrency = (val?: number | null) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  if (loading && !insights) {
    return (
      <div className="bg-surface-card rounded-xl p-6 border border-white/10 shadow-sm animate-pulse space-y-4">
        <div className="h-5 w-48 bg-white/10 rounded" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="h-20 bg-surface-canvas rounded-lg border border-white/5" />
          <div className="h-20 bg-surface-canvas rounded-lg border border-white/5" />
          <div className="h-20 bg-surface-canvas rounded-lg border border-white/5" />
          <div className="h-20 bg-surface-canvas rounded-lg border border-white/5" />
        </div>
      </div>
    );
  }

  // Se a conta Meta ainda não foi configurada
  if (!statusInfo?.hasToken) {
    return (
      <div className="bg-surface-card rounded-xl p-6 border border-dashed border-white/15 shadow-sm text-center space-y-3">
        <div className="mx-auto w-10 h-10 rounded-full bg-brand/10 text-brand flex items-center justify-center">
          <TrendingUp className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-text-primary">
            Métricas Meta Ads Automáticas (Graph API)
          </h4>
          <p className="text-xs text-text-muted mt-1 max-w-md mx-auto">
            Conecte a conta de anúncios da Meta para obter relatórios consolidados em tempo real,
            com cálculo de ROAS, CPR e sem digitação manual.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-brand hover:bg-brand-hover text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 transition-colors shadow-sm"
        >
          <Settings className="w-3.5 h-3.5" />
          Configurar Credenciais Meta
        </button>

        <MetaConfigModal
          clientId={clientId}
          clientName={clientName}
          isOpen={isModalOpen}
          statusInfo={statusInfo}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => loadStatusAndInsights(true)}
        />
      </div>
    );
  }

  const hasWhatsapp = (insights?.conversas || 0) > 0;

  return (
    <div className="bg-surface-card rounded-xl p-6 border border-white/10 shadow-sm space-y-5">
      {/* Topo do Card */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-text-primary text-base flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-brand" />
              Métricas Consolidadas Meta Ads
            </h3>

            {statusInfo.isExpired ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                Token Expirado
              </span>
            ) : statusInfo.isNearExpiry ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                Token Vence em {statusInfo.daysRemaining}d
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Conectado ({statusInfo.daysRemaining}d)
              </span>
            )}
          </div>
        </div>

        {/* Controles de Período & Ações */}
        <div className="flex items-center gap-2">
          {/* Seletor 7d / 14d / 30d */}
          <div className="flex items-center rounded-lg border border-white/10 bg-surface-canvas p-0.5 text-xs">
            <button
              onClick={() => setSelectedRange('7d')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all ${selectedRange === '7d'
                  ? 'bg-brand text-white shadow-sm'
                  : 'text-text-muted hover:text-text-primary'
                }`}
            >
              7 dias
            </button>
            <button
              onClick={() => setSelectedRange('14d')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all ${selectedRange === '14d'
                  ? 'bg-brand text-white shadow-sm'
                  : 'text-text-muted hover:text-text-primary'
                }`}
            >
              14 dias
            </button>
            <button
              onClick={() => setSelectedRange('30d')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all ${selectedRange === '30d'
                  ? 'bg-brand text-white shadow-sm'
                  : 'text-text-muted hover:text-text-primary'
                }`}
            >
              30 dias
            </button>
          </div>

          <button
            onClick={() => loadStatusAndInsights(true)}
            disabled={isRefreshing}
            className="p-1.5 hover:bg-white/5 rounded-lg text-text-muted hover:text-text-primary transition-colors border border-white/10"
            title="Atualizar dados (Protegido por cooldown de 60s)"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-brand' : ''}`} />
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="p-1.5 hover:bg-white/5 rounded-lg text-text-muted hover:text-text-primary transition-colors border border-white/10"
            title="Gerenciar credenciais e token"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Avisos de Cooldown e Erros */}
      {cooldownNotice && (
        <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 flex items-start gap-2">
          <Clock className="w-4 h-4 shrink-0 mt-0.5 text-blue-400" />
          <span>{cooldownNotice}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Grid de KPIs Consolidados com Regra de Atendimento Condicional */}
      {insights && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* KPI 1: Investimento Total */}
            <div className="p-3.5 bg-surface-canvas rounded-xl border border-white/5">
              <span className="text-[11px] text-text-muted font-medium block">
                Total Investido
              </span>
              <div className="text-xl font-black text-brand mt-1">
                {formatCurrency(insights.spend)}
              </div>
              <span className="text-[10px] text-text-muted mt-0.5 block">
                {insights.periodStart} a {insights.periodEnd}
              </span>
            </div>

            {/* KPI 2: Condicional WhatsApp vs PDV */}
            {hasWhatsapp ? (
              <div className="p-3.5 bg-surface-canvas rounded-xl border border-white/5">
                <span className="text-[11px] text-text-muted font-medium block flex items-center gap-1">
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                  Conversas (WhatsApp)
                </span>
                <div className="text-xl font-black text-emerald-400 mt-1">
                  {insights.conversas} chats
                </div>
                <span className="text-[10px] text-text-muted mt-0.5 block">
                  CPA: {formatCurrency(insights.cpa)} / chat
                </span>
              </div>
            ) : (
              <div className="p-3.5 bg-surface-canvas rounded-xl border border-white/5">
                <span className="text-[11px] text-text-muted font-medium block flex items-center gap-1">
                  <ShoppingBag className="w-3.5 h-3.5 text-blue-400" />
                  Operação Direta (PDV/App)
                </span>
                <div className="text-xl font-black text-blue-400 mt-1">
                  100% Digital
                </div>
                <span className="text-[10px] text-text-muted mt-0.5 block">Sem atendimento WhatsApp</span>
              </div>
            )}

            {/* KPI 3: ROAS da Conta */}
            <div className="p-3.5 bg-surface-canvas rounded-xl border border-white/5">
              <span className="text-[11px] text-text-muted font-medium block flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-yellow-400" />
                ROAS Estimado
              </span>
              <div className="text-xl font-black text-yellow-400 mt-1">
                {insights.roas && insights.roas > 0 ? `${insights.roas}x` : 'Em apuração'}
              </div>
              <span className="text-[10px] text-text-muted mt-0.5 block">
                Retorno s/ Investimento
              </span>
            </div>

            {/* KPI 4: CPR (Custo por Resultado) & Cliques */}
            <div className="p-3.5 bg-surface-canvas rounded-xl border border-white/5">
              <span className="text-[11px] text-text-muted font-medium block">
                CPR (Custo p/ Resultado)
              </span>
              <div className="text-xl font-black text-text-primary mt-1">
                {formatCurrency(insights.cpr || insights.cpa)}
              </div>
              <span className="text-[10px] text-text-muted mt-0.5 block">
                {insights.clicks.toLocaleString('pt-BR')} cliques ({insights.ctr}%)
              </span>
            </div>
          </div>

          {/* Rodapé do Card com Ação 1-Click para Relatório Semanal */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 border-t border-white/5 text-xs">
            <span className="text-[11px] text-text-muted flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-brand" />
              {insights.cached ? 'Dados em cache (TTL 15 min)' : 'Dados sincronizados diretamente da Meta Graph API'}
            </span>

            {onOpenAutoReportModal && (
              <button
                type="button"
                onClick={onOpenAutoReportModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-brand text-white rounded-lg font-bold shadow-md shadow-brand/20 hover:bg-brand-hover active:scale-95 transition-all self-start sm:self-auto"
              >
                <span>Emitir Relatório Semanal 1-Click</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Modal de Configuração de Credenciais */}
      <MetaConfigModal
        clientId={clientId}
        clientName={clientName}
        isOpen={isModalOpen}
        statusInfo={statusInfo}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => loadStatusAndInsights(true)}
      />
    </div>
  );
}
