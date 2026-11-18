'use client';

import React from 'react';
import { CrmMetrics } from '@/types';
import { Users, CalendarCheck, AlertTriangle, Trophy, DollarSign } from 'lucide-react';

interface CrmKpiCardsProps {
  metrics: CrmMetrics | null;
  isLoading?: boolean;
}

export function CrmKpiCards({ metrics, isLoading = false }: CrmKpiCardsProps) {
  const formatCurrency = (val?: number) => {
    return (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  };

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 sm:gap-4">
      {/* 1. Total Leads */}
      <div className="rounded-xl border border-white/10 bg-surface-card p-4 transition-all hover:border-white/20">
        <div className="flex items-center justify-between text-text-muted">
          <span className="text-xs font-semibold uppercase tracking-wider">Volume de Leads</span>
          <Users className="h-4 w-4 text-blue-400" />
        </div>
        <div className="mt-2 text-2xl font-bold tabular-nums text-text-primary">
          {isLoading ? '-' : metrics?.totalLeads ?? 0}
        </div>
        <div className="mt-1 flex items-center gap-2 text-xs text-text-muted">
          <span className="text-blue-400 font-medium">{metrics?.totalInbound ?? 0} Inbound</span>
          <span>•</span>
          <span className="text-amber-400 font-medium">{metrics?.totalOutbound ?? 0} Outbound</span>
        </div>
      </div>

      {/* 2. Taxa de Agendamento */}
      <div className="rounded-xl border border-white/10 bg-surface-card p-4 transition-all hover:border-white/20">
        <div className="flex items-center justify-between text-text-muted">
          <span className="text-xs font-semibold uppercase tracking-wider text-brand">Agendamento</span>
          <CalendarCheck className="h-4 w-4 text-brand" />
        </div>
        <div className="mt-2 text-2xl font-bold tabular-nums text-text-primary">
          {isLoading ? '-' : `${metrics?.bookingRate ?? 0}%`}
        </div>
        <p className="mt-1 text-xs text-text-muted">
          {isLoading ? 'Calculando...' : `${metrics?.agendadosCount ?? 0} agendamento(s)`}
        </p>
      </div>

      {/* 3. Taxa de No-Show */}
      <div className="rounded-xl border border-white/10 bg-surface-card p-4 transition-all hover:border-white/20">
        <div className="flex items-center justify-between text-text-muted">
          <span className="text-xs font-semibold uppercase tracking-wider text-rose-400">No-Show</span>
          <AlertTriangle className="h-4 w-4 text-rose-400" />
        </div>
        <div className="mt-2 text-2xl font-bold tabular-nums text-rose-400">
          {isLoading ? '-' : `${metrics?.noShowRate ?? 0}%`}
        </div>
        <p className="mt-1 text-xs text-text-muted">
          {isLoading ? 'Calculando...' : `${metrics?.noShowCount ?? 0} falta(s) no-show`}
        </p>
      </div>

      {/* 4. Win Rate (Fechamento) */}
      <div className="rounded-xl border border-white/10 bg-surface-card p-4 transition-all hover:border-white/20">
        <div className="flex items-center justify-between text-text-muted">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Win Rate</span>
          <Trophy className="h-4 w-4 text-emerald-400" />
        </div>
        <div className="mt-2 text-2xl font-bold tabular-nums text-emerald-400">
          {isLoading ? '-' : `${metrics?.winRate ?? 0}%`}
        </div>
        <p className="mt-1 text-xs text-text-muted">
          {isLoading ? 'Calculando...' : `${metrics?.fechadosCount ?? 0} fechado(s)`}
        </p>
      </div>

      {/* 5. Pipeline & Receita */}
      <div className="col-span-2 sm:col-span-1 rounded-xl border border-white/10 bg-surface-card p-4 transition-all hover:border-white/20">
        <div className="flex items-center justify-between text-text-muted">
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">Pipeline Aberto</span>
          <DollarSign className="h-4 w-4 text-indigo-400" />
        </div>
        <div className="mt-2 text-2xl font-bold tabular-nums text-text-primary">
          {isLoading ? '-' : formatCurrency(metrics?.totalPipelineValue)}
        </div>
        <div className="mt-1 text-xs text-emerald-400 font-medium">
          {isLoading ? '' : `${formatCurrency(metrics?.closedRevenueValue)} fechados`}
        </div>
      </div>
    </div>
  );
}
