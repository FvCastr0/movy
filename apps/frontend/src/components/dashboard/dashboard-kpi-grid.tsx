'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Users, Briefcase, TrendingUp } from 'lucide-react';
import { DashboardOverview } from '@/types';

interface DashboardKpiGridProps {
  overview: DashboardOverview;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 350,
      damping: 28,
    },
  },
};

export function DashboardKpiGrid({ overview }: DashboardKpiGridProps) {
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
    >
      {/* 1. MRR Total */}
      <motion.div
        variants={itemVariants}
        className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-zinc-950/70 p-5 backdrop-blur-md transition-all duration-300 hover:border-white/20 hover:shadow-card-glow"
      >
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent" />
        <div className="flex items-center justify-between pb-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            Receita Mensal (MRR)
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand/10 text-brand border border-brand/20">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>
        <div className="space-y-1.5">
          <h3 className="text-2xl font-bold tracking-tight text-white tabular-nums">
            {formatCurrency(overview.financial.totalMrr)}
          </h3>
          <p className="text-xs text-zinc-400 flex items-center gap-1.5 flex-wrap">
            <span className="text-emerald-400 font-semibold">{overview.financial.activeContracts}</span> contratos
            <span className="text-zinc-600">•</span>
            Ticket médio: <span className="text-zinc-200 font-medium tabular-nums">{formatCurrency(overview.financial.averageTicket)}</span>
          </p>
        </div>
      </motion.div>

      {/* 2. Pipeline Comercial */}
      <motion.div
        variants={itemVariants}
        className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-zinc-950/70 p-5 backdrop-blur-md transition-all duration-300 hover:border-white/20 hover:shadow-card-glow"
      >
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-blue-400/20 to-transparent" />
        <div className="flex items-center justify-between pb-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            Pipeline em Negociação
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Briefcase className="w-4 h-4" />
          </div>
        </div>
        <div className="space-y-1.5">
          <h3 className="text-2xl font-bold tracking-tight text-white tabular-nums">
            {formatCurrency(overview.commercial.pipelineValue)}
          </h3>
          <p className="text-xs text-zinc-400 flex items-center gap-1.5 flex-wrap">
            <span className="text-blue-400 font-semibold">{overview.commercial.totalLeads}</span> leads no funil
            <span className="text-zinc-600">•</span>
            Conversão: <span className="text-emerald-400 font-semibold tabular-nums">{overview.commercial.conversionRate}%</span>
          </p>
        </div>
      </motion.div>

      {/* 3. Clientes Ativos na Operação */}
      <motion.div
        variants={itemVariants}
        className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-zinc-950/70 p-5 backdrop-blur-md transition-all duration-300 hover:border-white/20 hover:shadow-card-glow"
      >
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-400/20 to-transparent" />
        <div className="flex items-center justify-between pb-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            Deliveries Ativos
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Users className="w-4 h-4" />
          </div>
        </div>
        <div className="space-y-1.5">
          <h3 className="text-2xl font-bold tracking-tight text-white tabular-nums">
            {overview.operations.activeClients}
          </h3>
          <p className="text-xs text-zinc-400 flex items-center gap-1.5 flex-wrap">
            <span className="text-amber-400 font-semibold">{overview.operations.pausedClients}</span> pausados
            <span className="text-zinc-600">•</span>
            {overview.operations.pendingWeeklyReports > 0 ? (
              <span className="text-rose-400 font-semibold">{overview.operations.pendingWeeklyReports} relatórios pendentes</span>
            ) : (
              <span className="text-emerald-400">Relatórios em dia</span>
            )}
          </p>
        </div>
      </motion.div>

      {/* 4. Investimento Meta Ads Clientes */}
      <motion.div
        variants={itemVariants}
        className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-zinc-950/70 p-5 backdrop-blur-md transition-all duration-300 hover:border-white/20 hover:shadow-card-glow"
      >
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-orange-400/20 to-transparent" />
        <div className="flex items-center justify-between pb-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            Meta Ads ({overview.clientMetaAggregate.period === 'all_time' ? 'Acumulado' : 'Mês'})
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
        <div className="space-y-1.5">
          <h3 className="text-2xl font-bold tracking-tight text-white tabular-nums">
            {formatCurrency(overview.clientMetaAggregate.totalSpend)}
          </h3>
          <p className="text-xs text-zinc-400 flex items-center gap-1.5 flex-wrap">
            <span className="text-zinc-200 font-semibold">{overview.clientMetaAggregate.totalChats}</span> conversas
            <span className="text-zinc-600">•</span>
            ROAS Médio: <span className="text-amber-400 font-semibold tabular-nums">{overview.clientMetaAggregate.averageRoas}x</span>
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
