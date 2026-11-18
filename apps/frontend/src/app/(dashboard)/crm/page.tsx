'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { Lead, LeadStage, CrmMetrics, CrmDateRange } from '@/types';
import { CrmKpiCards } from '@/components/crm/crm-kpi-cards';
import { CrmPipeline } from '@/components/crm/crm-pipeline';
import { CreateOutboundModal } from '@/components/crm/create-outbound-modal';
import { CrmDateFilter } from '@/components/crm/crm-date-filter';
import { StageUndoToast, UndoToastData } from '@/components/crm/stage-undo-toast';
import {
  UserPlus,
  RefreshCw,
  Search,
  AlertCircle,
} from 'lucide-react';

const STAGE_LABELS: Record<string, string> = {
  NOVO: 'Novo Lead',
  CONTATO_INICIADO: 'Em Contato',
  REUNIAO_AGENDADA: 'Reunião Agendada',
  NO_SHOW: 'No-Show',
  PROPOSTA_ENVIADA: 'Proposta Enviada',
  FECHADO: 'Fechado',
  PERDIDO: 'Perdido',
};

export default function CrmDashboardPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [metrics, setMetrics] = useState<CrmMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filtros
  const [originFilter, setOriginFilter] = useState<'ALL' | 'INBOUND' | 'OUTBOUND'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<CrmDateRange>({
    preset: 'ALL',
    label: 'Todo o Período (Geral)',
  });

  // Undo Toast state
  const [undoToastData, setUndoToastData] = useState<UndoToastData | null>(null);

  // Modais
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Busca dados de leads e métricas
  const fetchData = useCallback(
    async (isSilent = false) => {
      if (!isSilent) setIsLoading(true);
      setIsRefreshing(true);
      setErrorMessage(null);

      try {
        const queryParams = new URLSearchParams();
        if (originFilter !== 'ALL') {
          queryParams.append('origemTipo', originFilter);
        }
        if (searchQuery.trim()) {
          queryParams.append('search', searchQuery.trim());
        }

        const metricsParams = new URLSearchParams();
        if (originFilter !== 'ALL') {
          metricsParams.append('origemTipo', originFilter);
        }
        if (dateRange.startDate) {
          metricsParams.append('startDate', dateRange.startDate);
        }
        if (dateRange.endDate) {
          metricsParams.append('endDate', dateRange.endDate);
        }

        const [leadsRes, metricsRes] = await Promise.all([
          api.get<Lead[]>(`/leads/crm?${queryParams.toString()}`),
          api.get<CrmMetrics>(`/leads/crm-metrics?${metricsParams.toString()}`),
        ]);

        setLeads(leadsRes.data);
        setMetrics(metricsRes.data);
      } catch (err: any) {
        setErrorMessage(
          err.response?.data?.message || 'Falha ao sincronizar o CRM com o servidor.'
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [originFilter, searchQuery, dateRange]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const reloadMetrics = useCallback(async () => {
    try {
      const metricsParams = new URLSearchParams();
      if (originFilter !== 'ALL') {
        metricsParams.append('origemTipo', originFilter);
      }
      if (dateRange.startDate) {
        metricsParams.append('startDate', dateRange.startDate);
      }
      if (dateRange.endDate) {
        metricsParams.append('endDate', dateRange.endDate);
      }
      const res = await api.get<CrmMetrics>(`/leads/crm-metrics?${metricsParams.toString()}`);
      setMetrics(res.data);
    } catch {
      // Ignora erro em background
    }
  }, [originFilter, dateRange]);

  // Transição de Estágio no Pipeline com Suporte a Undo
  const handleStageChange = async (
    leadId: string,
    targetStage: LeadStage,
    extraData?: { lostReason?: string; meetingDate?: string; dealValue?: number }
  ) => {
    const previousLeads = [...leads];
    const targetLead = leads.find((l) => l.id === leadId);
    const previousStage = targetLead?.stage;

    // Atualização otimista
    setLeads((prev) =>
      prev.map((l) =>
        l.id === leadId
          ? {
            ...l,
            stage: targetStage,
            lostReason: extraData?.lostReason !== undefined ? extraData.lostReason : l.lostReason,
            meetingDate: extraData?.meetingDate !== undefined ? extraData.meetingDate : l.meetingDate,
            dealValue: extraData?.dealValue !== undefined ? extraData.dealValue : l.dealValue,
          }
          : l
      )
    );

    try {
      await api.patch(`/leads/${leadId}/crm-stage`, {
        stage: targetStage,
        ...extraData,
      });

      // Ativa o toast flutuante para permitir desfazer
      if (targetLead && previousStage && previousStage !== targetStage) {
        setUndoToastData({
          leadId,
          leadName: targetLead.deliveryNome || targetLead.nome || 'Lead',
          fromStageLabel: STAGE_LABELS[previousStage] || previousStage,
          toStageLabel: STAGE_LABELS[targetStage] || targetStage,
        });
      }

      // Recarrega as métricas em background para refletir a nova contagem de eventos
      reloadMetrics();
    } catch (err: any) {
      // Rollback imediato se o backend rejeitar
      setLeads(previousLeads);
      alert(
        err.response?.data?.message ||
        'Não foi possível atualizar o estágio no servidor. A alteração foi desfeita.'
      );
    }
  };

  // Ação de Desfazer via Toast Flutuante
  const handleUndo = async (leadId: string) => {
    try {
      const res = await api.post(`/leads/${leadId}/crm-stage/undo`);
      const restoredStage = res.data?.restoredStage as LeadStage;

      // Restaura o lead no estado local do Kanban
      setLeads((prev) =>
        prev.map((l) =>
          l.id === leadId
            ? {
              ...l,
              stage: restoredStage,
            }
            : l
        )
      );

      // Recarrega as métricas para decrementar os contadores
      await reloadMetrics();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Falha ao desfazer o estágio.');
      throw err;
    }
  };

  return (
    <>
      <main className="mx-auto max-w-7xl px-4 py-2 sm:px-6">
        {/* Banner de Título & Ações Principais */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-text-primary">
                CRM & Pipeline Comercial
              </h1>
            </div>
            <p className="mt-0.5 text-xs text-text-muted">
              Acompanhamento de ponta a ponta: Inbound, Prospecção Outbound, No-Show e Fechamentos
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Seletor de Período Temporal */}
            <CrmDateFilter
              currentRange={dateRange}
              onChange={setDateRange}
              disabled={isRefreshing}
            />

            <button
              type="button"
              onClick={() => fetchData(true)}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-surface-card px-3 py-2 text-xs font-semibold text-text-muted hover:bg-white/5 hover:text-text-primary transition-colors disabled:opacity-50"
              title="Recarregar CRM"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Atualizar</span>
            </button>

            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 rounded-lg bg-brand px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-brand/20 hover:bg-brand-hover transition-colors"
            >
              <UserPlus className="h-4 w-4" />
              <span>+ Novo Lead Outbound</span>
            </button>
          </div>
        </div>

        {/* Cards de KPIs Comerciais */}
        <div className="mb-6">
          <CrmKpiCards metrics={metrics} isLoading={isLoading} />
        </div>

        {/* Barra de Filtros e Busca */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-white/10 bg-surface-card p-3">
          {/* Tabs de Origem */}
          <div className="flex items-center rounded-lg border border-white/10 bg-surface-canvas p-1">
            <button
              type="button"
              onClick={() => setOriginFilter('ALL')}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${originFilter === 'ALL'
                ? 'bg-white/10 text-text-primary shadow-sm'
                : 'text-text-muted hover:text-text-primary'
                }`}
            >
              Todos os Leads
            </button>

            <button
              type="button"
              onClick={() => setOriginFilter('INBOUND')}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${originFilter === 'INBOUND'
                ? 'bg-blue-500/20 text-blue-400 shadow-sm border border-blue-500/30'
                : 'text-text-muted hover:text-text-primary'
                }`}
            >
              Inbound (Landing Page)
            </button>

            <button
              type="button"
              onClick={() => setOriginFilter('OUTBOUND')}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${originFilter === 'OUTBOUND'
                ? 'bg-amber-500/20 text-amber-400 shadow-sm border border-amber-500/30'
                : 'text-text-muted hover:text-text-primary'
                }`}
            >
              Outbound (Prospecção)
            </button>
          </div>

          {/* Campo de Busca Rápida */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por delivery, contato, cidade..."
              className="w-full rounded-lg border border-white/10 bg-surface-canvas pl-9 pr-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none"
            />
          </div>
        </div>

        {/* Mensagem de Erro (se houver) */}
        {errorMessage && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-200">
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Pipeline Kanban */}
        {isLoading ? (
          <div className="flex h-72 items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
              <p className="text-xs font-medium text-text-muted">Carregando pipeline de vendas...</p>
            </div>
          </div>
        ) : (
          <CrmPipeline leads={leads} onStageChange={handleStageChange} />
        )}
      </main>

      {/* Toast Flutuante de Desfazer Transição (Undo) */}
      <StageUndoToast
        data={undoToastData}
        onUndo={handleUndo}
        onClose={() => setUndoToastData(null)}
      />

      {/* Modal de Cadastro de Lead Outbound */}
      <CreateOutboundModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => fetchData(true)}
      />
    </>
  );
}
