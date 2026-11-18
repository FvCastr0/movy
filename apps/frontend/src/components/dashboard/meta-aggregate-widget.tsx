import React from 'react';
import Link from 'next/link';
import { ArrowRight, BarChart3, MessageCircle, DollarSign, Target, Award, Users } from 'lucide-react';
import { DashboardOverview } from '@/types';

interface MetaAggregateWidgetProps {
  metaData: DashboardOverview['clientMetaAggregate'];
  period: 'month' | 'all_time';
  onPeriodChange: (p: 'month' | 'all_time') => void;
  isLoading?: boolean;
}

export function MetaAggregateWidget({
  metaData,
  period,
  onPeriodChange,
  isLoading = false,
}: MetaAggregateWidgetProps) {
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="rounded-2xl border border-white/10 bg-surface-card p-6 flex flex-col justify-between relative overflow-hidden">
      {isLoading && (
        <div className="absolute inset-0 bg-surface-card/60 backdrop-blur-xs flex items-center justify-center z-10 rounded-2xl">
          <div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-white/10">
          <div>
            <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
              <Users className="w-5 h-5 text-brand" />
              Tráfego Pago dos Clientes (Consolidado)
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              {period === 'all_time'
                ? `Total acumulado desde o início da parceria ${metaData.sinceDate ? `(${metaData.sinceDate})` : ''}`
                : 'Métricas ativas consolidadas do mês atual'}
            </p>
          </div>

          {/* Seletor Mês Atual vs Desde o Início */}
          <div className="flex items-center rounded-lg border border-white/10 bg-white/5 p-0.5 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => onPeriodChange('month')}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                period === 'month'
                  ? 'bg-brand text-white shadow-sm'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Mês Atual
            </button>
            <button
              type="button"
              onClick={() => onPeriodChange('all_time')}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                period === 'all_time'
                  ? 'bg-brand text-white shadow-sm'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Desde o Início
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-5">
          {/* Total Investido */}
          <div className="p-4 rounded-xl border border-white/5 bg-white/5 space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-brand" />
              {period === 'all_time' ? 'Investimento Acumulado' : 'Investimento Mês'}
            </span>
            <p className="text-xl font-bold text-brand">
              {formatCurrency(metaData.totalSpend)}
            </p>
            <p className="text-[10px] text-text-muted">
              {metaData.activeAdAccounts} contas de clientes ativas
            </p>
          </div>

          {/* Conversas Geradas */}
          <div className="p-4 rounded-xl border border-white/5 bg-white/5 space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
              <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
              {period === 'all_time' ? 'Total Conversas' : 'Conversas / Mês'}
            </span>
            <p className="text-xl font-bold text-emerald-400">
              {metaData.totalChats}
            </p>
            <p className="text-[10px] text-text-muted">
              Leads / Conversas no WhatsApp
            </p>
          </div>

          {/* Custo Médio por Chat (CPR) */}
          <div className="p-4 rounded-xl border border-white/5 bg-white/5 space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-blue-400" />
              CPR Médio
            </span>
            <p className="text-xl font-bold text-text-primary">
              {formatCurrency(metaData.averageCpr)}
            </p>
            <p className="text-[10px] text-text-muted">
              Custo médio por conversa
            </p>
          </div>

          {/* ROAS Médio */}
          <div className="p-4 rounded-xl border border-white/5 bg-white/5 space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-yellow-400" />
              ROAS Médio
            </span>
            <p className="text-xl font-bold text-yellow-400">
              {metaData.averageRoas > 0 ? `${metaData.averageRoas}x` : '—'}
            </p>
            <p className="text-[10px] text-text-muted">
              Retorno médio de campanhas
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-white/10 text-xs text-text-muted flex items-center justify-between">
        <Link
          href="/clients"
          className="inline-flex items-center gap-1.5 font-semibold text-brand hover:text-brand-hover transition-colors"
        >
          Ver Todas as Contas de Clientes
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
        <span className="text-emerald-400 font-medium">Contas Conectadas</span>
      </div>
    </div>
  );
}
