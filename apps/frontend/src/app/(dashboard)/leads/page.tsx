'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { Lead, LeadStage } from '@/types';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import { LeadKanban } from '@/components/leads/lead-kanban';
import { LeadTable } from '@/components/leads/lead-table';
import { AlertCircle, Target, Users, TrendingUp, CalendarClock } from 'lucide-react';

export default function LeadsDashboardPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');

  const fetchLeads = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    setIsRefreshing(true);
    setErrorMessage(null);

    try {
      const response = await api.get<Lead[]>('/leads');
      setLeads(response.data);
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message || 'Falha ao sincronizar leads com o servidor.'
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Atualização OTIMISTA e instantânea de etapa
  const handleStageChange = async (leadId: string, newStage: LeadStage) => {
    // 1. Guarda estado anterior para rollback
    const previousLeads = [...leads];

    // 2. Aplica atualização otimista na UI
    setLeads((prev) =>
      prev.map((lead) => (lead.id === leadId ? { ...lead, stage: newStage } : lead))
    );

    // 3. Persiste no backend em background
    try {
      await api.patch(`/leads/${leadId}`, { stage: newStage });
    } catch (err: any) {
      // 4. Rollback imediato se falhar
      setLeads(previousLeads);
      alert('Não foi possível atualizar a etapa do lead no servidor. A alteração foi desfeita.');
    }
  };

  // Métricas rápidas calculadas
  const totalLeads = leads.length;
  const aptosCloser = leads.filter(
    (l) => l.qualification?.meetingCondition === 'ATENDIDAS'
  ).length;
  const emNegociacao = leads.filter(
    (l) => l.stage === 'REUNIAO_AGENDADA' || l.stage === 'PROPOSTA_ENVIADA'
  ).length;
  const ganhos = leads.filter((l) => l.stage === 'GANHO').length;

  return (
    <div className="min-h-screen bg-surface-canvas">
      <DashboardHeader
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onRefresh={() => fetchLeads(true)}
        isRefreshing={isRefreshing}
      />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {/* Banner de Métricas Operacionais SDR */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <div className="rounded-xl border border-white/10 bg-surface-card p-4">
            <div className="flex items-center justify-between text-text-muted">
              <span className="text-xs font-semibold uppercase tracking-wider">Total de Leads</span>
              <Users className="h-4 w-4" />
            </div>
            <div className="mt-2 text-2xl font-bold tabular-nums text-text-primary">
              {totalLeads}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-surface-card p-4">
            <div className="flex items-center justify-between text-text-muted">
              <span className="text-xs font-semibold uppercase tracking-wider text-status-success">
                Aptos p/ Closer
              </span>
              <Target className="h-4 w-4 text-status-success" />
            </div>
            <div className="mt-2 text-2xl font-bold tabular-nums text-status-success">
              {aptosCloser}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-surface-card p-4">
            <div className="flex items-center justify-between text-text-muted">
              <span className="text-xs font-semibold uppercase tracking-wider text-brand">
                Em Negociação
              </span>
              <CalendarClock className="h-4 w-4 text-brand" />
            </div>
            <div className="mt-2 text-2xl font-bold tabular-nums text-text-primary">
              {emNegociacao}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-surface-card p-4">
            <div className="flex items-center justify-between text-text-muted">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                Ganhos / Fechados
              </span>
              <TrendingUp className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="mt-2 text-2xl font-bold tabular-nums text-emerald-400">
              {ganhos}
            </div>
          </div>
        </div>

        {/* Mensagem de Erro se houver falha de rede */}
        {errorMessage && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-status-danger/30 bg-status-danger/10 p-4 text-sm text-red-200">
            <AlertCircle className="h-5 w-5 shrink-0 text-status-danger" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Conteúdo Principal (Loading vs Kanban vs Tabela) */}
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
              <p className="text-xs font-medium text-text-muted">Carregando pipeline de vendas...</p>
            </div>
          </div>
        ) : viewMode === 'kanban' ? (
          <LeadKanban leads={leads} onStageChange={handleStageChange} />
        ) : (
          <LeadTable leads={leads} onStageChange={handleStageChange} />
        )}
      </main>
    </div>
  );
}
