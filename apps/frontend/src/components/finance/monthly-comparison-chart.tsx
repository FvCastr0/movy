'use client';

import React, { useState } from 'react';
import { MonthFinancialStatement, MonthlyClosingSummary } from '@/types';
import { TrendingUp, DollarSign, Calendar, Layers } from 'lucide-react';

interface MonthlyComparisonChartProps {
  data: MonthlyClosingSummary | null;
  periodMonths: number;
  onPeriodChange: (months: number) => void;
  isLoading: boolean;
}

export function MonthlyComparisonChart({
  data,
  periodMonths,
  onPeriodChange,
  isLoading,
}: MonthlyComparisonChartProps) {
  const [viewMode, setViewMode] = useState<'competence' | 'cash'>('competence');

  if (isLoading || !data) {
    return (
      <div className="flex h-72 items-center justify-center rounded-2xl border border-white/10 bg-surface-card p-6">
        <div className="flex flex-col items-center gap-2">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          <p className="text-xs text-text-muted">Calculando fechamento comparativo dos meses...</p>
        </div>
      </div>
    );
  }

  const periods = data.periods;
  if (periods.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center rounded-2xl border border-white/10 bg-surface-card p-6 text-text-muted text-xs">
        Nenhum dado financeiro registrado para o período selecionado.
      </div>
    );
  }

  // Encontrar o valor máximo para escala das barras
  const maxVal = Math.max(
    ...periods.map((p) =>
      Math.max(
        viewMode === 'competence' ? p.revenue.mrrRecognized : p.revenue.cashInflow,
        p.expenses.total,
        Math.abs(viewMode === 'competence' ? p.netProfitCompetence : p.netProfitCash),
        1000
      )
    )
  );

  return (
    <div className="rounded-2xl border border-white/10 bg-surface-card p-6 shadow-sm">
      {/* Header com controles */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-text-primary">
              Comparativo Mês a Mês (MoM) — Entradas vs Saídas vs Lucro
            </h3>
            <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-semibold text-brand">
              <TrendingUp className="h-3 w-3" />
              DRE Gerencial
            </span>
          </div>
          <p className="text-xs text-text-muted mt-0.5">
            Evolução do faturamento, controle de custos e resultado líquido real da Movy
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Seletor de Regime: Competência vs Caixa */}
          <div className="flex items-center rounded-lg border border-white/10 bg-surface-canvas p-1">
            <button
              type="button"
              onClick={() => setViewMode('competence')}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                viewMode === 'competence'
                  ? 'bg-white/10 text-text-primary shadow-sm'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Competência (MRR)
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cash')}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                viewMode === 'cash'
                  ? 'bg-white/10 text-text-primary shadow-sm'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Caixa (Entradas Reais)
            </button>
          </div>

          {/* Seletor de Período */}
          <div className="flex items-center rounded-lg border border-white/10 bg-surface-canvas p-1">
            {[3, 6, 12].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => onPeriodChange(m)}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                  periodMonths === m
                    ? 'bg-brand text-white shadow-sm'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                {m}M
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Legenda */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[11px]">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-emerald-400" />
            <span className="text-text-muted">
              {viewMode === 'competence' ? 'Receita Reconhecida (MRR)' : 'Entrada em Caixa'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-rose-400" />
            <span className="text-text-muted">Despesas Totais</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-brand" />
            <span className="text-text-muted">Lucro Líquido</span>
          </div>
        </div>

        <div className="text-text-muted">
          Margem Líquida Média no Período:{' '}
          <strong
            className={`font-semibold ${
              data.totals.averageMarginPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {data.totals.averageMarginPercent}%
          </strong>
        </div>
      </div>

      {/* Gráfico de Barras SVG Nativo */}
      <div className="mt-6">
        <div className="grid grid-cols-1 md:grid-flow-col md:auto-cols-fr gap-4 items-end min-h-[220px] pt-4">
          {periods.map((period) => {
            const rev =
              viewMode === 'competence'
                ? period.revenue.mrrRecognized
                : period.revenue.cashInflow;
            const exp = period.expenses.total + period.cogsClients;
            const net =
              viewMode === 'competence'
                ? period.netProfitCompetence
                : period.netProfitCash;

            const revHeight = Math.min(100, Math.max(4, Math.round((rev / maxVal) * 100)));
            const expHeight = Math.min(100, Math.max(4, Math.round((exp / maxVal) * 100)));
            const netHeight = Math.min(
              100,
              Math.max(4, Math.round((Math.abs(net) / maxVal) * 100))
            );

            return (
              <div
                key={period.monthKey}
                className="flex flex-col items-center justify-end h-full group"
              >
                {/* Badge de Margem */}
                <span
                  className={`mb-2 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    period.netMarginPercent >= 0
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-rose-500/10 text-rose-400'
                  }`}
                >
                  {period.netMarginPercent}%
                </span>

                {/* Trio de Barras */}
                <div className="flex items-end gap-1.5 w-full max-w-[80px] h-40 bg-white/[0.02] rounded-t-lg p-1.5 border border-white/5 relative">
                  {/* Barra 1: Receita */}
                  <div
                    style={{ height: `${revHeight}%` }}
                    title={`Receita: R$ ${rev.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    className="flex-1 bg-emerald-500/80 hover:bg-emerald-400 rounded-t transition-all relative group/bar"
                  />
                  {/* Barra 2: Despesas */}
                  <div
                    style={{ height: `${expHeight}%` }}
                    title={`Despesas + COGS: R$ ${exp.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    className="flex-1 bg-rose-500/80 hover:bg-rose-400 rounded-t transition-all relative group/bar"
                  />
                  {/* Barra 3: Lucro Líquido */}
                  <div
                    style={{ height: `${netHeight}%` }}
                    title={`Lucro Líquido: R$ ${net.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    className={`flex-1 rounded-t transition-all relative group/bar ${
                      net >= 0 ? 'bg-brand hover:bg-brand/90' : 'bg-rose-600/90'
                    }`}
                  />
                </div>

                {/* Nome do Mês */}
                <div className="mt-2 text-center">
                  <span className="block text-[11px] font-semibold text-text-primary">
                    {period.label.split(' ')[0].substring(0, 3)}
                  </span>
                  <span className="block text-[9px] text-text-muted">
                    {period.label.split(' ')[1]}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cards de Totais do Período */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-white/10">
        <div className="rounded-xl border border-white/5 bg-surface-canvas p-3">
          <span className="text-[11px] font-medium text-text-muted">Faturamento do Período</span>
          <p className="text-sm font-bold text-emerald-400 mt-1">
            R${' '}
            {(viewMode === 'competence'
              ? data.totals.totalRevenueCompetence
              : data.totals.totalRevenueCash
            ).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="rounded-xl border border-white/5 bg-surface-canvas p-3">
          <span className="text-[11px] font-medium text-text-muted">Total de Custos & Despesas</span>
          <p className="text-sm font-bold text-rose-400 mt-1">
            R$ {data.totals.totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="rounded-xl border border-white/5 bg-surface-canvas p-3">
          <span className="text-[11px] font-medium text-text-muted">Lucro Líquido Acumulado</span>
          <p className="text-sm font-bold text-text-primary mt-1">
            R${' '}
            {(viewMode === 'competence'
              ? data.totals.totalNetProfitCompetence
              : data.totals.totalNetProfitCash
            ).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="rounded-xl border border-white/5 bg-surface-canvas p-3">
          <span className="text-[11px] font-medium text-text-muted">Margem Líquida Média</span>
          <p
            className={`text-sm font-bold mt-1 ${
              data.totals.averageMarginPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {data.totals.averageMarginPercent}%
          </p>
        </div>
      </div>
    </div>
  );
}
