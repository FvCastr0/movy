'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { Client, Contract, FinanceMetrics, PaymentStatus } from '@/types';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import { FinanceKpiCards } from '@/components/finance/finance-kpi-cards';
import { BillingTable } from '@/components/finance/billing-table';
import { ContractModal } from '@/components/finance/contract-modal';
import {
  RefreshCw,
  Search,
  AlertCircle,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';

interface BillingRowData {
  client: Client;
  contract: Contract | null;
}

export default function FinanceDashboardPage() {
  const [metrics, setMetrics] = useState<FinanceMetrics | null>(null);
  const [items, setItems] = useState<BillingRowData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filtros
  const [statusFilter, setStatusFilter] = useState<'ALL' | PaymentStatus | 'RISK'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal de Contrato
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const fetchData = useCallback(
    async (isSilent = false) => {
      if (!isSilent) setIsLoading(true);
      setIsRefreshing(true);
      setErrorMessage(null);

      try {
        const queryParams = new URLSearchParams();
        if (statusFilter !== 'ALL' && statusFilter !== 'RISK') {
          queryParams.append('paymentStatus', statusFilter);
        }
        if (searchQuery.trim()) {
          queryParams.append('search', searchQuery.trim());
        }

        const [metricsRes, contractsRes] = await Promise.all([
          api.get<FinanceMetrics>('/finance/metrics'),
          api.get<BillingRowData[]>(`/finance/contracts?${queryParams.toString()}`),
        ]);

        setMetrics(metricsRes.data);

        // Se o filtro for 'RISK', filtra apenas clientes com isAtRisk = true
        if (statusFilter === 'RISK') {
          setItems(contractsRes.data.filter((item) => item.contract?.isAtRisk));
        } else {
          setItems(contractsRes.data);
        }
      } catch (err: any) {
        setErrorMessage(
          err.response?.data?.message || 'Falha ao sincronizar dados financeiros com o servidor.'
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [statusFilter, searchQuery]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpdatePaymentStatus = async (clientId: string, newStatus: PaymentStatus) => {
    // Atualização otimista
    setItems((prev) =>
      prev.map((item) =>
        item.client.id === clientId
          ? {
              ...item,
              contract: item.contract
                ? {
                    ...item.contract,
                    paymentStatus: newStatus,
                    isAtRisk: newStatus === 'EM_DIA' ? false : item.contract.isAtRisk,
                  }
                : null,
            }
          : item
      )
    );

    try {
      await api.patch(`/finance/clients/${clientId}/payment-status`, {
        paymentStatus: newStatus,
      });
      // Atualiza métricas em background
      api.get<FinanceMetrics>('/finance/metrics').then((res) => setMetrics(res.data)).catch(() => null);
    } catch (err: any) {
      alert('Falha ao atualizar status de pagamento no servidor.');
      fetchData(true);
    }
  };

  const handleOpenEditContract = (client: Client) => {
    setSelectedClient(client);
    setIsContractModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-surface-canvas">
      <DashboardHeader onRefresh={() => fetchData(true)} isRefreshing={isRefreshing} />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {/* Banner de Título & Ações */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-text-primary">
                Saúde Financeira & Gestão de Contratos
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
                <Sparkles className="h-3 w-3" />
                V1 Ativa
              </span>
            </div>
            <p className="mt-0.5 text-xs text-text-muted">
              Controle de MRR Contábil, faturamento de caixa, dias em atraso e semáforo preventivo de tráfego
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => fetchData(true)}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-surface-card px-3 py-2 text-xs font-semibold text-text-muted hover:bg-white/5 hover:text-text-primary transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Atualizar</span>
            </button>
          </div>
        </div>

        {/* Cards de KPIs Financeiros */}
        <div className="mb-6">
          <FinanceKpiCards metrics={metrics} isLoading={isLoading} />
        </div>

        {/* Filtros e Busca */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-white/10 bg-surface-card p-3">
          {/* Tabs de Status */}
          <div className="flex flex-wrap items-center rounded-lg border border-white/10 bg-surface-canvas p-1">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                statusFilter === 'ALL'
                  ? 'bg-white/10 text-text-primary shadow-sm'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Todos ({items.length})
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('EM_DIA')}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                statusFilter === 'EM_DIA'
                  ? 'bg-emerald-500/20 text-emerald-400 shadow-sm border border-emerald-500/30'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Em Dia
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('PENDENTE')}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                statusFilter === 'PENDENTE'
                  ? 'bg-amber-500/20 text-amber-400 shadow-sm border border-amber-500/30'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Pendente
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('INADIMPLENTE')}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                statusFilter === 'INADIMPLENTE'
                  ? 'bg-rose-500/20 text-rose-400 shadow-sm border border-rose-500/30'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Inadimplente
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('RISK')}
              className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                statusFilter === 'RISK'
                  ? 'bg-rose-500/30 text-rose-300 shadow-sm border border-rose-500/50'
                  : 'text-rose-400/80 hover:text-rose-400'
              }`}
            >
              <ShieldAlert className="h-3 w-3" />
              <span>Em Risco (&gt;5 dias)</span>
            </button>
          </div>

          {/* Campo de Busca Rápida */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por delivery, cliente, cidade..."
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

        {/* Tabela de Cobrança */}
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
              <p className="text-xs font-medium text-text-muted">Carregando carteira de contratos...</p>
            </div>
          </div>
        ) : (
          <BillingTable
            items={items}
            onUpdatePaymentStatus={handleUpdatePaymentStatus}
            onEditContract={handleOpenEditContract}
          />
        )}
      </main>

      {/* Modal de Contrato */}
      <ContractModal
        isOpen={isContractModalOpen}
        client={selectedClient}
        onClose={() => {
          setIsContractModalOpen(false);
          setSelectedClient(null);
        }}
        onSuccess={() => fetchData(true)}
      />
    </div>
  );
}
