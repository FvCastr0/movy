'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { DashboardOverview, LeadPeriodDays, MonthlyClosingSummary } from '@/types';
import { DashboardKpiGrid } from '@/components/dashboard/dashboard-kpi-grid';
import { CommercialFunnelWidget } from '@/components/dashboard/commercial-funnel-widget';
import { LeadInflowChart } from '@/components/dashboard/lead-inflow-chart';
import { MetaAggregateWidget } from '@/components/dashboard/meta-aggregate-widget';
import { AgencyMetaWidget } from '@/components/dashboard/agency-meta-widget';
import { LatestWeeklyReportsWidget } from '@/components/dashboard/latest-weekly-reports-widget';
import { AlertsFeedWidget } from '@/components/dashboard/alerts-feed-widget';
import { MonthlyComparisonChart } from '@/components/finance/monthly-comparison-chart';
import { CurrentMonthFinanceCard } from '@/components/dashboard/current-month-finance-card';
import { RefreshCw, LayoutDashboard } from 'lucide-react';

export default function AdminDashboardPage() {
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [monthlyClosings, setMonthlyClosings] = useState<MonthlyClosingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingClosings, setLoadingClosings] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filtros interativos
  const [clientPeriod, setClientPeriod] = useState<'month' | 'all_time'>('month');
  const [leadDays, setLeadDays] = useState<LeadPeriodDays>(14);
  const [closingMonths, setClosingMonths] = useState<number>(6);
  const [isFiltering, setIsFiltering] = useState(false);

  const loadFinanceClosings = useCallback(async (months = closingMonths) => {
    try {
      setLoadingClosings(true);
      const res = await api.get<MonthlyClosingSummary>(`/finance/monthly-closings?months=${months}`);
      setMonthlyClosings(res.data);
    } catch (err) {
      console.error('Erro ao carregar dados do fechamento financeiro:', err);
    } finally {
      setLoadingClosings(false);
    }
  }, [closingMonths]);

  const loadOverview = useCallback(async (period = clientPeriod, days = leadDays, showSpinner = true) => {
    try {
      if (showSpinner) setIsFiltering(true);
      const res = await api.get<DashboardOverview>(`/dashboard/overview?clientPeriod=${period}&leadDays=${days}`);
      setOverview(res.data);
    } catch (err) {
      console.error('Erro ao carregar visão geral do dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setIsFiltering(false);
    }
  }, [clientPeriod, leadDays]);

  useEffect(() => {
    loadOverview(clientPeriod, leadDays, false);
    loadFinanceClosings(closingMonths);
  }, [clientPeriod, leadDays, closingMonths, loadOverview, loadFinanceClosings]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadOverview(clientPeriod, leadDays, true);
    loadFinanceClosings(closingMonths);
  };

  const handlePeriodChange = (newPeriod: 'month' | 'all_time') => {
    setClientPeriod(newPeriod);
  };

  const handleDaysChange = (newDays: LeadPeriodDays) => {
    setLeadDays(newDays);
  };

  const handleClosingMonthsChange = (newMonths: number) => {
    setClosingMonths(newMonths);
    loadFinanceClosings(newMonths);
  };

  const currentMonthStatement = monthlyClosings?.periods && monthlyClosings.periods.length > 0
    ? monthlyClosings.periods[monthlyClosings.periods.length - 1]
    : undefined;

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 space-y-8">
      {/* Top Hero Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <LayoutDashboard className="w-6 h-6 text-brand" />
              Painel Administrativo
            </h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Visão consolidada de finanças, pipeline comercial, operações e tráfego pago.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-8 h-8 mx-auto border-2 border-brand border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-text-muted font-medium">Carregando métricas consolidadas...</p>
        </div>
      ) : overview ? (
        <>
          {/* Bloco 1: KPIs Principais do Negócio */}
          <DashboardKpiGrid overview={overview} />

          {/* Bloco 2: Executivo Financeiro (Gráfico Comparativo MoM + Diagnóstico Individual do Mês) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <MonthlyComparisonChart
                data={monthlyClosings}
                periodMonths={closingMonths}
                onPeriodChange={handleClosingMonthsChange}
                isLoading={loadingClosings}
              />
            </div>
            <div className="lg:col-span-1">
              <CurrentMonthFinanceCard
                statement={currentMonthStatement}
                isLoading={loadingClosings}
              />
            </div>
          </div>

          {/* Bloco 3: Comercial (Pipeline por Estágios + Ritmo de Chegada de Leads) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CommercialFunnelWidget
              leadsByStage={overview.commercial.leadsByStage}
              totalLeads={overview.commercial.totalLeads}
              conversionRate={overview.commercial.conversionRate}
              bookingRate={overview.commercial.bookingRate}
              noShowRate={overview.commercial.noShowRate}
            />
            <LeadInflowChart
              inflow={overview.commercial.leadInflow}
              inflowTotal={overview.commercial.inflowTotal}
              inflowAverageDaily={overview.commercial.inflowAverageDaily}
              peakDay={overview.commercial.peakDay}
              selectedDays={leadDays}
              onDaysChange={handleDaysChange}
              isLoading={isFiltering}
            />
          </div>

          {/* Bloco 3: Tráfego Pago (Clientes All-Time vs Agência MOVY Própria) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <MetaAggregateWidget
              metaData={overview.clientMetaAggregate}
              period={clientPeriod}
              onPeriodChange={handlePeriodChange}
              isLoading={isFiltering}
            />
            <AgencyMetaWidget agencyData={overview.agencyMeta} />
          </div>

          {/* Bloco 4: Últimos Relatórios Semanais de Performance Emitidos */}
          <LatestWeeklyReportsWidget reports={overview.latestWeeklyReports} />

          {/* Bloco 5: Central de Alertas & Riscos Operacionais */}
          <AlertsFeedWidget alerts={overview.recentAlerts} />
        </>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-surface-card p-12 text-center space-y-3">
          <p className="text-sm font-bold text-text-primary">Não foi possível carregar a visão geral.</p>
          <p className="text-xs text-text-muted">Verifique a conexão com o servidor na porta 3001.</p>
          <button
            type="button"
            onClick={handleRefresh}
            className="px-4 py-2 bg-brand text-white rounded-xl text-xs font-bold hover:bg-brand-hover transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      )}
    </main>
  );
}
