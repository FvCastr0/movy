'use client';

import React from 'react';
import { FinanceMetrics } from '@/types';
import {
  TrendingUp,
  CreditCard,
  AlertOctagon,
  Award,
  PieChart,
} from 'lucide-react';

interface FinanceKpiCardsProps {
  metrics: FinanceMetrics | null;
  isLoading?: boolean;
}

export function FinanceKpiCards({ metrics, isLoading = false }: FinanceKpiCardsProps) {
  const formatCurrency = (val?: number) => {
    return (val || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    });
  };

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 sm:gap-4">
      {/* 1. MRR Contábil */}
      <div className="rounded-xl border border-white/10 bg-surface-card p-4 transition-all hover:border-white/20">
        <div className="flex items-center justify-between text-text-muted">
          <span className="text-xs font-semibold uppercase tracking-wider text-brand">MRR Contábil</span>
          <TrendingUp className="h-4 w-4 text-brand" />
        </div>
        <div className="mt-2 text-2xl font-bold tabular-nums text-text-primary">
          {isLoading ? '-' : formatCurrency(metrics?.mrrTotal)}
        </div>
        <p className="mt-1 text-xs text-text-muted">
          {isLoading ? '' : `${metrics?.clientesAtivosCount ?? 0} clientes ativos`}
        </p>
      </div>

      {/* 2. Receita Caixa do Mês */}
      <div className="rounded-xl border border-white/10 bg-surface-card p-4 transition-all hover:border-white/20">
        <div className="flex items-center justify-between text-text-muted">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Caixa do Mês</span>
          <CreditCard className="h-4 w-4 text-emerald-400" />
        </div>
        <div className="mt-2 text-2xl font-bold tabular-nums text-emerald-400">
          {isLoading ? '-' : formatCurrency(metrics?.receitaMesAtual)}
        </div>
        <p className="mt-1 text-xs text-text-muted">
          MRR em dia + antecipações
        </p>
      </div>

      {/* 3. Inadimplência & Atrasos */}
      <div className="rounded-xl border border-white/10 bg-surface-card p-4 transition-all hover:border-white/20">
        <div className="flex items-center justify-between text-text-muted">
          <span className="text-xs font-semibold uppercase tracking-wider text-rose-400">Inadimplência</span>
          <AlertOctagon className="h-4 w-4 text-rose-400" />
        </div>
        <div className="mt-2 text-2xl font-bold tabular-nums text-rose-400">
          {isLoading ? '-' : formatCurrency(metrics?.totalInadimplenteValor)}
        </div>
        <p className="mt-1 text-xs text-text-muted">
          {isLoading ? '' : `${metrics?.totalInadimplenteClientes ?? 0} clientes em atraso`}
        </p>
      </div>

      {/* 4. LTV Médio & Ticket Médio */}
      <div className="rounded-xl border border-white/10 bg-surface-card p-4 transition-all hover:border-white/20">
        <div className="flex items-center justify-between text-text-muted">
          <span className="text-xs font-semibold uppercase tracking-wider text-purple-400">LTV Médio</span>
          <Award className="h-4 w-4 text-purple-400" />
        </div>
        <div className="mt-2 text-2xl font-bold tabular-nums text-purple-400">
          {isLoading ? '-' : formatCurrency(metrics?.ltvMedio)}
        </div>
        <p className="mt-1 text-xs text-text-muted">
          Ticket Médio: {isLoading ? '-' : formatCurrency(metrics?.ticketMedio)}
        </p>
      </div>

      {/* 5. Margem Bruta & COGS */}
      <div className="col-span-2 sm:col-span-1 rounded-xl border border-white/10 bg-surface-card p-4 transition-all hover:border-white/20">
        <div className="flex items-center justify-between text-text-muted">
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">Margem Bruta</span>
          <PieChart className="h-4 w-4 text-indigo-400" />
        </div>
        <div className="mt-2 text-2xl font-bold tabular-nums text-text-primary">
          {isLoading ? '-' : `${metrics?.margemBrutaPercent ?? 0}%`}
        </div>
        <p className="mt-1 text-xs text-text-muted">
          COGS Total: {isLoading ? '-' : formatCurrency(metrics?.cogsTotal)}
        </p>
      </div>
    </div>
  );
}
