'use client';

import React from 'react';
import { MonthFinancialStatement } from '@/types';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Calendar,
  Layers,
  Users,
  Cpu,
  Megaphone,
} from 'lucide-react';

interface CurrentMonthFinanceCardProps {
  statement?: MonthFinancialStatement;
  isLoading: boolean;
}

export function CurrentMonthFinanceCard({
  statement,
  isLoading,
}: CurrentMonthFinanceCardProps) {
  if (isLoading || !statement) {
    return (
      <div className="flex h-full min-h-[300px] items-center justify-center rounded-2xl border border-white/10 bg-surface-card p-6">
        <div className="flex flex-col items-center gap-2">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          <p className="text-xs text-text-muted">Calculando diagnóstico do mês vigente...</p>
        </div>
      </div>
    );
  }

  const {
    label,
    revenue,
    cogsClients,
    expenses,
    netProfitCompetence,
    netMarginPercent,
  } = statement;

  const totalCostsAndExpenses = cogsClients + expenses.total;
  const breakEvenDiff = revenue.mrrRecognized - totalCostsAndExpenses;
  const isProfitable = netProfitCompetence >= 0;

  // Diagnóstico semafórico
  let statusBadge = {
    label: 'Excelente',
    color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    icon: Flame,
    desc: 'Operação altamente lucrativa com margem acima de 40%.',
  };

  if (netMarginPercent < 0) {
    statusBadge = {
      label: 'Prejuízo Operacional',
      color: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      icon: AlertTriangle,
      desc: 'Custos e despesas superam as receitas deste mês.',
    };
  } else if (netMarginPercent < 20) {
    statusBadge = {
      label: 'Margem Apertada',
      color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      icon: AlertTriangle,
      desc: 'Margem líquida abaixo de 20%. Atenção aos custos fixos.',
    };
  } else if (netMarginPercent < 40) {
    statusBadge = {
      label: 'Saudável',
      color: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      icon: ShieldCheck,
      desc: 'Margem operacional dentro da média saudável para agências.',
    };
  }

  const StatusIcon = statusBadge.icon;

  // % de cobertura de custos
  const coveragePercent =
    totalCostsAndExpenses > 0
      ? Math.min(200, Math.round((revenue.mrrRecognized / totalCostsAndExpenses) * 100))
      : 100;

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-surface-card p-6 shadow-sm">
      {/* Header com Mês e Status */}
      <div>
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand/10 text-brand">
              <Calendar className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text-primary">
                Diagnóstico do Mês: {label}
              </h3>
              <p className="text-[11px] text-text-muted">
                Análise em tempo real de faturamento, despesas e margem líquida
              </p>
            </div>
          </div>

          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusBadge.color}`}
          >
            <StatusIcon className="h-3.5 w-3.5" />
            <span>{statusBadge.label}</span>
          </span>
        </div>

        {/* Bloco de Lucro Líquido e Margem */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-white/5 bg-surface-canvas p-3">
            <span className="text-[11px] font-medium text-text-muted">
              Lucro Líquido Real (Mês)
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span
                className={`text-lg font-black tracking-tight ${
                  isProfitable ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                R${' '}
                {netProfitCompetence.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <p className="text-[10px] text-text-muted mt-0.5">
              Receita (-) Custos (-) Despesas
            </p>
          </div>

          <div className="rounded-xl border border-white/5 bg-surface-canvas p-3">
            <span className="text-[11px] font-medium text-text-muted">
              Margem Líquida Real
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span
                className={`text-lg font-black tracking-tight ${
                  netMarginPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {netMarginPercent}%
              </span>
              {netMarginPercent >= 0 ? (
                <TrendingUp className="h-4 w-4 text-emerald-400" />
              ) : (
                <TrendingDown className="h-4 w-4 text-rose-400" />
              )}
            </div>
            <p className="text-[10px] text-text-muted mt-0.5 line-clamp-1">
              {statusBadge.desc}
            </p>
          </div>
        </div>

        {/* Barra de Ponto de Equilíbrio (Break-Even) */}
        <div className="mt-5 rounded-xl border border-white/5 bg-surface-canvas p-3.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-text-primary flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-brand" />
              Ponto de Equilíbrio (Break-Even)
            </span>
            <span className="font-bold text-text-primary">
              R$ {totalCostsAndExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div
              style={{ width: `${Math.min(100, coveragePercent)}%` }}
              className={`h-full rounded-full transition-all duration-500 ${
                coveragePercent >= 100 ? 'bg-emerald-400' : 'bg-rose-400'
              }`}
            />
          </div>

          <div className="mt-2 flex items-center justify-between text-[10px] text-text-muted">
            <span>
              {coveragePercent >= 100
                ? `Cobriu 100% dos custos (+${coveragePercent - 100}% de excedente)`
                : `Cobriu ${coveragePercent}% dos custos necessários`}
            </span>
            <span
              className={
                breakEvenDiff >= 0
                  ? 'font-medium text-emerald-400'
                  : 'font-medium text-rose-400'
              }
            >
              {breakEvenDiff >= 0
                ? `+ R$ ${breakEvenDiff.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} acima da meta`
                : `- R$ ${Math.abs(breakEvenDiff).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} para equilibrar`}
            </span>
          </div>
        </div>

        {/* Detalhamento Rápido de Saídas */}
        <div className="mt-4 grid grid-cols-3 gap-2 text-[11px] pt-3 border-t border-white/10">
          <div className="flex flex-col">
            <span className="text-text-muted flex items-center gap-1">
              <Users className="h-3 w-3 text-blue-400" />
              Equipe / PJ
            </span>
            <span className="font-semibold text-text-primary mt-0.5">
              R$ {expenses.team.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
            </span>
          </div>

          <div className="flex flex-col">
            <span className="text-text-muted flex items-center gap-1">
              <Cpu className="h-3 w-3 text-purple-400" />
              SaaS & Softwares
            </span>
            <span className="font-semibold text-text-primary mt-0.5">
              R$ {expenses.tools.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
            </span>
          </div>

          <div className="flex flex-col">
            <span className="text-text-muted flex items-center gap-1">
              <Megaphone className="h-3 w-3 text-amber-400" />
              Mídia Própria
            </span>
            <span className="font-semibold text-text-primary mt-0.5">
              R$ {expenses.marketing.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
            </span>
          </div>
        </div>
      </div>

      {/* Footer com Receita e Caixa */}
      <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-3 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-text-muted">Faturamento Reconhecido (MRR):</span>
          <span className="font-bold text-emerald-400">
            R$ {revenue.mrrRecognized.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className="text-[11px] text-text-muted">
          Caixa Real: R$ {revenue.cashInflow.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </div>
      </div>
    </div>
  );
}
